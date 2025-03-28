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
var SuiSqliteBinaryView_exports = {};
__export(SuiSqliteBinaryView_exports, {
  default: () => SuiSqliteBinaryView
});
module.exports = __toCommonJS(SuiSqliteBinaryView_exports);
var import_walrus = require("@mysten/walrus");
var import_SuiSqlUtils = require("./SuiSqlUtils");
var import_SuiSqlBinaryPatch = __toESM(require("./SuiSqlBinaryPatch"));
class SuiSqliteBinaryView {
  constructor(params) {
    __publicField(this, "binary");
    __publicField(this, "walrusClient");
    __publicField(this, "createdAt");
    this.binary = Uint8Array.from(params.binary);
    this.walrusClient = new import_walrus.WalrusClient({
      network: "testnet",
      suiRpcUrl: "https://fullnode.testnet.sui.io:443"
    });
    this.createdAt = Date.now();
  }
  async getBinaryPatch(comparedTo) {
    const pageSize1 = comparedTo.getPageSize();
    const pageSize2 = this.getPageSize();
    if (pageSize1 != pageSize2) {
      return null;
    }
    const pageCount1 = comparedTo.getPagesCount();
    const pageCount2 = this.getPagesCount();
    const patchParts = [];
    for (let i = 0; i < pageCount2; i++) {
      if (pageCount1 <= i) {
        const page2 = this.getPage(i);
        patchParts.push(new Uint8Array([0]));
        patchParts.push((0, import_SuiSqlUtils.int32ToUint8ArrayBE)(i));
        patchParts.push(page2);
      } else {
        const sha256_2 = await this.getPageSha256(i);
        const sha256_1 = await comparedTo.getPageSha256(i);
        if (sha256_1 != sha256_2) {
          const page1 = comparedTo.getPage(i);
          const page2 = this.getPage(i);
          const diff = import_SuiSqlBinaryPatch.default.binaryDiff(page1, page2);
          patchParts.push(new Uint8Array([1]));
          patchParts.push((0, import_SuiSqlUtils.int32ToUint8ArrayBE)(i));
          patchParts.push((0, import_SuiSqlUtils.int32ToUint8ArrayBE)(diff.length));
          patchParts.push(diff);
        }
      }
    }
    return await (0, import_SuiSqlUtils.compress)((0, import_SuiSqlUtils.concatUint8Arrays)(patchParts));
  }
  /**
   * Returns binary of SqlLite format page. Little difference is that:
   * - page is 1-based, so first page 
   * - page 0 is the header ( 100 bytes as per Sqlite format )
   * - page 1 is the first page of the database, and its size is (page size - 100 bytes) size
   * @param pageNumber 
   * @returns 
   */
  getPage(pageNumber) {
    if (pageNumber == 0) {
      return this.binary.subarray(0, 100);
    }
    const pageSize = this.getPageSize();
    if (pageNumber == 1) {
      return this.binary.subarray(100, pageSize);
    }
    const offset = (pageNumber - 1) * pageSize;
    return this.binary.subarray(offset, offset + pageSize);
  }
  async getPageSha256(pageNumber) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", this.getPage(pageNumber));
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  async getPageWalrusBlobId(pageNumber) {
    if (!this.walrusClient) {
      return null;
    }
    const pageSize = this.getPageSize();
    const offset = pageNumber * pageSize;
    const { blobId } = await this.walrusClient.encodeBlob(this.getPage(pageNumber));
    return blobId;
  }
  checkHeaderIsOk() {
    const header = this.binary.slice(0, 16);
    const expected = new TextEncoder().encode("SQLite format 3\0");
    if (new TextDecoder().decode(header) == new TextDecoder().decode(expected)) {
      return true;
    }
    return false;
  }
  checkLooksValid() {
    if (this.binary.length == this.getPageSize() * (this.getPagesCount() - 1)) {
      return true;
    }
    return false;
  }
  getSize() {
    return this.binary.length;
  }
  getPageSize() {
    const data = this.binary.slice(16, 18);
    if (data[0] == 0 && data[1] == 1) {
      return 65536;
    }
    return data[0] * 256 + data[1];
  }
  getPagesCount() {
    return new DataView(this.binary.buffer, 28).getUint32(0, false) + 1;
  }
  getFileChangeCounter() {
    return new DataView(this.binary.buffer, 24).getUint32(0, false);
  }
}
//# sourceMappingURL=SuiSqliteBinaryView.js.map
