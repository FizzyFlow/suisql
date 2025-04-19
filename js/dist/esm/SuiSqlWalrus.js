var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import SuiSqlLog from "./SuiSqlLog";
import { blobIdToInt, blobIdFromInt } from "./SuiSqlUtils";
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
    SuiSqlLog.log("SuiSqlWalrus instance", params, "canRead:", this.canRead, "canWrite:", this.canWrite);
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
    const res = await axios.put(publisherUrl, data);
    console.log("walrus publisher response", res);
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
}
export {
  SuiSqlWalrus as default
};
//# sourceMappingURL=SuiSqlWalrus.js.map
