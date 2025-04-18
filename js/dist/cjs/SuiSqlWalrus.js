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
var import_SuiSqlLog = __toESM(require("./SuiSqlLog"));
var import_SuiSqlUtils = require("./SuiSqlUtils");
var import_axios = __toESM(require("axios"));
const N_SHARDS = 1e3;
class SuiSqlWalrus {
  constructor(params) {
    __publicField(this, "signer");
    __publicField(this, "walrusClient");
    __publicField(this, "currentWalletAddress");
    __publicField(this, "publisherUrl");
    __publicField(this, "aggregatorUrl");
    __publicField(this, "canWrite", false);
    __publicField(this, "canRead", false);
    this.signer = params.signer;
    this.currentWalletAddress = params.currentWalletAddress;
    this.publisherUrl = params.publisherUrl;
    this.aggregatorUrl = params.aggregatorUrl;
    this.walrusClient = params.walrusClient;
    if (!this.currentWalletAddress && this.signer) {
      this.currentWalletAddress = this.signer.toSuiAddress();
    }
    if (!this.walrusClient && params.network) {
      if (!this.aggregatorUrl) {
        if (params.network == "testnet") {
          this.aggregatorUrl = "https://aggregator.walrus-testnet.walrus.space";
        }
      }
      if (!this.publisherUrl && this.currentWalletAddress) {
        if (params.network == "testnet") {
          this.publisherUrl = "https://publisher.walrus-testnet.walrus.space";
        }
      }
    }
    if (!this.publisherUrl && !this.signer && this.currentWalletAddress) {
      if (params.network == "testnet") {
        this.publisherUrl = "https://publisher.walrus-testnet.walrus.space";
      }
    }
    this.canWrite = false;
    if (this.walrusClient) {
      this.canRead = true;
      if (this.signer) {
        this.canWrite = true;
      }
      if (this.publisherUrl && this.currentWalletAddress) {
        this.canWrite = true;
      }
    } else {
      if (this.publisherUrl && this.currentWalletAddress) {
        this.canWrite = true;
      }
      if (this.aggregatorUrl) {
        this.canRead = true;
      }
    }
    import_SuiSqlLog.default.log("SuiSqlWalrus instance", params, "canRead:", this.canRead, "canWrite:", this.canWrite);
  }
  async getSystemObjectId() {
    if (!this.walrusClient) {
      return null;
    }
    const systemObject = await this.walrusClient.systemObject();
    return systemObject.id.id;
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
  getCurrentAddress() {
    if (this.signer) {
      return this.signer.toSuiAddress();
    }
    if (this.currentWalletAddress) {
      return this.currentWalletAddress;
    }
    return null;
  }
  async writeToPublisher(data) {
    const form = new FormData();
    form.append("file", new Blob([data]));
    const publisherUrl = this.publisherUrl + "/v1/blobs?deletable=true&send_object_to=" + this.getCurrentAddress();
    import_SuiSqlLog.default.log("writing blob to walrus via publisher", form);
    const res = await import_axios.default.put(publisherUrl, data);
    console.log("walrus publisher response", res);
    if (res && res.data && res.data.newlyCreated && res.data.newlyCreated.blobObject && res.data.newlyCreated.blobObject.id) {
      import_SuiSqlLog.default.log("success", res.data);
      return {
        blobId: res.data.newlyCreated.blobObject.blob_id,
        blobObjectId: res.data.newlyCreated.blobObject.id
      };
    }
    throw new Error("Failed to write blob to walrus publisher");
  }
  async write(data) {
    if (this.publisherUrl && this.currentWalletAddress) {
      return await this.writeToPublisher(data);
    }
    if (!this.walrusClient || !this.signer) {
      return null;
    }
    import_SuiSqlLog.default.log("writing blob to walrus", data);
    const { blobId, blobObject } = await this.walrusClient.writeBlob({
      blob: data,
      deletable: true,
      epochs: 2,
      signer: this.signer,
      owner: this.signer.toSuiAddress(),
      attributes: void 0
    });
    const blobObjectId = blobObject.id.id;
    import_SuiSqlLog.default.log("walrus write success", blobId, blobObjectId);
    return { blobId, blobObjectId };
  }
  async readFromAggregator(blobId) {
    const url = this.aggregatorUrl + "/v1/blobs/" + blobId;
    import_SuiSqlLog.default.log("reading blob from walrus (Aggregator)", blobId);
    const res = await import_axios.default.get(url, { responseType: "arraybuffer" });
    return new Uint8Array(res.data);
  }
  async read(blobId) {
    const asString = (0, import_SuiSqlUtils.blobIdFromInt)(blobId);
    if (this.aggregatorUrl) {
      return await this.readFromAggregator(asString);
    }
    import_SuiSqlLog.default.log("reading blob from walrus (SDK)", blobId, asString);
    const data = await this.walrusClient?.readBlob({ blobId: asString });
    if (data) {
      import_SuiSqlLog.default.log("walrus read success", data);
      return data;
    }
    return null;
  }
}
//# sourceMappingURL=SuiSqlWalrus.js.map
