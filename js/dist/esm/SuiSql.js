var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import SuiSqlStatement from "./SuiSqlStatement";
import SuiSqlSync from "./SuiSqlSync";
import SuiSqlField from "./SuiSqlField";
import SuiSqlLibrarian from "./SuiSqlLibrarian";
import SuiSqliteBinaryView from "./SuiSqliteBinaryView";
import SuiSqlLog from "./SuiSqlLog";
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
    __publicField(this, "suiSqlSync");
    __publicField(this, "state", "INITIALIZING" /* INITIALIZING */);
    __publicField(this, "statements", []);
    __publicField(this, "_db", null);
    // private _SQL: initSqlJs.SqlJsStatic | null = null;
    __publicField(this, "librarian", new SuiSqlLibrarian());
    __publicField(this, "__initializationPromise", null);
    __publicField(this, "paramsCopy");
    __publicField(this, "mostRecentWriteChangeTime");
    // time at which the most recent write operation was done
    __publicField(this, "binaryView");
    __publicField(this, "initialBinaryView");
    this.paramsCopy = { ...params };
    if (params.debug !== void 0) {
      SuiSqlLog.switch(params.debug);
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
        this.suiSqlSync = new SuiSqlSync({
          suiSql: this,
          id: this.id,
          name: this.name,
          suiClient: this.suiClient,
          signer: params.signer,
          signAndExecuteTransaction: params.signAndExecuteTransaction,
          currentWalletAddress: params.currentWalletAddress,
          network: params.network,
          walrusClient: params.walrusClient,
          publisherUrl: params.publisherUrl,
          aggregatorUrl: params.aggregatorUrl
        });
      }
    } else {
      throw new Error("SuiClient is required");
    }
  }
  getBinaryView() {
    if (!this.binaryView || this.binaryView && this.mostRecentWriteChangeTime && (!this.binaryView.createdAt || this.binaryView.createdAt < this.mostRecentWriteChangeTime)) {
      const data = this.export();
      if (data) {
        this.binaryView = new SuiSqliteBinaryView({
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
    if (data && this.suiSqlSync && this.suiSqlSync.walrus) {
      return await this.suiSqlSync.walrus.calculateBlobId(data);
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
    if (!this.paramsCopy) {
      return null;
    }
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
      this.initialBinaryView = new SuiSqliteBinaryView({
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
    SuiSqlLog.log("initializing SuiSql database...", this.paramsCopy);
    try {
      this.state = "EMPTY" /* EMPTY */;
      this._db = await this.librarian.fromBinary();
      try {
        if (this.suiSqlSync) {
          await this.suiSqlSync.syncFromBlockchain();
          this.id = this.suiSqlSync.id;
          if (!this.id) {
            SuiSqlLog.log("error initilizing");
            this.state = "ERROR" /* ERROR */;
          } else {
            SuiSqlLog.log("db id", this.id);
            this.mostRecentWriteChangeTime = Date.now();
            if (this.suiSqlSync.hasBeenCreated) {
              SuiSqlLog.log("database is freshly created");
              this.state = "EMPTY" /* EMPTY */;
            } else {
              this.state = "OK" /* OK */;
            }
            const data = this.export();
            if (data) {
              this.initialBinaryView = new SuiSqliteBinaryView({
                binary: data
              });
            }
          }
        }
      } catch (e) {
        SuiSqlLog.log("error", e);
        this.state = "ERROR" /* ERROR */;
      }
    } catch (e) {
      SuiSqlLog.log("error", e);
      this.state = "ERROR" /* ERROR */;
    }
    __initializationPromiseResolver(this.state);
    return this.state;
  }
  async sync(params) {
    if (this.suiSqlSync) {
      await this.suiSqlSync.syncToBlockchain(params);
    } else {
      throw new Error("not enough initialization params to sync");
    }
  }
  async fillExpectedWalrus() {
    if (this.suiSqlSync) {
      await this.suiSqlSync.fillExpectedWalrus();
    } else {
      throw new Error("not enough initialization params to sync");
    }
  }
  markAsOk() {
    this.state = "OK" /* OK */;
  }
  /**
   * Execute an SQL query, ignoring the rows it returns.
   */
  async run(sql, params) {
    SuiSqlLog.log("run", sql, params);
    await this.initialize();
    const suiSqlStatement = new SuiSqlStatement({
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
    SuiSqlLog.log("prepare", sql, params);
    await this.initialize();
    const suiSqlStatement = new SuiSqlStatement({
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
    SuiSqlLog.log("query", sql, params);
    await this.initialize();
    const prepared = await this.prepare(sql, params);
    const ret = [];
    while (prepared.step()) {
      ret.push(prepared.getAsObject());
    }
    SuiSqlLog.log("query results", ret);
    return ret;
  }
  /**
   * Run an sql text containing many sql queries, one by one, ignoring return data. Returns the count of processed queries.
   */
  async iterateStatements(sql) {
    SuiSqlLog.log("iterateStatements", sql);
    await this.initialize();
    if (!this.db) {
      return 0;
    }
    let count = 0;
    for (let statement of this.db.iterateStatements(sql)) {
      const suiSqlStatement = new SuiSqlStatement({
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
    SuiSqlLog.log("listTables");
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
    SuiSqlLog.log("listTables results", tables);
    return tables;
  }
  async describeTable(tableName) {
    SuiSqlLog.log("describeTable", tableName);
    await this.initialize();
    const fields = [];
    try {
      const q = await this.prepare("select * from pragma_table_info(?) as tblInfo;", [tableName]);
      await q.forEach((row) => {
        fields.push(new SuiSqlField({
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
    SuiSqlLog.log("describeTable results", fields);
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
export {
  SuiSql as default
};
//# sourceMappingURL=SuiSql.js.map
