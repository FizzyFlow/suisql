"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var SuiSql_exports = {};
__export(SuiSql_exports, {
  default: () => SuiSql
});
module.exports = __toCommonJS(SuiSql_exports);
var import_SuiSqlStatement = __toESM(require("./SuiSqlStatement"));
var import_SuiSqlSync = __toESM(require("./SuiSqlSync"));
var import_SuiSqlField = __toESM(require("./SuiSqlField"));
var import_SuiSqlLibrarian = __toESM(require("./SuiSqlLibrarian"));
var import_SuiSqliteBinaryView = __toESM(require("./SuiSqliteBinaryView"));
var import_SuiSqlLog = __toESM(require("./SuiSqlLog"));
var State = /* @__PURE__ */ ((State2) => {
  State2["INITIALIZING"] = "INITIALIZING";
  State2["EMPTY"] = "EMPTY";
  State2["ERROR"] = "ERROR";
  State2["OK"] = "OK";
  return State2;
})(State || {});
;
class SuiSql {
  constructor(params) {
    __publicField(this, "id");
    __publicField(this, "name");
    __publicField(this, "suiClient");
    __publicField(this, "sync");
    __publicField(this, "state", "INITIALIZING" /* INITIALIZING */);
    __publicField(this, "statements", []);
    __publicField(this, "_db", null);
    // private _SQL: initSqlJs.SqlJsStatic | null = null;
    __publicField(this, "librarian", new import_SuiSqlLibrarian.default());
    __publicField(this, "__initializationPromise", null);
    __publicField(this, "paramsCopy");
    __publicField(this, "mostRecentWriteChangeTime");
    // time at which the most recent write operation was done
    __publicField(this, "binaryView");
    __publicField(this, "initialBinaryView");
    this.paramsCopy = { ...params };
    if (params.debug !== void 0) {
      import_SuiSqlLog.default.switch(params.debug);
    }
    if (params.id && params.name) {
      throw new Error("either id or name can be provided, not both");
    }
    if (params.id) {
      this.id = params.id;
    }
    if (params.name) {
      this.name = params.name;
    }
    if (params.suiClient) {
      this.suiClient = params.suiClient;
      if (this.id || this.name) {
        this.sync = new import_SuiSqlSync.default({
          id: this.id,
          name: this.name,
          suiClient: this.suiClient,
          signer: params.signer,
          signAndExecuteTransaction: params.signAndExecuteTransaction,
          currentWalletAddress: params.currentWalletAddress,
          suiSql: this,
          network: params.network,
          walrusClient: params.walrusClient
        });
      }
    }
  }
  getBinaryView() {
    if (!this.binaryView || this.binaryView && this.mostRecentWriteChangeTime && (!this.binaryView.createdAt || this.binaryView.createdAt < this.mostRecentWriteChangeTime)) {
      const data = this.export();
      if (data) {
        this.binaryView = new import_SuiSqliteBinaryView.default({
          binary: data
        });
      }
    }
    if (this.binaryView) {
      return this.binaryView;
    }
    return null;
  }
  async getBinaryPatch() {
    const currentBinaryView = this.getBinaryView();
    if (this.initialBinaryView && currentBinaryView) {
      const binaryPatch = await currentBinaryView.getBinaryPatch(this.initialBinaryView);
      return binaryPatch;
    }
    return null;
  }
  async getExpectedBlobId() {
    const data = this.export();
    if (data && this.sync && this.sync.walrus) {
      return await this.sync.walrus.calculateBlobId(data);
    }
    return null;
  }
  async applyBinaryPatch(binaryPatch) {
    const currentBinaryView = this.getBinaryView();
    if (!currentBinaryView) {
      return false;
    }
    const patched = await currentBinaryView.getPatched(binaryPatch);
    this.replace(patched);
    return true;
  }
  async database(idOrName) {
    const paramsCopy = { ...this.paramsCopy };
    if (idOrName.startsWith("0x")) {
      paramsCopy.id = idOrName;
      delete paramsCopy.name;
    } else {
      paramsCopy.name = idOrName;
      delete paramsCopy.id;
    }
    const db = new SuiSql(paramsCopy);
    await db.initialize();
    return db;
  }
  get db() {
    return this._db;
  }
  get writeExecutions() {
    const ret = [];
    for (const stmt of this.statements) {
      ret.push(...stmt.writeExecutions);
    }
    return ret;
  }
  replace(data) {
    if (this.librarian.isReady) {
      this.binaryView = void 0;
      this.initialBinaryView = new import_SuiSqliteBinaryView.default({
        binary: data
      });
      ;
      this._db = this.librarian.fromBinarySync(data);
      this.mostRecentWriteChangeTime = Date.now();
      return true;
    }
    return false;
  }
  async initialize() {
    if (this.__initializationPromise) {
      return await this.__initializationPromise;
    }
    let __initializationPromiseResolver = () => {
    };
    this.__initializationPromise = new Promise((resolve) => {
      __initializationPromiseResolver = resolve;
    });
    import_SuiSqlLog.default.log("initializing SuiSql database...", this.paramsCopy);
    try {
      this.state = "EMPTY" /* EMPTY */;
      this._db = await this.librarian.fromBinary();
      try {
        if (this.sync) {
          await this.sync.syncFromBlockchain();
          this.id = this.sync.id;
          if (!this.id) {
            import_SuiSqlLog.default.log("error initilizing");
            this.state = "ERROR" /* ERROR */;
          } else {
            import_SuiSqlLog.default.log("db id", this.id);
            this.mostRecentWriteChangeTime = Date.now();
            if (this.sync.hasBeenCreated) {
              import_SuiSqlLog.default.log("database is freshly created");
              this.state = "EMPTY" /* EMPTY */;
            } else {
              this.state = "OK" /* OK */;
            }
            const data = this.export();
            if (data) {
              this.initialBinaryView = new import_SuiSqliteBinaryView.default({
                binary: data
              });
            }
          }
        }
      } catch (e) {
        import_SuiSqlLog.default.log("error", e);
        this.state = "ERROR" /* ERROR */;
      }
    } catch (e) {
      import_SuiSqlLog.default.log("error", e);
      this.state = "ERROR" /* ERROR */;
    }
    __initializationPromiseResolver(this.state);
    return this.state;
  }
  markAsOk() {
    this.state = "OK" /* OK */;
  }
  /**
   * Execute an SQL query, ignoring the rows it returns.
   */
  async run(sql, params) {
    import_SuiSqlLog.default.log("run", sql, params);
    await this.initialize();
    const suiSqlStatement = new import_SuiSqlStatement.default({
      suiSql: this,
      sql
    });
    this.statements.push(suiSqlStatement);
    if (params != null) {
      suiSqlStatement.bind(params);
    }
    suiSqlStatement.run();
    return true;
  }
  /**
   * Prepare an SQL statement
   * 
   * @param {string} sql a string of SQL, that can contain placeholders (?, :VVV, :AAA, @AAA)
   * @param {array|object} params values to bind to placeholders
   */
  async prepare(sql, params) {
    import_SuiSqlLog.default.log("prepare", sql, params);
    await this.initialize();
    const suiSqlStatement = new import_SuiSqlStatement.default({
      suiSql: this,
      sql
    });
    if (params != null) {
      suiSqlStatement.bind(params);
    }
    this.statements.push(suiSqlStatement);
    return suiSqlStatement;
  }
  /**
   * Prepare an SQL statement and return all available results immediately
   * 
   * @param {string} sql a string of SQL, that can contain placeholders (?, :VVV, :AAA, @AAA)
   * @param {array|object} params values to bind to placeholders
   */
  async query(sql, params) {
    import_SuiSqlLog.default.log("query", sql, params);
    await this.initialize();
    const prepared = await this.prepare(sql, params);
    const ret = [];
    while (prepared.step()) {
      ret.push(prepared.getAsObject());
    }
    import_SuiSqlLog.default.log("query results", ret);
    return ret;
  }
  /**
   * Run an sql text containing many sql queries, one by one, ignoring return data. Returns the count of processed queries.
   */
  async iterateStatements(sql) {
    import_SuiSqlLog.default.log("iterateStatements", sql);
    await this.initialize();
    if (!this.db) {
      return 0;
    }
    let count = 0;
    for (let statement of this.db.iterateStatements(sql)) {
      const suiSqlStatement = new import_SuiSqlStatement.default({
        suiSql: this,
        statement
      });
      suiSqlStatement.step();
      this.statements.push(suiSqlStatement);
      count = count + 1;
    }
    return count;
  }
  async listTables() {
    import_SuiSqlLog.default.log("listTables");
    await this.initialize();
    const tables = [];
    const q = await this.prepare("SELECT name FROM sqlite_master WHERE type='table';");
    while (q.step()) {
      const row = q.getAsObject();
      if (row) {
        tables.push(row.name);
      }
    }
    q.free();
    import_SuiSqlLog.default.log("listTables results", tables);
    return tables;
  }
  async describeTable(tableName) {
    import_SuiSqlLog.default.log("describeTable", tableName);
    await this.initialize();
    const fields = [];
    try {
      const q = await this.prepare("select * from pragma_table_info(?) as tblInfo;", [tableName]);
      await q.forEach((row) => {
        fields.push(new import_SuiSqlField.default({
          suiSql: this,
          name: row.name,
          type: row.type,
          notnull: row.notnull,
          dfltValue: row.dflt_value,
          pk: row.pk,
          cid: row.cid
        }));
      });
      q.free();
    } catch (e) {
      console.error(e);
    }
    import_SuiSqlLog.default.log("describeTable results", fields);
    return fields;
  }
  /**
   * Export the database as SqlLite binary representation
   */
  export() {
    if (this.db) {
      return this.db.export();
    }
    return null;
  }
}
//# sourceMappingURL=SuiSql.js.map
