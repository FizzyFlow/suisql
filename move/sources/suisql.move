module suisql::suisql {
    const VERSION: u64 = 4;

    use suisql::suisql_events;
    use walrus::system;
    use walrus::blob;
    use walrus::shared_blob;
    use walrus::storage_resource;
    use sui::coin::{Coin};
    use wal::wal::{WAL};

    const EAlreadyExists: u64 = 1;
    const EInvalidWriteCap: u64 = 2;
    const EInvalidWalrusBlob: u64 = 3;
    const EInvalidWalrusBlobExpiration: u64 = 4;

    public struct SuiSqlBank has store, key {
        id: UID,
        map: sui::table::Table<std::ascii::String, address>,
    }

    public struct SuiSqlDb has store, key {
        id: UID,
        owner: address,
        name: std::ascii::String,
        patches: vector<vector<u8>>,

        walrus_blob_id: Option<u256>, 
        walrus_blob: Option<blob::Blob>,
        expected_walrus_blob_id: Option<u256>,
    }
    public struct WriteCap has store, key {
        id: UID,
        sui_sql_db_id: ID,
    }

    public struct SUISQL has drop {}

    fun init(witness: SUISQL, ctx: &mut TxContext) {
        let bank = SuiSqlBank { 
            id: object::new(ctx),
            map: sui::table::new(ctx),
        };
        suisql_events::emit_new_bank_event(&object::id(&bank));
        transfer::share_object(bank);
    }

    public entry fun db(bank: &mut SuiSqlBank, name: std::ascii::String, ctx: &mut TxContext) {
        if (sui::table::contains(&bank.map, name)) {
            abort EAlreadyExists
        };

        let db = SuiSqlDb {
            id: object::new(ctx),
            owner: ctx.sender(),
            name: name,

            patches: vector::empty(),

            walrus_blob_id: option::none(),
            walrus_blob: option::none(),
            expected_walrus_blob_id: option::none(),
        };

        let write_cap = WriteCap {
            id: object::new(ctx),
            sui_sql_db_id: object::id(&db),
        };

        suisql_events::emit_new_db_event(&object::id(&db), name, &object::id(&write_cap));

        sui::table::add(&mut bank.map, name, object::id_to_address(&object::id(&db)) );

        transfer::transfer(write_cap, ctx.sender());
        transfer::share_object(db);
    }

    public fun find_db_by_name(bank: &SuiSqlBank, name: std::ascii::String) {
        if (sui::table::contains(&bank.map, name)) {
            let addr = sui::table::borrow(&bank.map, name);
            suisql_events::emit_remind_db_event(*addr, name);
        }
    }

    public fun walrus_end_epoch(db: &SuiSqlDb): u32 {
        if (option::is_none(&db.walrus_blob_id)) {
            return 0
        };
        return blob::end_epoch(option::borrow(&db.walrus_blob))
    }

    public entry fun patch(db: &mut SuiSqlDb, write_cap: &WriteCap, patch: vector<u8>, ctx: &mut TxContext) {
        assert_write_cap(db, write_cap);

        vector::push_back(&mut db.patches, patch);
        db.expected_walrus_blob_id = option::none();
    }

    public entry fun patch_and_expect_walrus(db: &mut SuiSqlDb, write_cap: &WriteCap, patch: vector<u8>, walrus_blob_id: u256, ctx: &mut TxContext) {
        assert_write_cap(db, write_cap);

        vector::push_back(&mut db.patches, patch);
        db.expected_walrus_blob_id = option::some(walrus_blob_id);
    }

    public entry fun expect_walrus(db: &mut SuiSqlDb, write_cap: &WriteCap, walrus_blob_id: u256, ctx: &mut TxContext) {
        assert_write_cap(db, write_cap);
        db.expected_walrus_blob_id = option::some(walrus_blob_id);
    }

    public entry fun extend_walrus(db: &mut SuiSqlDb,  walrus_system_ref: &mut system::System, extended_epochs: u32, payment: &mut Coin<WAL>) {
        if (option::is_none(&db.walrus_blob)) {
            abort EInvalidWalrusBlob
        };

        system::extend_blob(
            walrus_system_ref,
            option::borrow_mut(&mut db.walrus_blob),
            extended_epochs,
            payment
        );
    }
    

    fun register_walrus_blob_reusing_storage(db: &mut SuiSqlDb, walrus_system_ref: &mut system::System, 
        blob_id: u256,
        root_hash: u256,
        // size expecting to be the same?
        // encoding_type expecting to be the same
        write_payment: &mut Coin<WAL>,
        ctx: &mut TxContext): blob::Blob {
            let old_blob = option::extract(&mut db.walrus_blob);
            let encoding_type = blob::encoding_type(&old_blob);
            let storage = system::delete_blob(walrus_system_ref, old_blob);
            let size = storage_resource::size(&storage);

            let blob = system::register_blob(
                walrus_system_ref,
                storage,
                blob_id,
                root_hash,
                size,
                encoding_type,
                true, // deletable
                write_payment,
                ctx
            );

            blob
        }

// public fun register_blob(
//     self: &mut System,
//     storage: Storage,
//     blob_id: u256,
//     root_hash: u256,
//     size: u64,
//     encoding_type: u8,
//     deletable: bool,
//     write_payment: &mut Coin<WAL>,
//     ctx: &mut TxContext,
// ): Blob {

    public entry fun clamp_with_walrus(db: &mut SuiSqlDb, write_cap: &WriteCap, walrus_system_ref: &system::System, walrus_blob: blob::Blob, ctx: &mut TxContext) {
        assert_write_cap(db, write_cap);

        replace_walrus_blob(db, walrus_system_ref, walrus_blob, ctx);
    }

    public entry fun fill_expected_walrus(db: &mut SuiSqlDb, walrus_system_ref: &system::System, walrus_blob: blob::Blob, ctx: &mut TxContext) {
        if (option::is_none(&db.expected_walrus_blob_id)) {
            abort EInvalidWalrusBlob
        };
        if (option::get_with_default(&db.expected_walrus_blob_id, 0) != blob::blob_id(&walrus_blob)) {
            abort EInvalidWalrusBlob
        };

        assert_walrus_blob(&walrus_blob, walrus_system_ref);

        replace_walrus_blob(db, walrus_system_ref, walrus_blob, ctx);
    }

    fun replace_walrus_blob(db: &mut SuiSqlDb, walrus_system_ref: &system::System, walrus_blob: blob::Blob, ctx: &mut TxContext) {
        assert_walrus_blob(&walrus_blob, walrus_system_ref);

        db.walrus_blob_id = option::some(blob::blob_id(&walrus_blob));

        // if (option::is_some(&db.walrus_blob)) {
        //     let old_blob = option::swap(&mut db.walrus_blob, walrus_blob);
        //     shared_blob::new(old_blob, ctx); // share the old blob
        // } else {
        //     option::fill(&mut db.walrus_blob, walrus_blob);
        // };

        attach_walrus_blob_reusing_storage(db, walrus_system_ref, walrus_blob, ctx);

        db.patches = vector::empty();
        db.expected_walrus_blob_id = option::none();
    }

    fun assert_write_cap(db: &SuiSqlDb, write_cap: &WriteCap) {
        if (write_cap.sui_sql_db_id != object::id(db)) {
            abort EInvalidWriteCap
        };
    }

    fun assert_walrus_blob(walrus_blob_ref: &blob::Blob, walrus_system_ref: &system::System) {
        // check that blob is certified and not expired
        let blob_certified_epoch = blob::certified_epoch(walrus_blob_ref);
        if (!blob_certified_epoch.is_some()) {
            abort EInvalidWalrusBlob
        };
        let current_epoch = system::epoch(walrus_system_ref);
        // let certified_epoch = option::get_with_default(&blob_certified_epoch, 0);
        let end_epoch = blob::end_epoch(walrus_blob_ref);

        if (end_epoch <= (current_epoch)) {
            abort EInvalidWalrusBlobExpiration
        };
    }

    fun can_extend_walrus_blob(db: &SuiSqlDb, walrus_system_ref: & system::System, walrus_blob_ref: &blob::Blob): bool {
        if (option::is_none(&db.walrus_blob)) {
            return false
        };
        let cur_blob_ref = option::borrow(&db.walrus_blob);
        if (blob::certified_epoch(cur_blob_ref).is_none() || !blob::is_deletable(cur_blob_ref)) {
            // current blob is not certified or not deletable. How did it get here?
             return false
        };

        let current_epoch = system::epoch(walrus_system_ref);
        let end_epoch = blob::end_epoch(cur_blob_ref);

        if (current_epoch >= end_epoch) {
            // current blob is expired
            return false
        };

        let new_blob_end_epoch = blob::end_epoch(walrus_blob_ref);
        if (new_blob_end_epoch >= end_epoch) {
            // old one doesn't have more storage
            return false
        };

        if (storage_resource::size(blob::storage(cur_blob_ref)) != storage_resource::size(blob::storage(walrus_blob_ref))) {
            // sizes don't match. In theory we can re-use larger storage, but as per our design, we are not expecting it to decrease
            return false
        };

        true
    }

    fun attach_walrus_blob_reusing_storage(db: &mut SuiSqlDb, walrus_system_ref: &system::System, 
        mut new_blob: blob::Blob, ctx: &mut TxContext) {
        
        if (can_extend_walrus_blob(db, walrus_system_ref, &new_blob)) {
            let old_blob = option::extract(&mut db.walrus_blob);
            let mut storage = system::delete_blob(walrus_system_ref, old_blob);
            let new_blob_end_epoch = blob::end_epoch(&new_blob);
            let extension_storage = storage_resource::split_by_epoch(&mut storage, new_blob_end_epoch, ctx);
            system::extend_blob_with_resource(walrus_system_ref, &mut new_blob, extension_storage);
            option::fill(&mut db.walrus_blob, new_blob);
            storage_resource::destroy(storage); // old storage, may have something still?
        } else {
            if (option::is_some(&db.walrus_blob)) {
                let old_blob = option::swap(&mut db.walrus_blob, new_blob);
                shared_blob::new(old_blob, ctx); // share the old blob ( or better burn it? )
            } else {
                option::fill(&mut db.walrus_blob, new_blob);
            };
        };
    }
}