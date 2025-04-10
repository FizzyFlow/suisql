import SuiSql from "./SuiSql";
import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import type { SuiSqlOwnerType } from "./SuiSqlBlockchain";

// import { Transaction } from "@mysten/sui/transactions";
// import { bcs } from '@mysten/sui/bcs';

import { compress, decompress, concatUint8Arrays } from "./SuiSqlUtils";
import { maxBinaryArgumentSize, maxMoveObjectSize } from "./SuiSqlConsts";
// import { packages } from "./SuiSqlConsts";

import SuiSqlBlockchain from "./SuiSqlBlockchain";
import { CustomSignAndExecuteTransactionFunction } from "./SuiSqlBlockchain";

import SuiSqlWalrus from "./SuiSqlWalrus";

import SuiSqlLog from './SuiSqlLog';

import type { SuiSqlWalrusWalrusClient } from './SuiSqlWalrus';

type SuiSqlSyncParams = {
    suiSql: SuiSql,
    id?: string,
    name?: string,
    suiClient: SuiClient,
    walrusClient?: SuiSqlWalrusWalrusClient,
    signer?: Signer,
    currentWalletAddress?: string,
    signAndExecuteTransaction?: CustomSignAndExecuteTransactionFunction,
    network?: string, // sui network, walrus network may be different (always testnet for now)

    walrusWasmUrl?: string,      // need it for blobId calculation, if no walrusClient is provided
};

export default class SuiSqlSync {
    public id?: string;
    public name?: string;
    public hasBeenCreated: boolean = false; // true if db was created during this session

    private owner?: SuiSqlOwnerType;

    private suiSql: SuiSql;

    private suiClient: SuiClient;
    
    private syncedAt: number | null = null;

    private patchesTotalSize: number = 0;   // keep track of total size of patches, 
                                            // to be sure we are inside sui object size limit

    public network: string = 'local';

    public chain?: SuiSqlBlockchain;
    public walrus?: SuiSqlWalrus;

