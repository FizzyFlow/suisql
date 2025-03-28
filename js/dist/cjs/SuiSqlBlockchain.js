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
var SuiSqlBlockchain_exports = {};
__export(SuiSqlBlockchain_exports, {
  default: () => SuiSqlBlockchain
});
module.exports = __toCommonJS(SuiSqlBlockchain_exports);
var import_SuiSqlConsts = require("./SuiSqlConsts");
var import_transactions = require("@mysten/sui/transactions");
var import_bcs = require("@mysten/sui/bcs");
var import_SuiSqlWalrus = __toESM(require("./SuiSqlWalrus.js"));
var import_SuiSqlLog = __toESM(require("./SuiSqlLog"));
class SuiSqlBlockchain {
  constructor(params) {
    __publicField(this, "suiClient");
    __publicField(this, "signer");
    __publicField(this, "signAndExecuteTransaction");
    __publicField(this, "network", "local");
    __publicField(this, "forcedPackageId");
    __publicField(this, "bankId");
    __publicField(this, "walrus");
    this.suiClient = params.suiClient;
    this.signer = params.signer;
    if (params.signAndExecuteTransaction) {
      this.signAndExecuteTransaction = params.signAndExecuteTransaction;
    }
    if (params.network) {
      this.network = params.network;
    }
    this.walrus = new import_SuiSqlWalrus.default({
      suiClient: params.walrusSuiClient ? params.walrusSuiClient : this.suiClient,
      signer: this.signer
    });
  }
  setPackageId(packageId) {
    this.forcedPackageId = packageId;
    delete this.bankId;
  }
  getPackageId() {
    if (this.forcedPackageId) {
      return this.forcedPackageId;
    }
    if (import_SuiSqlConsts.packages[this.network]) {
      return import_SuiSqlConsts.packages[this.network];
    }
    return null;
  }
  async getBankId() {
    if (this.bankId) {
      return this.bankId;
    }
    const packageId = await this.getPackageId();
    if (!packageId) {
      throw new Error("can not find bank if do not know the package");
    }
    if (!this.suiClient) {
      throw new Error("suiClient required");
    }
    let bankId = null;
    const resp = await this.suiClient.queryEvents({
      query: { "MoveEventType": "" + packageId + "::events::NewBankEvent" }
    });
    if (resp && resp.data && resp.data[0] && resp.data[0].parsedJson) {
      bankId = resp.data[0].parsedJson.id;
    }
    this.bankId = bankId;
    return this.bankId;
  }
  async getFields(dbId) {
    const result = await this.suiClient.getObject({
      id: dbId,
      // normalized id
      options: {
        "showType": true,
        "showOwner": true,
        "showPreviousTransaction": true,
        "showDisplay": false,
        "showContent": true,
        "showBcs": false,
        "showStorageRebate": true
      }
    });
    let patches = [];
    let walrus = null;
    let owner = null;
    if (result?.data?.content) {
      const fields = result.data.content.fields;
      if (fields && fields.id && fields.id.id) {
        patches = fields.patches;
      }
      if (fields && fields.walrus) {
        walrus = fields.walrus;
      }
      if (result.data.owner) {
        owner = result.data.owner;
      }
    }
    return {
      patches,
      walrus,
      owner
    };
  }
  async getFull(walrusBlobId) {
    return await this.walrus?.read(walrusBlobId);
  }
  async saveFull(dbId, full) {
    const packageId = await this.getPackageId();
    if (!packageId || !this.suiClient || !this.walrus) {
      throw new Error("no packageId or no signer or no walrus");
    }
    const blobId = await this.walrus.write(full);
    if (!blobId) {
      throw new Error("can not write blob to walrus");
    }
    const tx = new import_transactions.Transaction();
    const target = "" + packageId + "::suisql::clamp_with_walrus";
    const args = [
      tx.object(dbId),
      tx.pure(import_bcs.bcs.string().serialize(blobId))
    ];
    tx.moveCall({
      target,
      arguments: args,
      typeArguments: []
    });
    try {
      const txResults = await this.executeTx(tx);
      return true;
    } catch (e) {
      import_SuiSqlLog.default.log("executing tx to saveFull failed", e);
      return false;
    }
  }
  async savePatch(dbId, patch) {
    const packageId = await this.getPackageId();
    if (!packageId || !this.suiClient) {
      throw new Error("no packageId or no signer");
    }
    const tx = new import_transactions.Transaction();
    const target = "" + packageId + "::suisql::patch";
    const args = [
      tx.object(dbId),
      tx.pure(import_bcs.bcs.vector(import_bcs.bcs.u8()).serialize(patch))
    ];
    tx.moveCall({
      target,
      arguments: args,
      typeArguments: []
    });
    try {
      const txResults = await this.executeTx(tx);
      return true;
    } catch (e) {
      console.error("savePatch error", e);
      return false;
    }
  }
  async getDbId(name) {
    const packageId = await this.getPackageId();
    const bankId = await this.getBankId();
    if (!packageId || !bankId || !this.suiClient) {
      throw new Error("no bankId or packageId");
    }
    const tx = new import_transactions.Transaction();
    const target = "" + packageId + "::suisql::find_db_by_name";
    const input = new TextEncoder().encode(name);
    const args = [
      tx.object(bankId),
      tx.pure(import_bcs.bcs.vector(import_bcs.bcs.u8()).serialize(input))
    ];
    tx.moveCall({
      target,
      arguments: args,
      typeArguments: []
    });
    const sender = "0x0000000000000000000000000000000000000000000000000000000000000000";
    tx.setSenderIfNotSet(sender);
    const sims = await this.suiClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender
    });
    let foundDbId = null;
    if (sims && sims.events && sims.events.length) {
      for (const event of sims.events) {
        if (event && event.type && event.type.indexOf("RemindDBEvent") !== -1) {
          foundDbId = event.parsedJson.id;
        }
      }
    }
    return foundDbId;
  }
  async makeDb(name) {
    const packageId = await this.getPackageId();
    const bankId = await this.getBankId();
    if (!packageId || !bankId || !this.suiClient) {
      throw new Error("no bankId or packageId or no signer");
    }
    const tx = new import_transactions.Transaction();
    const target = "" + packageId + "::suisql::db";
    const input = new TextEncoder().encode(name);
    const args = [
      tx.object(bankId),
      tx.pure(import_bcs.bcs.vector(import_bcs.bcs.u8()).serialize(input))
    ];
    tx.moveCall({
      target,
      arguments: args,
      typeArguments: []
    });
    let createdDbId = null;
    const txResults = await this.executeTx(tx);
    if (txResults && txResults.events && txResults.events.length) {
      for (const event of txResults.events) {
        if (event && event.type && event.type.indexOf("NewDBEvent") !== -1) {
          createdDbId = event.parsedJson.id;
        }
      }
    }
    if (!createdDbId) {
      throw new Error("can not create suiSql db");
    }
    return createdDbId;
  }
  async executeTx(tx) {
    if (!this.suiClient) {
      throw new Error("no suiClient");
    }
    let digest = null;
    if (this.signAndExecuteTransaction) {
      digest = await this.signAndExecuteTransaction(tx);
    } else if (this.signer) {
      tx.setSenderIfNotSet(this.signer.toSuiAddress());
      const transactionBytes = await tx.build({ client: this.suiClient });
      const result = await this.suiClient.signAndExecuteTransaction({
        signer: this.signer,
        transaction: transactionBytes,
        requestType: "WaitForLocalExecution"
      });
      if (result && result.digest) {
        digest = result.digest;
      }
    } else {
      throw new Error("either signer or signAndExecuteTransaction function required");
    }
    if (digest) {
      const finalResults = await this.suiClient.getTransactionBlock({
        digest,
        options: {
          showEffects: true,
          showEvents: true
        }
      });
      return finalResults;
    }
    return null;
  }
}
//# sourceMappingURL=SuiSqlBlockchain.js.map
