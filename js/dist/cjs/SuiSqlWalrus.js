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
var import_SuiSqlLog = __toESM(require("./SuiSqlLog.js"));
var import_transactions = require("@mysten/sui/transactions");
var import_SuiSqlUtils = require("./SuiSqlUtils.js");
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
    __publicField(this, "chain");
    this.signer = params.signer;
    this.currentWalletAddress = params.currentWalletAddress;
    this.publisherUrl = params.publisherUrl;
    this.aggregatorUrl = params.aggregatorUrl;
    this.walrusClient = params.walrusClient;
    this.chain = params.chain;
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
  async getStoragePricePerEpoch(size) {
    const BYTES_PER_UNIT_SIZE = 1024 * 1024;
    const storageUnits = BigInt(Math.ceil(size / BYTES_PER_UNIT_SIZE));
    const systemState = await this.walrusClient?.systemState();
    if (systemState && systemState.storage_price_per_unit_size) {
      const storagPricePerUnitSize = BigInt(systemState.storage_price_per_unit_size);
      const periodPaymentDue = storagPricePerUnitSize * storageUnits;
      return periodPaymentDue;
    }
    return null;
  }
  async getSystemObjectId() {
    if (!this.walrusClient) {
      return null;
    }
    const systemObject = await this.walrusClient.systemObject();
    return systemObject.id.id;
  }
  async getSystemCurrentEpoch() {
    if (!this.walrusClient) {
      return null;
    }
    const systemState = await this.walrusClient?.systemState();
    if (systemState && systemState.committee && systemState.committee.epoch) {
      return systemState.committee.epoch;
    }
    return null;
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
    let res = null;
    try {
      res = await import_axios.default.put(publisherUrl, data);
    } catch (e) {
      import_SuiSqlLog.default.log("error writing to publisher", res, res?.data, e?.response?.data);
      throw e;
    }
    if (res && res.data && res.data.newlyCreated && res.data.newlyCreated.blobObject && res.data.newlyCreated.blobObject.id) {
      import_SuiSqlLog.default.log("success", res.data);
      return {
        blobId: (0, import_SuiSqlUtils.blobIdToInt)("" + res.data.newlyCreated.blobObject.blobId),
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
    const blobIdAsInt = (0, import_SuiSqlUtils.blobIdToInt)(blobId);
    import_SuiSqlLog.default.log("walrus write success", blobIdAsInt, blobObjectId);
    return { blobId: blobIdAsInt, blobObjectId };
  }
  async write2(data) {
    if (!this.walrusClient || !this.chain) {
      return null;
    }
    const owner = this.getCurrentAddress();
    if (!owner) {
      throw new Error("No owner address available");
    }
    const deletable = true;
    const { sliversByNode, blobId, metadata, rootHash } = await this.walrusClient.encodeBlob(data);
    const registerBlobTransaction = await this.registerBlobTransaction({
      size: data.byteLength,
      epochs: 2,
      blobId,
      rootHash,
      deletable,
      owner,
      attributes: void 0
    });
    const blobObjectId = await this.chain.executeRegisterBlobTransaction(registerBlobTransaction);
    if (!blobObjectId) {
      throw new Error("Can not get blobObjectId from blob registration transaction");
    }
    console.log(blobObjectId);
    const confirmations = await this.walrusClient.writeEncodedBlobToNodes({
      blobId,
      metadata,
      sliversByNode,
      deletable,
      objectId: blobObjectId
    });
    const certifyBlobTransaction = await this.certifyBlobTransaction({
      blobId,
      blobObjectId,
      confirmations,
      deletable
    });
    const success = await this.chain.executeTx(certifyBlobTransaction);
    if (success) {
      import_SuiSqlLog.default.log("walrus write success", blobId, blobObjectId);
      return { blobId: (0, import_SuiSqlUtils.blobIdToInt)(blobId), blobObjectId };
    }
    return null;
  }
  async readFromAggregator(blobId) {
    const asString = (0, import_SuiSqlUtils.blobIdFromInt)(blobId);
    const url = this.aggregatorUrl + "/v1/blobs/" + asString;
    import_SuiSqlLog.default.log("reading blob from walrus (Aggregator)", blobId);
    const res = await import_axios.default.get(url, { responseType: "arraybuffer" });
    return new Uint8Array(res.data);
  }
  async read(blobId) {
    if (this.aggregatorUrl) {
      return await this.readFromAggregator(blobId);
    }
    const asString = (0, import_SuiSqlUtils.blobIdFromInt)(blobId);
    import_SuiSqlLog.default.log("reading blob from walrus (SDK)", blobId, asString);
    const data = await this.walrusClient?.readBlob({ blobId: asString });
    if (data) {
      import_SuiSqlLog.default.log("walrus read success", data);
      return data;
    }
    return null;
  }
  async registerBlobTransaction(options) {
    if (!this.walrusClient || !this.chain) {
      throw new Error("Walrus client not initialized");
    }
    const owner = this.getCurrentAddress();
    if (!owner) {
      throw new Error("No owner address available");
    }
    if (!options.owner) {
      options.owner = owner;
    }
    const storagePricePerEpoch = await this.getStoragePricePerEpoch(Math.ceil(options.size / (1024 * 1024)));
    const totalPrice = BigInt(1e9);
    const tx = new import_transactions.Transaction();
    const walCoin = await this.chain.getWalCoinForTx(tx, totalPrice);
    const composedTx = this.walrusClient.registerBlobTransaction({ transaction: tx, walCoin, ...options });
    composedTx.transferObjects([walCoin], owner);
    return composedTx;
  }
  async certifyBlobTransaction(options) {
    if (!this.walrusClient) {
      throw new Error("Walrus client not initialized");
    }
    return this.walrusClient.certifyBlobTransaction(options);
  }
}
//# sourceMappingURL=SuiSqlWalrus.js.map
