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
var SuiSqlLibrarian_exports = {};
__export(SuiSqlLibrarian_exports, {
  default: () => SuiSqlLibrarian
});
module.exports = __toCommonJS(SuiSqlLibrarian_exports);
var import_sql = __toESM(require("sql.js"));
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
      return import_sql.default;
    } else {
      return await this.loadScript();
    }
  }
  async loadScript() {
    if (window["initSqlJs"]) {
      return window["initSqlJs"];
    }
    const promise = new Promise((res) => {
      const imported = document.createElement("script");
      imported.src = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm-debug.js";
      imported.setAttribute("type", "text/javascript");
      document.head.appendChild(imported);
      imported.onload = () => {
        res(window["initSqlJs"]);
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
//# sourceMappingURL=SuiSqlLibrarian.js.map
