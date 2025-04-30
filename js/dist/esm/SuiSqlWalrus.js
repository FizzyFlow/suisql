var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import SuiSqlLog from "./SuiSqlLog.js";
import { Transaction } from "@mysten/sui/transactions";
import { blobIdToInt, blobIdFromInt } from "./SuiSqlUtils.js";
import axios from "axios";
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
    SuiSqlLog.log("SuiSqlWalrus instance", params, "canRead:", this.canRead, "canWrite:", this.canWrite);
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
      return blobIdToInt(blobId);
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
    SuiSqlLog.log("writing blob to walrus via publisher", form);
    let res = null;
    try {
      res = await axios.put(publisherUrl, data);
    } catch (e) {
      SuiSqlLog.log("error writing to publisher", res, res?.data, e?.response?.data);
      throw e;
    }
    if (res && res.data && res.data.newlyCreated && res.data.newlyCreated.blobObject && res.data.newlyCreated.blobObject.id) {
      SuiSqlLog.log("success", res.data);
      return {
        blobId: blobIdToInt("" + res.data.newlyCreated.blobObject.blobId),
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
    SuiSqlLog.log("writing blob to walrus", data);
    const { blobId, blobObject } = await this.walrusClient.writeBlob({
      blob: data,
      deletable: true,
      epochs: 2,
      signer: this.signer,
      owner: this.signer.toSuiAddress(),
      attributes: void 0
    });
    const blobObjectId = blobObject.id.id;
    const blobIdAsInt = blobIdToInt(blobId);
    SuiSqlLog.log("walrus write success", blobIdAsInt, blobObjectId);
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
      SuiSqlLog.log("walrus write success", blobId, blobObjectId);
      return { blobId: blobIdToInt(blobId), blobObjectId };
    }
    return null;
  }
  async readFromAggregator(blobId) {
    const asString = blobIdFromInt(blobId);
    const url = this.aggregatorUrl + "/v1/blobs/" + asString;
    SuiSqlLog.log("reading blob from walrus (Aggregator)", blobId);
    const res = await axios.get(url, { responseType: "arraybuffer" });
    return new Uint8Array(res.data);
  }
  async read(blobId) {
    if (this.aggregatorUrl) {
      return await this.readFromAggregator(blobId);
    }
    const asString = blobIdFromInt(blobId);
    SuiSqlLog.log("reading blob from walrus (SDK)", blobId, asString);
    const data = await this.walrusClient?.readBlob({ blobId: asString });
    if (data) {
      SuiSqlLog.log("walrus read success", data);
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
    const tx = new Transaction();
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
export {
  SuiSqlWalrus as default
};
//# sourceMappingURL=SuiSqlWalrus.js.map
