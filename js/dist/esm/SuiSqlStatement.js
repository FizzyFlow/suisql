var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { anyShallowCopy, isSureWriteSql } from "./SuiSqlUtils.js";
class SuiSqlStatement {
  constructor(params) {
    __publicField(this, "suiSql");
    __publicField(this, "stmp", null);
    __publicField(this, "sql", null);
    __publicField(this, "params", null);
    __publicField(this, "executedAt", null);
    __publicField(this, "writeExecutions", []);
    this.suiSql = params.suiSql;
    if (params.statement) {
      this.stmp = params.statement;
      this.sql = this.stmp.getSQL().trim();
    } else if (params.sql) {
      this.sql = params.sql.trim();
      if (this.suiSql.db) {
        this.stmp = this.suiSql.db.prepare(this.sql);
      }
    }
    if (!this.stmp || !this.sql) {
      throw new Error("either sql or statement param requried");
    }
    this.params = null;
    if (params.params) {
      this.bind(params.params);
    }
    this.executedAt = null;
    this.writeExecutions = [];
  }
  bind(params) {
    this.params = params;
    if (this.stmp) {
      this.stmp.bind(params);
    }
  }
  step() {
    if (!this.stmp) {
      return null;
    }
    this.executedAt = Date.now();
    const stepResult = this.stmp.step();
    if (this.sql && isSureWriteSql(this.sql)) {
      this.writeExecutions.push({
        params: anyShallowCopy(this.params),
        sql: this.sql,
        at: this.executedAt
      });
      this.suiSql.markAsOk();
      this.suiSql.mostRecentWriteChangeTime = this.executedAt;
    }
    return stepResult;
  }
  get() {
    if (this.stmp) {
      return this.stmp.get();
    }
    return null;
  }
  /**
   * Shorthand for bind + step + reset Bind the values, execute the statement, ignoring the rows it returns, and resets it
   */
  run(params = null) {
    if (params) {
      this.bind(params);
    }
    this.step();
    this.reset();
  }
  /**
   * Reset a statement, so that its parameters can be bound to new values It also clears all previous bindings, freeing the memory used by bound parameters.
   */
  reset() {
    if (this.stmp) {
      return this.stmp.reset();
    }
  }
  /**
   * Free the memory used by the statement
   */
  free() {
    if (this.stmp) {
      return this.stmp.free();
    }
    return false;
  }
  getAsObject() {
    if (this.stmp) {
      return this.stmp.getAsObject();
    }
    return null;
  }
  /**
   * Loop over results from db. Callback may be an async function, waited to be fulfilled to get the next item.
   * returns count of processed results.
   */
  async forEach(callback, maxCount) {
    let processedCount = 0;
    let needMore = true;
    while (needMore) {
      let hasData = this.step();
      if (hasData) {
        await callback(this.getAsObject());
        processedCount = processedCount + 1;
        if (maxCount && maxCount < processedCount) {
          needMore = false;
        }
      } else {
        needMore = false;
      }
    }
    return processedCount;
  }
}
export {
  SuiSqlStatement as default
};
//# sourceMappingURL=SuiSqlStatement.js.map
