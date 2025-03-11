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
    walrusSuiClient?: SuiClient,
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
                walrusSuiClient: params.walrusSuiClient,
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

        if (fields.walrus) {
            // console.error(fields.walrus);
            await this.loadFromWalrus(fields.walrus);
        }

        for (const patch of fields.patches) {
            await this.applyPatch(patch);
        }
        this.syncedAt = Date.now();
        await new Promise((res)=>setTimeout(res, 5)); // small delay to be sure syncedAt is in the past
    }

    async syncToBlockchain(forceWalrus = false) {
        if (!this.id || !this.chain) {
            throw new Error('can not save db without blockchain id');
        }

        const syncedAtBackup = this.syncedAt;

        let success = false;
        if (forceWalrus) {
            const full = await this.getFull();
            this.syncedAt = Date.now();
            success = await this.chain.saveFull(this.id, full);
        } else {
            const patch = await this.getPatch();
            this.syncedAt = Date.now();
            success = await this.chain.savePatch(this.id, patch);
        }


        if (success) {
            return true;
        } else {
            this.syncedAt = syncedAtBackup;

            return false;
        }
    }

    async loadFromWalrus(walrusBlobId: string) {
        const data = await this.chain?.getFull(walrusBlobId);
        console.error('loaded from walrus', data);
        if (data) {
            this.suiSql.replace(data);
        }
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