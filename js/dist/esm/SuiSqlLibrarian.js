var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import initSqlJs from "sql.js";
const isBrowser = Object.getPrototypeOf(
  Object.getPrototypeOf(globalThis)
) !== Object.prototype;
console.log("isBrowser", isBrowser);
class SuiSqlLibrarian {
  constructor() {
    __publicField(this, "isReady", false);
    __publicField(this, "SQLC", null);
  }
  async getLib() {
    if (!isBrowser) {
      return initSqlJs;
    } else {
      return await this.loadScript();
    }
  }
  async loadScript() {
    if (window.initSqlJs) {
      return window.initSqlJs;
    }
    const promise = new Promise((res) => {
      const imported = document.createElement("script");
      imported.src = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm-debug.js";
      imported.setAttribute("type", "text/javascript");
      document.head.appendChild(imported);
      imported.onload = () => {
        res(window.initSqlJs);
      };
    });
    return await promise;
  }
  async init() {
    if (this.SQLC && this.isReady) {
      return true;
    }
    const initSqlJsFunction = await this.getLib();
    if (isBrowser) {
      const SQLC = await initSqlJsFunction({
        locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
      });
      this.SQLC = SQLC;
      this.isReady = true;
    } else {
      const SQLC = await initSqlJsFunction({});
      this.SQLC = SQLC;
      this.isReady = true;
    }
    return true;
  }
  fromBinarySync(binary) {
    if (this.isReady && this.SQLC) {
      return new this.SQLC.Database(binary);
    }
    return null;
  }
  async fromBinary(binary) {
    await this.init();
    if (this.isReady && this.SQLC) {
      if (binary) {
        return new this.SQLC.Database(binary);
      } else {
        return new this.SQLC.Database();
      }
    }
    return null;
  }
}
export {
  SuiSqlLibrarian as default
};
//# sourceMappingURL=SuiSqlLibrarian.js.map
