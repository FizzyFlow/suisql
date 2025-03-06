module suisql::suisql {
    const VERSION: u64 = 4;

    public struct SuiSqlBank has store, key {
        id: UID,
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
        };
        transfer::share_object(bank);
    }

    public entry fun db(ctx: &mut TxContext) {
        let db = SuiSqlDb {
            id: object::new(ctx),
            owner: ctx.sender(),
            name: std::ascii::string(b""),
            walrus: std::ascii::string(b""),
            patches: vector::empty(),
        };
        transfer::transfer(db, ctx.sender());
    }

    public entry fun patch(db: &mut SuiSqlDb, patch: vector<u8>, ctx: &mut TxContext) {
        vector::push_back(&mut db.patches, patch);
    }

    public entry fun walrus(db: &mut SuiSqlDb, walrus: vector<u8>, ctx: &mut TxContext) {
        db.patches = vector::empty();
        db.walrus = std::ascii::string(walrus);
    }

}