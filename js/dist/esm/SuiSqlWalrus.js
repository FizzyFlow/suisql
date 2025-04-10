var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { getFullnodeUrl } from "@mysten/sui/client";
import SuiSqlLog from "./SuiSqlLog";
import { blobIdToInt } from "./SuiSqlUtils";
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
      const rpcUrl = getFullnodeUrl(this.network);
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
      return blobIdToInt(blobId);
    }
    return null;
  }
  async write(data) {
    if (!this.walrusClient || !this.signer) {
      return null;
    }
    SuiSqlLog.log("wrining blob to walrus", data);
    const { blobId } = await this.walrusClient.writeBlob({
      blob: data,
      deletable: true,
      epochs: 3,
      signer: this.signer,
      owner: this.signer.toSuiAddress(),
      attributes: void 0
    });
    SuiSqlLog.log("walrus write success", blobId);
    return blobId;
  }
  async read(blobId) {
    SuiSqlLog.log("reading blob from walrus", blobId);
    const data = await this.walrusClient?.readBlob({ blobId });
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
