import type SuiSql from "./SuiSql";
import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
// import { Transaction } from "@mysten/sui/transactions";
// import { bcs } from '@mysten/sui/bcs';

import { compress, decompress } from "./SuiSqlUtils";
// import { packages } from "./SuiSqlConsts";

import SuiSqlBlockchain from "./SuiSqlBlockchain";

type SuiSqlSyncParams = {
    suiSql: SuiSql,
    id?: string,
    name?: string,
    suiClient: SuiClient,
    signer?: Signer,
};

export default class SuiSqlSync {
    public id?: string;
    public name?: string;

    private suiSql: SuiSql;
    private suiClient: SuiClient;
    private signer?: Signer;
    private syncedAt: number | null = null;

    private network: string = 'local';

    public chain?: SuiSqlBlockchain;

    constructor(params: SuiSqlSyncParams) {
        this.suiSql = params.suiSql;
        this.suiClient = params.suiClient;

        if (params.id) {
            this.id = params.id;
        }
        if (params.name) {
            this.name = params.name;
        }
        if (params.signer) {
            this.signer = params.signer;
        }

        this.chain = new SuiSqlBlockchain({
                signer: this.signer,
                suiClient: this.suiClient,
            });
    }

    // getPackageId(): string | null {
    //     if ( (packages as any)[this.network] ) {
    //         return (packages as any)[this.network];
    //     }

    //     return null;
    // }

    // async getBankId() {
    //     const packageId = await this.getPackageId();
    //     if (!packageId) {
    //         throw new Error('can not find bank if do not know the package');
    //     }
    //     if (!this.suiClient) {
    //         throw new Error('suiClient required');
    //     }

    //     // find bankId from the event
    //     const resp = await this.suiClient.queryEvents({
    //             query: {"MoveEventType": ""+packageId+"::events::NewBankEvent"},
    //         });
    //     console.log(resp);
    // }


    /**
     * Returns true if db has changes that should be saved into the blockchain
     */
    hasUnsavedChanges() {
        let has = false;
        const BreakException = {};
        try {
            this.suiSql.writeExecutions.forEach((execution)=>{
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
                await new Promise((res)=>setTimeout(res, 100)); // 
            }
        }

        const id = (this.id as string);
        const fields = await this.chain.getFields(id);
        for (const patch of fields.patches) {
            await this.applyPatch(patch);
        }
        this.syncedAt = Date.now();
        await new Promise((res)=>setTimeout(res, 5)); // small delay to be sure syncedAt is in the past
    }

    async syncToBlockchain() {
        if (!this.id || !this.chain) {
            throw new Error('can not save db without blockchain id');
        }

        const syncedAtBackup = this.syncedAt;
        const patch = await this.getPatch();
        this.syncedAt = Date.now();

        const success = await this.chain.savePatch(this.id, patch);

        if (success) {
            return true;
        } else {
            this.syncedAt = syncedAtBackup;

            return false;
        }


        // if (!this.id || !this.suiClient) {
        //     throw new Error('can not sync if do not know id or have no suiClient');
        // }
        // if (!this.signer) {
        //     throw new Error('can not sync to blockchain without signer');
        // }

        // const tx = new Transaction();
        // const target = ''+this.packageId+'::suisql::patch';

        // const syncedAtBackup = this.syncedAt;

        // try {

        //     const patch = await this.getPatch();
        //     this.syncedAt = Date.now();
    
        //     const args = [
        //         tx.object(this.id),
        //         tx.pure(bcs.vector(bcs.u8()).serialize(patch)),
        //     ];
    
        //     tx.moveCall({ 
        //             target, 
        //             arguments: args, 
        //             typeArguments: [], 
        //         });
    
        //     tx.setSenderIfNotSet(this.signer.toSuiAddress());
        //     const transactionBytes = await tx.build({ client: this.suiClient });
    
        //     const result = await this.suiClient.signAndExecuteTransaction({ 
        //             signer: this.signer, 
        //             transaction: transactionBytes,
        //         });
    
        //     if (result && result.digest) {
        //         try {
        //             await this.suiClient.waitForTransaction({
        //                 digest: result.digest,
        //             });
    
        //             return true;
        //         } catch (_) {
        //             this.syncedAt = syncedAtBackup;
    
        //             return false;
        //         }
        //     }

        // } catch (e) {
        //     this.syncedAt = syncedAtBackup;

        //     return false;
        // }
    }

    async applyPatch(patch: Uint8Array) {
        const decompressed = await decompress(patch);
        const list = JSON.parse( (new TextDecoder()).decode(decompressed) );

        for (const item of list) {
            await this.suiSql.run(item.sql, item.params);
        }
    }

    async getFull() {
        if (!this.suiSql.db) {
            return null;
        }

        return this.suiSql.db.export();
    }

    async getPatch() {
        const executions = this.suiSql.writeExecutions.filter((execution)=>{
                if (this.syncedAt === null || execution.at > this.syncedAt) {
                    return true;
                }
                return false;
            });

        const input = (new TextEncoder()).encode(JSON.stringify(executions));
        const ziped = await compress(input);

        return ziped;
    }

}