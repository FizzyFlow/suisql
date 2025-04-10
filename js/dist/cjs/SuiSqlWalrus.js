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
var SuiSqlWalrus_exports = {};
__export(SuiSqlWalrus_exports, {
  default: () => SuiSqlWalrus
});
module.exports = __toCommonJS(SuiSqlWalrus_exports);
var import_client = require("@mysten/sui/client");
var import_SuiSqlLog = __toESM(require("./SuiSqlLog"));
var import_SuiSqlUtils = require("./SuiSqlUtils");
const N_SHARDS = 1e3;
class SuiSqlWalrus {
  constructor(params) {
    __publicField(this, "signer");
    __publicField(this, "network", "testnet");
    __publicField(this, "walrusClient");
    this.signer = params.signer;
    if (params.walrusClient) {
      this.walrusClient = params.walrusClient;
    } else if (params.network) {
      this.network = params.network;
      const rpcUrl = (0, import_client.getFullnodeUrl)(this.network);
    } else {
      throw new Error("No walrusClient or network provided for SuiSqlWalrus, can not initialize walrus connection");
    }
  }
  // static async calculateBlobId(data: Uint8Array): Promise<bigint | null> {
  //     if (!this.walrusClient) {
  //         return null;
  //     }
  //     const { blobId } = await this.walrusClient.encodeBlob(data);
  //     return blobId;
  //     return null;
  // }
  async calculateBlobId(data) {
    if (!this.walrusClient) {
      return null;
    }
    const { blobId } = await this.walrusClient.encodeBlob(data);
    if (blobId) {
      return (0, import_SuiSqlUtils.blobIdToInt)(blobId);
    }
    return null;
  }
  async write(data) {
    if (!this.walrusClient || !this.signer) {
      return null;
    }
    import_SuiSqlLog.default.log("wrining blob to walrus", data);
    const { blobId } = await this.walrusClient.writeBlob({
      blob: data,
      deletable: true,
      epochs: 3,
      signer: this.signer,
      owner: this.signer.toSuiAddress(),
      attributes: void 0
    });
    import_SuiSqlLog.default.log("walrus write success", blobId);
    return blobId;
  }
  async read(blobId) {
    import_SuiSqlLog.default.log("reading blob from walrus", blobId);
    const data = await this.walrusClient?.readBlob({ blobId });
    if (data) {
      import_SuiSqlLog.default.log("walrus read success", data);
      return data;
    }
    return null;
  }
}
//# sourceMappingURL=SuiSqlWalrus.js.map