    constructor(params: SuiSqlSyncParams) {
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

                network: this.network, 
            });

        if (params.walrusClient) {
            this.walrus = new SuiSqlWalrus({
                walrusClient: params.walrusClient,
                signer: params.signer,
                walrusWasmUrl: params.walrusWasmUrl,
            });
        } else {
            this.walrus = new SuiSqlWalrus({
                network: this.network,
                signer: params.signer,
                walrusWasmUrl: params.walrusWasmUrl,
            });
        }
    }

    get syncedAtDate() {
        if (this.syncedAt === null) {
            return null;
        }

        return new Date( this.syncedAt );
    }

    get ownerAddress() {
        if (this.owner) {
            if (this.owner.AddressOwner) {
                return this.owner.AddressOwner;
            } else if (this.owner.ObjectOwner) {
                return this.owner.ObjectOwner;
            } else if (this.owner.Shared) {
                return 'shared';
            }
        }

        return null;
    }

    unsavedChangesCount() {
        let count = 0;
        this.suiSql.writeExecutions.forEach((execution)=>{
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
                this.hasBeenCreated = true;
                await new Promise((res)=>setTimeout(res, 100)); // 
            }
        }

        const id = (this.id as string);
        const fields = await this.chain.getFields(id);

        if (fields.walrusBlobId) {
            // console.error(fields.walrus);
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
        await new Promise((res)=>setTimeout(res, 5)); // small delay to be sure syncedAt is in the past

        return true;
    }

    async syncToBlockchain(forceWalrus = false) {
        if (!this.id || !this.chain) {
            throw new Error('can not save db without blockchain id');
        }

        const syncedAtBackup = this.syncedAt;

        const sqlPatch = await this.getPatch();
        const binaryPatch = await this.suiSql.getBinaryPatch();

        SuiSqlLog.log('binaryPatch', binaryPatch);

        let selectedPatch = sqlPatch;
        let patchTypeByte = 1;
        if (binaryPatch && binaryPatch.length < sqlPatch.length + 200) {
            selectedPatch = binaryPatch;
            patchTypeByte = 2;
        }

        let walrusShouldBeForced = false;
        if (selectedPatch.length > maxBinaryArgumentSize) {
            // can not pass as pure argument, lets use walrus
            walrusShouldBeForced = true;
        } else if (this.patchesTotalSize + selectedPatch.length > maxMoveObjectSize) {
            // sui object is too large, need to clamp it with walrus blob
            walrusShouldBeForced = true;
        }

        const expectedBlobId = await this.suiSql.getExpectedBlobId();
        SuiSqlLog.log('expectedBlobId', expectedBlobId);
        SuiSqlLog.log('expectedBlobId', expectedBlobId);
        SuiSqlLog.log('expectedBlobId', expectedBlobId);
        SuiSqlLog.log('expectedBlobId', expectedBlobId);

        // const expectedBlobId2 = await this.suiSql.getExpectedBlobId();
        // const expectedBlobId3 = await this.suiSql.getExpectedBlobId();
        // const expectedBlobId4 = await this.suiSql.getExpectedBlobId();
        // SuiSqlLog.log('expectedBlobId', expectedBlobId);

        let success = false;
        if (forceWalrus || walrusShouldBeForced) {
            // const full = await this.getFull();
            // if (full) {
            //     this.syncedAt = Date.now();
            //     success = await this.chain.saveFull(this.id, full);
            // }
        } else {
            SuiSqlLog.log('saving patch', (patchTypeByte == 1 ? 'sql' : 'binary'), 'bytes:', selectedPatch.length);

            this.syncedAt = Date.now();
            success = await this.chain.savePatch(this.id, concatUint8Arrays([new Uint8Array([patchTypeByte]), selectedPatch]), expectedBlobId ? expectedBlobId : undefined);
        }

        console.log('success', success, this.syncedAt);

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
            throw new Error('can not get walrus system object id from walrusClient');
        }

        const id = (this.id as string);
        const fields = await this.chain.getFields(id);

        if (fields.expectedWalrusBlobId) {
            const currentExpectedBlobId = await this.suiSql.getExpectedBlobId();
            if (currentExpectedBlobId == fields.expectedWalrusBlobId) {
                // looks ok
                const full = await this.getFull();
                if (!full) {
                    throw new Error('can not get full db');
                }

                const status = await this.walrus.write(full);
                if (!status) {
                    throw new Error('can not write to walrus');
                }

                const blobObjectId = status.blobObjectId;

                const success = await this.chain.fillExpectedWalrus(id, blobObjectId, systemObjectId);

                return success;

            } else {
                throw new Error('expected walrus blob id does not match current state of the db');
            }
        } else {
            throw new Error('db is not expecting any walrus clamp');
        }    
    }

    async loadFromWalrus(walrusBlobId: string) {
        const data = await this.walrus?.read(walrusBlobId);
        console.error('loaded from walrus', data);
        if (data) {
            this.suiSql.replace(data);
        }
    }

    async applyPatch(patch: Uint8Array) {
        if (!this.suiSql.db) {
            return false;
        }

        // first byte is patch type
        // 1 - pure sql, 2 - binary patch
        const patchType = patch[0];
        const remainingPatch = patch.slice(1);

        SuiSqlLog.log(patch, 'applyPatch', (patchType == 1 ? 'sql' : 'binary'), 'bytes:', remainingPatch.length);

        if (patchType == 1) {
            // pure sql
            const decompressed = await decompress(remainingPatch);
            const list = JSON.parse( (new TextDecoder()).decode(decompressed) );

            for (const item of list) {
                try {
                    this.suiSql.db.run(item.sql);
                } catch (e) {
                    console.error(e);
                }
            }
        } else if (patchType == 2) {
            // binary patch
            const success = await this.suiSql.applyBinaryPatch(remainingPatch);
            SuiSqlLog.log('binary patch applied', success);
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