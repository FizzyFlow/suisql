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
var SuiSqlSync_exports = {};
__export(SuiSqlSync_exports, {
  default: () => SuiSqlSync
});
module.exports = __toCommonJS(SuiSqlSync_exports);
var import_SuiSqlUtils = require("./SuiSqlUtils");
var import_SuiSqlConsts = require("./SuiSqlConsts");
var import_SuiSqlBlockchain = __toESM(require("./SuiSqlBlockchain"));
var import_SuiSqlWalrus = __toESM(require("./SuiSqlWalrus"));
var import_SuiSqlLog = __toESM(require("./SuiSqlLog"));
class SuiSqlSync {
  constructor(params) {
    __publicField(this, "id");
    __publicField(this, "name");
    __publicField(this, "hasBeenCreated", false);
    // true if db was created during this session
    __publicField(this, "owner");
    __publicField(this, "suiSql");
    __publicField(this, "suiClient");
    __publicField(this, "syncedAt", null);
    __publicField(this, "patchesTotalSize", 0);
    // keep track of total size of patches, 
    // to be sure we are inside sui object size limit
    __publicField(this, "network", "local");
    __publicField(this, "chain");
    __publicField(this, "walrus");
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
    this.chain = new import_SuiSqlBlockchain.default({
      suiClient: this.suiClient,
      signer: params.signer,
      signAndExecuteTransaction: params.signAndExecuteTransaction,
      currentWalletAddress: params.currentWalletAddress,
      network: this.network
    });
    if (params.walrusClient || params.aggregatorUrl || params.publisherUrl || params.network) {
      this.walrus = new import_SuiSqlWalrus.default({
        walrusClient: params.walrusClient,
        signer: params.signer,
        aggregatorUrl: params.aggregatorUrl,
        publisherUrl: params.publisherUrl,
        currentWalletAddress: params.currentWalletAddress,
        network: params.network
      });
    }
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
      await this.loadFromWalrus(fields.walrusBlobId);
    }
    if (fields.owner) {
      this.owner = fields.owner;
    }
    this.patchesTotalSize = 0;
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
    import_SuiSqlLog.default.log("binaryPatch", binaryPatch);
    let selectedPatch = sqlPatch;
    let patchTypeByte = 1;
    if (binaryPatch && binaryPatch.length < sqlPatch.length + 200) {
      selectedPatch = binaryPatch;
      patchTypeByte = 2;
    }
    let walrusShouldBeForced = false;
    if (selectedPatch.length > import_SuiSqlConsts.maxBinaryArgumentSize) {
      walrusShouldBeForced = true;
    } else if (this.patchesTotalSize + selectedPatch.length > import_SuiSqlConsts.maxMoveObjectSize) {
      walrusShouldBeForced = true;
    }
    if (params?.forceWalrus) {
      walrusShouldBeForced = true;
    }
    let success = false;
    if (walrusShouldBeForced) {
      if (!this.walrus) {
        throw new Error("not enough params to save walrus blob");
      }
      const full = await this.getFull();
      if (!full) {
        throw new Error("can not get full db");
      }
      this.syncedAt = Date.now();
      const wrote = await this.walrus.write(full);
      if (!wrote) {
        throw new Error("can not write to walrus");
      }
    } else {
      let expectedBlobId = null;
      if (params?.forceExpectWalrus) {
        expectedBlobId = await this.suiSql.getExpectedBlobId();
        import_SuiSqlLog.default.log("expectedBlobId", expectedBlobId);
      }
      import_SuiSqlLog.default.log("saving patch", patchTypeByte == 1 ? "sql" : "binary", "bytes:", selectedPatch.length);
      this.syncedAt = Date.now();
      success = await this.chain.savePatch(this.id, (0, import_SuiSqlUtils.concatUint8Arrays)([new Uint8Array([patchTypeByte]), selectedPatch]), expectedBlobId ? expectedBlobId : void 0);
    }
    if (success) {
      return true;
    } else {
      this.syncedAt = syncedAtBackup;
      return false;
    }
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
    console.error("loaded from walrus", data);
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
    import_SuiSqlLog.default.log(patch, "applyPatch", patchType == 1 ? "sql" : "binary", "bytes:", remainingPatch.length);
    if (patchType == 1) {
      const success = await this.applySqlPatch(remainingPatch);
      import_SuiSqlLog.default.log("sql patch applied", success);
    } else if (patchType == 2) {
      const success = await this.suiSql.applyBinaryPatch(remainingPatch);
      import_SuiSqlLog.default.log("binary patch applied", success);
    }
    return true;
  }
  async applySqlPatch(patch) {
    if (!this.suiSql.db) {
      return false;
    }
    const decompressed = await (0, import_SuiSqlUtils.decompress)(patch);
    const list = JSON.parse(new TextDecoder().decode(decompressed));
    import_SuiSqlLog.default.log("applying SQL patch", list);
    for (const item of list) {
      try {
        this.suiSql.db.run(item.sql);
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
  async getPatch() {
    const executions = this.suiSql.writeExecutions.filter((execution) => {
      if (this.syncedAt === null || execution.at > this.syncedAt) {
        return true;
      }
      return false;
    });
    const input = new TextEncoder().encode(JSON.stringify(executions));
    const ziped = await (0, import_SuiSqlUtils.compress)(input);
    return ziped;
  }
}
//# sourceMappingURL=SuiSqlSync.js.map
