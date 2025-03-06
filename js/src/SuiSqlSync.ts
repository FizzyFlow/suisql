import type SuiSql from "./SuiSql";
import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from '@mysten/sui/bcs';

import { compress, decompress } from "./SuiSqlUtils";

type SuiSqlSyncParams = {
    suiSql: SuiSql,
    id?: string,
    suiClient?: SuiClient,
    signer?: Signer,
};

export default class SuiSqlSync {
    public id?: string;
    private suiSql: SuiSql;
    private suiClient?: SuiClient;
    private signer?: Signer;
    private syncedAt: number | null = null;

    private packageId?: string;

    constructor(params: SuiSqlSyncParams) {
        this.suiSql = params.suiSql;

        if (params.suiClient) {
            this.suiClient = params.suiClient;
        }
        if (params.id) {
            this.id = params.id;
        }
        if (params.signer) {
            this.signer = params.signer;
        }
    }

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
        if (!this.suiClient || !this.id) {
            return false;
        }
        const result = await this.suiClient.getObject({
            id: this.id, // normalized id
            options: {
              showType: true,
              showContent: true,
              showOwner: true,
            },
        });

        if (result?.data?.content) {
            console.log(result.data);
            this.packageId = result.data.type?.split('::')[0];
            console.log( this.packageId );

            const fields = (result.data.content as any).fields;
            if (fields && fields.id && fields.id.id && fields.id.id == this.id) {
                const patches = fields.patches;

                for (const patch of patches) {
                    await this.applyPatch(patch);
                }

                this.syncedAt = Date.now();
                await new Promise((res)=>setTimeout(res, 5)); // small delay to be sure syncedAt is in the past
            }
        }
    }

    async syncToBlockchain() {
        if (!this.id || !this.suiClient) {
            throw new Error('can not sync if do not know id or have no suiClient');
        }
        if (!this.signer) {
            throw new Error('can not sync to blockchain without signer');
        }

        const tx = new Transaction();
        const target = ''+this.packageId+'::suisql::patch';

        const syncedAtBackup = this.syncedAt;

        try {

            const patch = await this.getPatch();
            this.syncedAt = Date.now();
    
            const args = [
                tx.object(this.id),
                tx.pure(bcs.vector(bcs.u8()).serialize(patch)),
            ];
    
            tx.moveCall({ 
                    target, 
                    arguments: args, 
                    typeArguments: [], 
                });
    
            tx.setSenderIfNotSet(this.signer.toSuiAddress());
            const transactionBytes = await tx.build({ client: this.suiClient });
    
            const result = await this.suiClient.signAndExecuteTransaction({ 
                    signer: this.signer, 
                    transaction: transactionBytes,
                });
    
            if (result && result.digest) {
                try {
                    await this.suiClient.waitForTransaction({
                        digest: result.digest,
                    });
    
                    return true;
                } catch (_) {
                    this.syncedAt = syncedAtBackup;
    
                    return false;
                }
            }

        } catch (e) {
            this.syncedAt = syncedAtBackup;

            return false;
        }
    }

    async applyPatch(patch: Uint8Array) {
        const decompressed = await decompress(patch);
        const list = JSON.parse( (new TextDecoder()).decode(decompressed) );

        for (const item of list) {
            console.log(item.sql);
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