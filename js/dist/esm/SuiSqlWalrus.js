var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { WalrusClient } from "@mysten/walrus";
import SuiSqlLog from "./SuiSqlLog";
class SuiSqlWalrus {
  constructor(params) {
    __publicField(this, "suiClient");
    __publicField(this, "signer");
    __publicField(this, "network", "testnet");
    __publicField(this, "walrusClient");
    this.suiClient = params.suiClient;
    this.signer = params.signer;
    const walrusClient = new WalrusClient({
      network: "testnet",
      suiClient: this.suiClient,
      storageNodeClientOptions: {
        fetch: (url, options) => {
          console.log("fetching", url);
          return fetch(url, options);
        },
        timeout: 6e4
      }
      // packageConfig: {
      //     packageId: '0x795ddbc26b8cfff2551f45e198b87fc19473f2df50f995376b924ac80e56f88b',
      //     latestPackageId: '0x261b2e46428a152570f9ac08972d67f7c12d62469ccd381a51774c1df7a829ca',
      //     systemObjectId: '0x98ebc47370603fe81d9e15491b2f1443d619d1dab720d586e429ed233e1255c1',
      //     stakingPoolId: '0x20266a17b4f1a216727f3eef5772f8d486a9e3b5e319af80a5b75809c035561d',
      //     walPackageId: '0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82',
      // },
    });
    this.walrusClient = walrusClient;
  }
  async getBlobId(data) {
    if (!this.walrusClient) {
      return null;
    }
    const { blobId } = await this.walrusClient.encodeBlob(data);
    return blobId;
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
