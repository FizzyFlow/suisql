module suisql::suisql {
    const VERSION: u64 = 4;

    use suisql::events;

    const EAlreadyExists: u64 = 1;

    public struct SuiSqlBank has store, key {
        id: UID,
        map: sui::table::Table<std::ascii::String, address>,
    }

    public struct SuiSqlDb has store, key {
        id: UID,
        owner: address,
        name: std::ascii::String,
        walrus: std::ascii::String,
        patches: vector<vector<u8>>,
    }

    public struct SUISQL has drop {}

    fun init(witness: SUISQL, ctx: &mut TxContext) {
        let bank = SuiSqlBank { 
            id: object::new(ctx),
            map: sui::table::new(ctx),
        };
        events::emit_new_bank_event(&object::id(&bank));
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
            walrus: std::ascii::string(b""),
            patches: vector::empty(),
        };
        events::emit_new_db_event(&object::id(&db), name);

        sui::table::add(&mut bank.map, name, object::id_to_address(&object::id(&db)) );

        transfer::transfer(db, ctx.sender());
    }

    public entry fun find_db_by_name(bank: &SuiSqlBank, name: std::ascii::String, ctx: &mut TxContext) {
        if (sui::table::contains(&bank.map, name)) {
            let addr = sui::table::borrow(&bank.map, name);
            events::emit_remind_db_event(*addr, name);
        }
    }

    public entry fun patch(db: &mut SuiSqlDb, patch: vector<u8>, ctx: &mut TxContext) {
        vector::push_back(&mut db.patches, patch);
    }

    public entry fun clamp_with_walrus(db: &mut SuiSqlDb, walrus: std::ascii::String, ctx: &mut TxContext) {
        db.patches = vector::empty();
        db.walrus = walrus;
    }

}