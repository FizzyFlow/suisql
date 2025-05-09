var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { compress, decompress, concatUint8Arrays } from "./SuiSqlUtils.js";
import { maxBinaryArgumentSize, maxMoveObjectSize } from "./SuiSqlConsts.js";
import { blobIdFromInt } from "./SuiSqlUtils.js";
import SuiSqlBlockchain from "./SuiSqlBlockchain.js";
import SuiSqlWalrus from "./SuiSqlWalrus.js";
import SuiSqlLog from "./SuiSqlLog.js";
class SuiSqlSync {
  // use await this.hasWriteAccess() to check if we can write to the db
  constructor(params) {
    __publicField(this, "id");
    __publicField(this, "name");
    __publicField(this, "hasBeenCreated", false);
    // true if db was created during this session
    __publicField(this, "owner");
    __publicField(this, "walrusBlobId");
    // base walrus blob id, if any
    __publicField(this, "walrusEndEpoch");
    // walrus end epoch, if any
    __publicField(this, "walrusStorageSize");
    // walrus storage size, if any
    __publicField(this, "suiSql");
    __publicField(this, "suiClient");
    __publicField(this, "syncedAt", null);
    __publicField(this, "patchesTotalSize", 0);
    // keep track of total size of patches, 
    // to be sure we are inside sui object size limit
    __publicField(this, "network", "local");
    __publicField(this, "chain");
    __publicField(this, "walrus");
    __publicField(this, "canWrite");
    this.suiSql = params.suiSql;
    this.suiClient = params.suiClient;
    if (params.id) {
      this.id = params.id;
    }
    if (params.name) {
      this.name = params.name;
    }
    if (params.network) {
      this.network = params.network;
    }
    this.chain = new SuiSqlBlockchain({
      suiClient: this.suiClient,
      signer: params.signer,
      signAndExecuteTransaction: params.signAndExecuteTransaction,
      currentWalletAddress: params.currentWalletAddress,
      network: this.network
    });
    if (params.walrusClient || params.aggregatorUrl || params.publisherUrl || params.network) {
      this.walrus = new SuiSqlWalrus({
        walrusClient: params.walrusClient,
        chain: this.chain,
        signer: params.signer,
        aggregatorUrl: params.aggregatorUrl,
        publisherUrl: params.publisherUrl,
        currentWalletAddress: params.currentWalletAddress,
        network: params.network
      });
    }
  }
  async hasWriteAccess() {
    if (!this.id || !this.chain) {
      return false;
    }
    if (this.canWrite !== void 0) {
      return this.canWrite;
    }
    const writeCapId = await this.chain.getWriteCapId(this.id);
    if (writeCapId) {
      this.canWrite = true;
      return true;
    } else {
      this.canWrite = false;
    }
    return false;
  }
  get syncedAtDate() {
    if (this.syncedAt === null) {
      return null;
    }
    return new Date(this.syncedAt);
  }
  get ownerAddress() {
    if (this.owner) {
      if (this.owner.AddressOwner) {
        return this.owner.AddressOwner;
      } else if (this.owner.ObjectOwner) {
        return this.owner.ObjectOwner;
      } else if (this.owner.Shared) {
        return "shared";
      }
    }
    return null;
  }
  unsavedChangesCount() {
    let count = 0;
    this.suiSql.writeExecutions.forEach((execution) => {
      if (this.syncedAt === null || execution.at > this.syncedAt) {
        count++;
      }
    });
    return count;
  }
  /**
   * Returns true if db has changes that should be saved into the blockchain
   */
  hasUnsavedChanges() {
    let has = false;
    const BreakException = {};
    try {
      this.suiSql.writeExecutions.forEach((execution) => {
        if (this.syncedAt === null || execution.at > this.syncedAt) {
          has = true;
          throw BreakException;
        }
      });
    } catch (e) {
      if (e !== BreakException) {
        throw e;
      }
    }
    return has;
  }
  async syncFromBlockchain() {
    if (!this.suiClient || !this.chain) {
      return false;
    }
    if (!this.id && this.name) {
      const thereDbId = await this.chain.getDbId(this.name);
      if (thereDbId) {
        this.id = thereDbId;
      } else {
        this.id = await this.chain.makeDb(this.name);
        this.hasBeenCreated = true;
        await new Promise((res) => setTimeout(res, 100));
      }
    }
    const id = this.id;
    const fields = await this.chain.getFields(id);
    if (fields.walrusBlobId) {
      this.walrusBlobId = blobIdFromInt(fields.walrusBlobId);
      await this.loadFromWalrus(fields.walrusBlobId);
    }
    if (fields.walrusEndEpoch) {
      this.walrusEndEpoch = fields.walrusEndEpoch;
    }
    if (fields.walrusStorageSize) {
      this.walrusStorageSize = fields.walrusStorageSize;
    }
    if (fields.owner) {
      this.owner = fields.owner;
    }
    this.patchesTotalSize = 0;
    SuiSqlLog.log("need to apply patches", fields?.patches?.length);
    for (const patch of fields.patches) {
      this.patchesTotalSize = this.patchesTotalSize + patch.length;
      await this.applyPatch(patch);
    }
    this.syncedAt = Date.now();
    await new Promise((res) => setTimeout(res, 5));
    return true;
  }
  async syncToBlockchain(params) {
    if (!this.id || !this.chain) {
      throw new Error("can not save db without blockchain id");
    }
    const syncedAtBackup = this.syncedAt;
    const sqlPatch = await this.getPatch();
    const binaryPatch = await this.suiSql.getBinaryPatch();
    SuiSqlLog.log("binaryPatch", binaryPatch);
    let selectedPatch = sqlPatch;
    let patchTypeByte = 1;
    if (binaryPatch && binaryPatch.length < sqlPatch.length + 200) {
      if (!this.patchesTotalSize && !this.walrusBlobId) {
      } else {
        selectedPatch = binaryPatch;
        patchTypeByte = 2;
      }
    }
    let walrusShouldBeForced = false;
    if (selectedPatch.length > maxBinaryArgumentSize) {
      walrusShouldBeForced = true;
    } else if (this.patchesTotalSize + selectedPatch.length > maxMoveObjectSize) {
      walrusShouldBeForced = true;
    }
    if (params?.forceWalrus) {
      walrusShouldBeForced = true;
    }
    let success = false;
    let gotError = null;
    try {
      if (walrusShouldBeForced) {
        if (!this.walrus) {
          throw new Error("not enough params to save walrus blob");
        }
        const systemObjectId = await this.walrus.getSystemObjectId();
        if (!systemObjectId) {
          throw new Error("can not get walrus system object id from walrusClient");
        }
        const full = await this.getFull();
        if (!full) {
          throw new Error("can not get full db");
        }
        this.syncedAt = Date.now();
        const wrote = await this.walrus.write2(full);
        if (!wrote || !wrote.blobObjectId) {
          throw new Error("can not write to walrus");
        }
        success = await this.chain.clampWithWalrus(this.id, wrote.blobObjectId, systemObjectId);
        if (success) {
          this.walrusBlobId = blobIdFromInt(wrote.blobId);
        }
      } else {
        let expectedBlobId = null;
        if (params?.forceExpectWalrus) {
          expectedBlobId = await this.suiSql.getExpectedBlobId();
          SuiSqlLog.log("expectedBlobId", expectedBlobId);
        }
        SuiSqlLog.log("saving patch", patchTypeByte == 1 ? "sql" : "binary", "bytes:", selectedPatch.length);
        this.syncedAt = Date.now();
        success = await this.chain.savePatch(this.id, concatUint8Arrays([new Uint8Array([patchTypeByte]), selectedPatch]), expectedBlobId ? expectedBlobId : void 0);
      }
    } catch (e) {
      gotError = e;
      success = false;
    }
    if (success) {
      return true;
    } else {
      this.syncedAt = syncedAtBackup;
      if (gotError) {
        throw gotError;
      }
      return false;
    }
  }
  async extendWalrus(extendedEpochs = 1) {
    if (!this.walrus || !this.chain) {
      return;
    }
    const systemObjectId = await this.walrus.getSystemObjectId();
    if (!systemObjectId) {
      throw new Error("can not get walrus system object id from walrusClient");
    }
    if (!this.walrusStorageSize) {
      throw new Error("we do not know current walrus blob storage size");
    }
    const storagePricePerEpoch = await this.walrus.getStoragePricePerEpoch(this.walrusStorageSize);
    if (!storagePricePerEpoch) {
      throw new Error("can not get walrus storage price per epoch");
    }
    const totalStoragePrice = storagePricePerEpoch * BigInt(extendedEpochs);
    const id = this.id;
    const results = await this.chain.extendWalrus(id, systemObjectId, extendedEpochs, totalStoragePrice);
    if (typeof results === "number") {
      this.walrusEndEpoch = results;
    }
    if (results) {
      return true;
    }
    return false;
  }
  async fillExpectedWalrus() {
    if (!this.walrus || !this.chain) {
      return;
    }
    const systemObjectId = await this.walrus.getSystemObjectId();
    if (!systemObjectId) {
      throw new Error("can not get walrus system object id from walrusClient");
    }
    const id = this.id;
    const fields = await this.chain.getFields(id);
    if (fields.expectedWalrusBlobId) {
      const currentExpectedBlobId = await this.suiSql.getExpectedBlobId();
      if (currentExpectedBlobId == fields.expectedWalrusBlobId) {
        const full = await this.getFull();
        if (!full) {
          throw new Error("can not get full db");
        }
        const status = await this.walrus.write(full);
        if (!status) {
          throw new Error("can not write to walrus");
        }
        const blobObjectId = status.blobObjectId;
        const success = await this.chain.fillExpectedWalrus(id, blobObjectId, systemObjectId);
        if (success) {
          this.walrusBlobId = blobIdFromInt(status.blobId);
        }
        return success;
      } else {
        throw new Error("expected walrus blob id does not match current state of the db");
      }
    } else {
      throw new Error("db is not expecting any walrus clamp");
    }
  }
  async loadFromWalrus(walrusBlobId) {
    const data = await this.walrus?.read(walrusBlobId);
    SuiSqlLog.log("Loaded from Walrus", data);
    if (data) {
      this.suiSql.replace(data);
    }
  }
  async applyPatch(patch) {
    if (!this.suiSql.db) {
      return false;
    }
    const patchType = patch[0];
    const remainingPatch = patch.slice(1);
    SuiSqlLog.log(patch, "applyPatch", patchType == 1 ? "sql" : "binary", "bytes:", remainingPatch.length);
    if (patchType == 1) {
      const success = await this.applySqlPatch(remainingPatch);
      SuiSqlLog.log("sql patch applied", success);
    } else if (patchType == 2) {
      const success = await this.suiSql.applyBinaryPatch(remainingPatch);
      SuiSqlLog.log("binary patch applied", success);
    }
    return true;
  }
  async applySqlPatch(patch) {
    if (!this.suiSql.db) {
      return false;
    }
    const decompressed = await decompress(patch);
    const list = JSON.parse(new TextDecoder().decode(decompressed));
    SuiSqlLog.log("applying SQL patch", list);
    for (const item of list) {
      try {
        if (item.params) {
          this.suiSql.db.run(item.sql, item.params);
        } else {
          this.suiSql.db.run(item.sql);
        }
      } catch (e) {
        console.error(e);
      }
    }
    return true;
  }
  async getFull() {
    if (!this.suiSql.db) {
      return null;
    }
    return this.suiSql.db.export();
  }
  async getPatchJSON() {
    const executions = this.suiSql.writeExecutions.filter((execution) => {
      if (this.syncedAt === null || execution.at > this.syncedAt) {
        return true;
      }
      return false;
    });
    return JSON.stringify(executions, null, 2);
  }
  async getPatch() {
    const executions = this.suiSql.writeExecutions.filter((execution) => {
      if (this.syncedAt === null || execution.at > this.syncedAt) {
        return true;
      }
      return false;
    });
    const input = new TextEncoder().encode(JSON.stringify(executions));
    const ziped = await compress(input);
    return ziped;
  }
}
export {
  SuiSqlSync as default
};
//# sourceMappingURL=SuiSqlSync.js.map
