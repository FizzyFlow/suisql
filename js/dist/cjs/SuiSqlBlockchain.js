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
var import_graphql = require("@mysten/sui/graphql");
var import_SuiSqlConsts = require("./SuiSqlConsts.js");
var import_transactions = require("@mysten/sui/transactions");
var import_bcs = require("@mysten/sui/bcs");
var import_utils = require("@mysten/sui/utils");
var import_SuiSqlLog = __toESM(require("./SuiSqlLog.js"));
class SuiSqlBlockchain {
  constructor(params) {
    __publicField(this, "suiClient");
    __publicField(this, "signer");
    __publicField(this, "currentWalletAddress");
    __publicField(this, "signAndExecuteTransaction");
    __publicField(this, "network", "local");
    __publicField(this, "forcedPackageId");
    __publicField(this, "bankId");
    __publicField(this, "__walCoinType");
    this.suiClient = params.suiClient;
    this.signer = params.signer;
    this.currentWalletAddress = params.currentWalletAddress;
    if (params.signAndExecuteTransaction) {
      this.signAndExecuteTransaction = params.signAndExecuteTransaction;
    }
    if (params.network) {
      this.network = params.network;
    }
  }
  getGraphQLClient() {
    const urls = {
      mainnet: "https://sui-mainnet.mystenlabs.com/graphql",
      testnet: "https://sui-testnet.mystenlabs.com/graphql",
      devnet: "https://sui-devnet.mystenlabs.com/graphql"
    };
    const url = urls[this.network] ?? "http://127.0.0.1:9125";
    return new import_graphql.SuiGraphQLClient({ url, network: this.network });
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
  getOriginalPackageId() {
    if (this.forcedPackageId) {
      return this.forcedPackageId;
    }
    if (import_SuiSqlConsts.originalPackages[this.network]) {
      return import_SuiSqlConsts.originalPackages[this.network];
    }
    return null;
  }
  async getWriteCapId(dbId) {
    if (!this.suiClient) {
      throw new Error("suiClient required");
    }
    const originalPackageId = await this.getOriginalPackageId();
    if (!originalPackageId) {
      throw new Error("no originalPackageId to get write cap");
    }
    const currentAddress = this.getCurrentAddress();
    if (!currentAddress) {
      return null;
    }
    const client = this.suiClient;
    let writeCapId = null;
    let cursor = void 0;
    while (true) {
      const result = await client.listOwnedObjects({
        owner: currentAddress,
        type: originalPackageId + "::suisql::WriteCap",
        include: {
          json: true
        },
        cursor
      });
      for (const obj of result.objects) {
        if (obj?.json?.sui_sql_db_id == dbId) {
          writeCapId = obj?.objectId;
          break;
        }
      }
      cursor = result.cursor;
      if (writeCapId || !result.hasNextPage || !cursor) {
        break;
      }
    }
    return writeCapId;
  }
  async getBankId() {
    if (this.bankId) {
      return this.bankId;
    }
    const packageId = await this.getPackageId();
    if (!packageId) {
      throw new Error("can not find bank if do not know the package");
    }
    if (import_SuiSqlConsts.bankIds[this.network]) {
      this.bankId = import_SuiSqlConsts.bankIds[this.network];
      return this.bankId;
    }
    if (!this.suiClient) {
      throw new Error("suiClient required");
    }
    let bankId = null;
    const resp = await this.getGraphQLClient().query({
      query: `{
                events(filter: { eventType: "${packageId}::suisql_events::NewBankEvent" }) {
                    nodes { contents { json } }
                }
            }`,
      variables: {}
    });
    const firstEvent = resp.data?.events?.nodes?.[0];
    if (firstEvent) {
      bankId = firstEvent?.contents?.json?.id ?? null;
    }
    this.bankId = bankId;
    return this.bankId;
  }
  async getFields(dbId) {
    if (!this.suiClient) {
      throw new Error("suiClient required");
    }
    const result = await this.suiClient.getObject({
      objectId: dbId,
      include: { json: true }
    });
    let patches = [];
    let walrusBlobId = null;
    let walrusEndEpoch = null;
    let walrusStorageSize = null;
    let expectedWalrusBlobId = null;
    let owner = null;
    let name = null;
    console.log("[getFields] raw result.object:", JSON.stringify(result?.object, null, 2));
    if (result?.object?.json) {
      const fields = result.object.json;
      console.log("[getFields] fields.patches raw:", JSON.stringify(fields.patches));
      console.log("[getFields] fields.id:", JSON.stringify(fields.id));
      if (fields.id) {
        patches = (fields.patches ?? []).map((p) => (0, import_utils.fromBase64)(p));
      }
      console.log("[getFields] decoded patches count:", patches.length, "sizes:", patches.map((p) => p.length));
      if (fields.walrus_blob_id) {
        walrusBlobId = fields.walrus_blob_id;
      }
      if (fields.expected_walrus_blob_id) {
        expectedWalrusBlobId = fields.expected_walrus_blob_id;
      }
      if (fields.walrus_blob?.storage) {
        walrusEndEpoch = parseInt("" + fields.walrus_blob.storage.end_epoch);
        walrusStorageSize = parseInt("" + fields.walrus_blob.storage.storage_size);
      }
      if (fields.name) {
        name = fields.name;
      }
      if (result.object.owner) {
        owner = result.object.owner;
      }
    }
    return {
      patches,
      walrusBlobId,
      walrusEndEpoch,
      walrusStorageSize,
      expectedWalrusBlobId,
      owner,
      name
    };
  }
  // async getFull(walrusBlobId: string) {
  //     return await this.walrus?.read(walrusBlobId);
  // }
  // async saveFull(dbId: string, full: Uint8Array) {
  //     const packageId = await this.getPackageId();
  //     if (!packageId || !this.suiClient || !this.walrus) {
  //         throw new Error('no packageId or no signer or no walrus');
  //     }
  //     const blobId = await this.walrus.write(full);
  //     if (!blobId) {
  //         throw new Error('can not write blob to walrus');
  //     }
  //     const tx = new Transaction();
  //     const target = ''+packageId+'::suisql::clamp_with_walrus';
  //     const args = [
  //         tx.object(dbId),
  //         tx.pure(bcs.string().serialize(blobId)),
  //     ];
  //     tx.moveCall({ 
  //             target, 
  //             arguments: args, 
  //             typeArguments: [], 
  //         });
  //     try {
  //         const txResults = await this.executeTx(tx);
  //         return true;
  //     } catch (e) {
  //         SuiSqlLog.log('executing tx to saveFull failed', e);
  //         return false;
  //     }
  //     // tx.setSenderIfNotSet(this.signer.toSuiAddress());
  //     // const transactionBytes = await tx.build({ client: this.suiClient });
  //     // const result = await this.suiClient.signAndExecuteTransaction({ 
  //     //         signer: this.signer, 
  //     //         transaction: transactionBytes,
  //     //     });
  //     // if (result && result.digest) {
  //     //     try {
  //     //         await this.suiClient.waitForTransaction({
  //     //             digest: result.digest,
  //     //         });
  //     //         return true;
  //     //     } catch (_) {
  //     //         return false;
  //     //     }
  //     // }
  //     // return false;
  // }
  async getWalCoinType() {
    if (this.__walCoinType) {
      return this.__walCoinType;
    }
    const packageId = await this.getPackageId();
    if (!packageId || !this.suiClient) {
      throw new Error("no packageId or no signer");
    }
    const { function: normalized } = await this.suiClient.getMoveFunction({
      packageId,
      moduleName: "suisql",
      name: "extend_walrus"
    });
    let walCoinType = null;
    if (normalized && normalized.parameters && normalized.parameters.length > 3) {
      const param = normalized.parameters[3];
      const typeArg = param.body.$kind === "datatype" ? param.body.datatype.typeParameters[0] : void 0;
      if (typeArg && typeArg.$kind === "datatype") {
        walCoinType = typeArg.datatype.typeName;
      }
    }
    if (!walCoinType) {
      throw new Error("can not get walCoinType from extend_walrus method signature");
    }
    this.__walCoinType = walCoinType;
    return walCoinType;
  }
  async getWalCoinForTx(tx, amount) {
    const packageId = await this.getPackageId();
    if (!packageId || !this.suiClient) {
      throw new Error("no packageId or no signer");
    }
    const currentAddress = this.getCurrentAddress();
    if (!currentAddress) {
      throw new Error("no current wallet address");
    }
    const walCoinType = await this.getWalCoinType();
    const walCoin = await this.coinOfAmountToTxCoin(tx, currentAddress, walCoinType, amount, true);
    return walCoin;
  }
  async extendWalrus(dbId, walrusSystemAddress, extendedEpochs, totalPrice) {
    const packageId = await this.getPackageId();
    if (!packageId || !this.suiClient) {
      throw new Error("no packageId or no signer");
    }
    const currentAddress = this.getCurrentAddress();
    if (!currentAddress) {
      throw new Error("no current wallet address");
    }
    const tx = new import_transactions.Transaction();
    const target = "" + packageId + "::suisql::extend_walrus";
    const walCoinType = await this.getWalCoinType();
    if (!walCoinType) {
      throw new Error("can not get walCoinType from extend_walrus method signature");
    }
    const walCoin = await this.coinOfAmountToTxCoin(tx, currentAddress, walCoinType, totalPrice || BigInt(1e9), true);
    const args = [
      tx.object(dbId),
      tx.object(walrusSystemAddress),
      tx.pure(import_bcs.bcs.u32().serialize(extendedEpochs)),
      walCoin
    ];
    tx.moveCall({
      target,
      arguments: args,
      typeArguments: []
    });
    tx.transferObjects([walCoin], currentAddress);
    try {
      const txResults = await this.executeTx(tx);
      const txEvents = txResults?.Transaction?.events ?? txResults?.FailedTransaction?.events;
      if (txEvents && txEvents.length) {
        for (const event of txEvents) {
          if (event && event.eventType && event.eventType.indexOf("BlobCertified") !== -1) {
            const updatedEndEpoch = event.json.end_epoch;
            if (updatedEndEpoch) {
              return parseInt("" + updatedEndEpoch);
            }
          }
        }
      }
      return true;
    } catch (e) {
      console.error("fillExpectedWalrus error", e);
      return false;
    }
  }
  async clampWithWalrus(dbId, blobAddress, walrusSystemAddress) {
    import_SuiSqlLog.default.log("Clamping DB with Walrus blob", dbId, blobAddress);
    const packageId = await this.getPackageId();
    if (!packageId || !this.suiClient) {
      throw new Error("no packageId or no signer");
    }
    const writeCapId = await this.getWriteCapId(dbId);
    if (!writeCapId) {
      throw new Error("no writeCapId");
    }
    const tx = new import_transactions.Transaction();
    const target = "" + packageId + "::suisql::clamp_with_walrus";
    const args = [
      tx.object(dbId),
      tx.object(writeCapId),
      tx.object(walrusSystemAddress),
      tx.object(blobAddress)
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
      console.error("clampWithWalrus error", e);
      return false;
    }
  }
  async fillExpectedWalrus(dbId, blobAddress, walrusSystemAddress) {
    const packageId = await this.getPackageId();
    if (!packageId || !this.suiClient) {
      throw new Error("no packageId or no signer");
    }
    const tx = new import_transactions.Transaction();
    const target = "" + packageId + "::suisql::fill_expected_walrus";
    const args = [
      tx.object(dbId),
      tx.object(walrusSystemAddress),
      tx.object(blobAddress)
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
      console.error("fillExpectedWalrus error", e);
      return false;
    }
  }
  async savePatch(dbId, patch, expectedWalrusBlobId) {
    const packageId = await this.getPackageId();
    if (!packageId || !this.suiClient) {
      throw new Error("no packageId or no signer");
    }
    const writeCapId = await this.getWriteCapId(dbId);
    if (!writeCapId) {
      throw new Error("no writeCapId");
    }
    const tx = new import_transactions.Transaction();
    const target = "" + packageId + "::suisql::patch" + (expectedWalrusBlobId ? "_and_expect_walrus" : "");
    const args = [
      tx.object(dbId),
      tx.object(writeCapId),
      tx.pure(import_bcs.bcs.vector(import_bcs.bcs.u8()).serialize(patch))
    ];
    if (expectedWalrusBlobId) {
      args.push(tx.pure(import_bcs.bcs.u256().serialize(expectedWalrusBlobId)));
    }
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
    const sims = await this.suiClient.simulateTransaction({
      transaction: tx,
      include: { events: true },
      checksEnabled: false
    });
    let foundDbId = null;
    const events = sims.Transaction?.events ?? sims.FailedTransaction?.events;
    if (events && events.length) {
      for (const event of events) {
        if (event && event.eventType && event.eventType.indexOf("RemindDBEvent") !== -1) {
          foundDbId = event.json.id;
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
    const txEvents = txResults?.Transaction?.events ?? txResults?.FailedTransaction?.events;
    if (txEvents && txEvents.length) {
      for (const event of txEvents) {
        if (event && event.eventType && event.eventType.indexOf("NewDBEvent") !== -1) {
          createdDbId = event.json.id;
        }
      }
    }
    if (!createdDbId) {
      throw new Error("can not create suiSql db");
    }
    return createdDbId;
  }
  async listDatabases(callback) {
    const packageId = await this.getPackageId();
    const bankId = await this.getBankId();
    console.log(bankId);
    if (!packageId || !bankId || !this.suiClient) {
      throw new Error("no bankId or packageId or no suiClient");
    }
    const bankObj = await this.suiClient.getObject({
      objectId: bankId,
      include: { json: true }
    });
    const rawMap = bankObj.object?.json?.map;
    const mapId = typeof rawMap?.id === "string" ? rawMap.id : rawMap?.id?.id;
    console.log(mapId);
    let cursor = null;
    let hasNextPage = false;
    const ret = [];
    do {
      const page = await this.suiClient.listDynamicFields({
        parentId: mapId,
        cursor
      });
      const thisRunRet = [];
      for (const obj of page.dynamicFields) {
        const name = import_bcs.bcs.string().parse(obj.name.bcs);
        ret.push(name);
        thisRunRet.push(name);
      }
      if (callback) {
        await callback(thisRunRet);
      }
      hasNextPage = page.hasNextPage;
      cursor = page.cursor;
    } while (hasNextPage);
    return ret;
  }
  getCurrentAddress() {
    if (!this.suiClient) {
      throw new Error("no suiClient");
    }
    if (this.signer) {
      return this.signer.toSuiAddress();
    }
    if (this.currentWalletAddress) {
      return this.currentWalletAddress;
    }
    return null;
  }
  async executeTx(tx) {
    if (!this.suiClient) {
      throw new Error("no suiClient");
    }
    import_SuiSqlLog.default.log("Executing tx on sui", tx);
    let digest = null;
    if (this.signAndExecuteTransaction) {
      digest = await this.signAndExecuteTransaction(tx);
    } else if (this.signer) {
      tx.setSenderIfNotSet(this.signer.toSuiAddress());
      const transactionBytes = await tx.build({ client: this.suiClient });
      const { signature } = await this.signer.signTransaction(transactionBytes);
      const result = await this.suiClient.executeTransaction({
        transaction: transactionBytes,
        signatures: [signature]
      });
      digest = result.Transaction?.digest ?? result.FailedTransaction?.digest ?? null;
    } else {
      throw new Error("either signer or signAndExecuteTransaction function required");
    }
    import_SuiSqlLog.default.log("Executing tx on sui. Digest: ", digest);
    if (digest) {
      const finalResults = await this.suiClient.waitForTransaction({
        digest,
        include: { effects: true, events: true }
      });
      import_SuiSqlLog.default.log("Executing tx on sui. Results: ", finalResults);
      return finalResults;
    }
    return null;
  }
  async executeRegisterBlobTransaction(tx) {
    if (!this.suiClient) {
      throw new Error("no suiClient");
    }
    const results = await this.executeTx(tx);
    const txEffects = results?.Transaction?.effects ?? results?.FailedTransaction?.effects;
    if (txEffects) {
      const effects = txEffects;
      const createdObjectIds = [];
      for (const rec of effects.created) {
        if (rec?.reference?.objectId) {
          createdObjectIds.push(rec.reference.objectId);
        }
      }
      const { objects: allObjects } = await this.suiClient.getObjects({ objectIds: createdObjectIds });
      for (const object of allObjects) {
        if (!(object instanceof Error) && object.type.indexOf("::blob::Blob") !== -1) {
          return object.objectId;
        }
      }
    }
    return null;
  }
  async coinOfAmountToTxCoin(tx, owner, coinType, amount, addEmptyCoins = false) {
    import_SuiSqlLog.default.log("composing coin of amount", coinType, amount);
    const expectedAmountAsBigInt = BigInt(amount);
    const coinIds = await this.coinObjectsEnoughForAmount(owner, coinType, expectedAmountAsBigInt, addEmptyCoins);
    if (!coinIds || !coinIds.length) {
      throw new Error("Owner: " + owner + " does not have enough coins of needed type: " + coinType);
    }
    import_SuiSqlLog.default.log("composing coin objects, count", coinIds.length);
    if (coinIds.length == 1) {
      if (coinType.indexOf("::sui::SUI") !== -1) {
        const coinInput = tx.add(import_transactions.TransactionCommands.SplitCoins(tx.gas, [tx.pure.u64(expectedAmountAsBigInt)]));
        return coinInput;
      } else {
        const coinInput = tx.add(import_transactions.TransactionCommands.SplitCoins(tx.object(coinIds[0]), [tx.pure.u64(expectedAmountAsBigInt)]));
        return coinInput;
      }
    } else {
      const coinIdToMergeIn = coinIds.shift();
      if (coinIdToMergeIn) {
        tx.add(import_transactions.TransactionCommands.MergeCoins(tx.object(coinIdToMergeIn), coinIds.map((id) => {
          return tx.object(id);
        })));
        const coinInputSplet = tx.add(import_transactions.TransactionCommands.SplitCoins(tx.object(coinIdToMergeIn), [tx.pure.u64(expectedAmountAsBigInt)]));
        return coinInputSplet;
      }
    }
    throw new Error("should not happen");
  }
  async coinObjectsEnoughForAmount(owner, coinType, expectedAmount, addEmptyCoins = false) {
    if (!this.suiClient) {
      throw new Error("suiClient required");
    }
    const expectedAmountAsBigInt = BigInt(expectedAmount);
    const coinIds = [];
    const coins = [];
    let result = null;
    let cursor = null;
    do {
      result = await this.suiClient.listCoins({
        owner,
        coinType,
        limit: 50,
        cursor
      });
      coins.push(...result.objects);
      cursor = result.cursor;
    } while (result.hasNextPage);
    coins.sort((a, b) => {
      return Number(b.balance) - Number(a.balance);
    });
    let totalAmount = BigInt(0);
    for (const coin of coins) {
      if (totalAmount <= expectedAmountAsBigInt) {
        coinIds.push(coin.objectId);
        totalAmount = totalAmount + BigInt(coin.balance);
      } else {
        if (addEmptyCoins && BigInt(coin.balance) == 0n) {
          coinIds.push(coin.objectId);
        }
      }
    }
    if (totalAmount >= expectedAmountAsBigInt) {
      return coinIds;
    }
    return null;
  }
}
//# sourceMappingURL=SuiSqlBlockchain.js.map
