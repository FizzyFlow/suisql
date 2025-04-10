var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { packages } from "./SuiSqlConsts";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
class SuiSqlBlockchain {
  constructor(params) {
    __publicField(this, "suiClient");
    __publicField(this, "signer");
    __publicField(this, "currentWalletAddress");
    __publicField(this, "signAndExecuteTransaction");
    __publicField(this, "network", "local");
    __publicField(this, "forcedPackageId");
    __publicField(this, "bankId");
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
  setPackageId(packageId) {
    this.forcedPackageId = packageId;
    delete this.bankId;
  }
  getPackageId() {
    if (this.forcedPackageId) {
      return this.forcedPackageId;
    }
    if (packages[this.network]) {
      return packages[this.network];
    }
    return null;
  }
  async getWriteCapId(dbId) {
    if (!this.suiClient) {
      throw new Error("suiClient required");
    }
    const packageId = await this.getPackageId();
    if (!packageId) {
      throw new Error("can not find bank if do not know the package");
    }
    const currentAddress = this.getCurrentAddress();
    if (!currentAddress) {
      return null;
    }
    const result = await this.suiClient.getOwnedObjects({
      owner: currentAddress,
      filter: {
        StructType: packageId + "::suisql::WriteCap"
      },
      options: {
        showContent: true
      }
    });
    let writeCapId = null;
    for (const obj of result.data) {
      const fields = (obj?.data?.content).fields;
      if (fields?.sui_sql_db_id == dbId) {
        writeCapId = obj?.data?.objectId;
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
    if (!this.suiClient) {
      throw new Error("suiClient required");
    }
    let bankId = null;
    const resp = await this.suiClient.queryEvents({
      query: { "MoveEventType": "" + packageId + "::suisql_events::NewBankEvent" }
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
  async savePatch(dbId, patch, expectedWalrusBlobId) {
    const packageId = await this.getPackageId();
    if (!packageId || !this.suiClient) {
      throw new Error("no packageId or no signer");
    }
    const writeCapId = await this.getWriteCapId(dbId);
    if (!writeCapId) {
      throw new Error("no writeCapId");
    }
    const tx = new Transaction();
    const target = "" + packageId + "::suisql::patch" + (expectedWalrusBlobId ? "_and_expect_walrus" : "");
    const args = [
      tx.object(dbId),
      tx.object(writeCapId),
      tx.pure(bcs.vector(bcs.u8()).serialize(patch))
    ];
    if (expectedWalrusBlobId) {
      args.push(tx.pure(bcs.u256().serialize(expectedWalrusBlobId)));
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
    const tx = new Transaction();
    const target = "" + packageId + "::suisql::find_db_by_name";
    const input = new TextEncoder().encode(name);
    const args = [
      tx.object(bankId),
      tx.pure(bcs.vector(bcs.u8()).serialize(input))
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
    const tx = new Transaction();
    const target = "" + packageId + "::suisql::db";
    const input = new TextEncoder().encode(name);
    const args = [
      tx.object(bankId),
      tx.pure(bcs.vector(bcs.u8()).serialize(input))
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
export {
  SuiSqlBlockchain as default
};
//# sourceMappingURL=SuiSqlBlockchain.js.map
