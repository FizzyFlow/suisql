import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { packages } from "./SuiSqlConsts";

import { Transaction } from "@mysten/sui/transactions";
import { bcs } from '@mysten/sui/bcs';

import SuiSqlWalrus from './SuiSqlWalrus.js';

import SuiSqlLog from './SuiSqlLog';

/**
 * Should accept Transaction as parameter and return executed transaction digest
 */
export type CustomSignAndExecuteTransactionFunction =
  (tx: Transaction) => Promise<string>;

type SuiSqlBlockchainParams = {
    suiClient: SuiClient,
    walrusSuiClient?: SuiClient,
    signer?: Signer,
    network?: string,
    signAndExecuteTransaction?: CustomSignAndExecuteTransactionFunction,
};

export type SuiSqlOwnerType = {
    AddressOwner?: string;
    ObjectOwner?: string;
    Shared?: any,
    Immutable?: boolean,
};

export default class SuiSqlBlockchain {
    private suiClient?: SuiClient;
    private signer?: Signer;
    private signAndExecuteTransaction?: CustomSignAndExecuteTransactionFunction;

    private network: string = 'local';
    private forcedPackageId?: string;
    private bankId?: string;

    private walrus?: SuiSqlWalrus;

    constructor(params: SuiSqlBlockchainParams) {
        this.suiClient = params.suiClient;
        this.signer = params.signer;


        if (params.signAndExecuteTransaction) {
            this.signAndExecuteTransaction = params.signAndExecuteTransaction;
        }

        if (params.network) {
            this.network = params.network;
        }

        this.walrus = new SuiSqlWalrus({
            suiClient: (params.walrusSuiClient ? params.walrusSuiClient : this.suiClient),
            signer: this.signer,
        })
    }


    setPackageId(packageId: string) {
        this.forcedPackageId = packageId;
        delete this.bankId;
    }

    getPackageId(): string | null {
        if (this.forcedPackageId) {
            return this.forcedPackageId;
        }

        if ( (packages as any)[this.network] ) {
            return (packages as any)[this.network];
        }

        return null;
    }

    async getBankId() {
        if (this.bankId) {
            return this.bankId;
        }

        const packageId = await this.getPackageId();
        if (!packageId) {
            throw new Error('can not find bank if do not know the package');
        }
        if (!this.suiClient) {
            throw new Error('suiClient required');
        }

        let bankId = null;
        // find bankId from the event
        const resp = await this.suiClient.queryEvents({
                query: {"MoveEventType": ""+packageId+"::events::NewBankEvent"},
            });

        if (resp && resp.data && resp.data[0] && resp.data[0].parsedJson) {
            bankId = (resp.data[0].parsedJson as any).id;
        }

        this.bankId = bankId;
        return this.bankId;
    }

    async getFields(dbId: string) {
        // const packageId = await this.getPackageId();

        const result = await (this.suiClient as SuiClient).getObject({
            id: dbId, // normalized id
            options: {
                "showType": true,
                "showOwner": true,
                "showPreviousTransaction": true,
                "showDisplay": false,
                "showContent": true,
                "showBcs": false,
                "showStorageRebate": true
            },
        });

        let patches = [];
        let walrus = null;
        let owner = null;
        if (result?.data?.content) {
            const fields = (result.data.content as any).fields;
            if (fields && fields.id && fields.id.id) {
                patches = fields.patches;
            }
            if (fields && fields.walrus) {
                walrus = fields.walrus;
            }

            if (result.data.owner) {
                owner = (result.data.owner as SuiSqlOwnerType);
            }
        }

        return {
            patches,
            walrus,
            owner, 
        };
    }

    async getFull(walrusBlobId: string) {
        return await this.walrus?.read(walrusBlobId);
    }

    async saveFull(dbId: string, full: Uint8Array) {
        const packageId = await this.getPackageId();

        if (!packageId || !this.suiClient || !this.walrus) {
            throw new Error('no packageId or no signer or no walrus');
        }
        
        const blobId = await this.walrus.write(full);

        if (!blobId) {
            throw new Error('can not write blob to walrus');
        }

        const tx = new Transaction();
        const target = ''+packageId+'::suisql::clamp_with_walrus';

        const args = [
            tx.object(dbId),
            tx.pure(bcs.string().serialize(blobId)),
        ];
        tx.moveCall({ 
                target, 
                arguments: args, 
                typeArguments: [], 
            });

        try {
            const txResults = await this.executeTx(tx);
            return true;
        } catch (e) {
            SuiSqlLog.log('executing tx to saveFull failed', e);
            return false;
        }

        // tx.setSenderIfNotSet(this.signer.toSuiAddress());
        // const transactionBytes = await tx.build({ client: this.suiClient });

        // const result = await this.suiClient.signAndExecuteTransaction({ 
        //         signer: this.signer, 
        //         transaction: transactionBytes,
        //     });
        // if (result && result.digest) {
        //     try {
        //         await this.suiClient.waitForTransaction({
        //             digest: result.digest,
        //         });

        //         return true;
        //     } catch (_) {
        //         return false;
        //     }
        // }
        // return false;
    }

    async savePatch(dbId: string, patch: Uint8Array) {
        const packageId = await this.getPackageId();

        if (!packageId || !this.suiClient) {
            throw new Error('no packageId or no signer');
        }

        const tx = new Transaction();
        const target = ''+packageId+'::suisql::patch';

        const args = [
            tx.object(dbId),
            tx.pure(bcs.vector(bcs.u8()).serialize(patch)),
        ];

        tx.moveCall({ 
                target, 
                arguments: args, 
                typeArguments: [], 
            });

        // tx.setSenderIfNotSet(this.signer.toSuiAddress());
        // const transactionBytes = await tx.build({ client: this.suiClient });

        try {
            const txResults = await this.executeTx(tx);
            return true;
        } catch (e) {
            console.error('savePatch error', e);
            return false;
        }

        // const result = await this.suiClient.signAndExecuteTransaction({ 
        //         signer: this.signer, 
        //         transaction: tx,
        //     });
        // if (result && result.digest) {
        //     try {
        //         await this.suiClient.waitForTransaction({
        //             digest: result.digest,
        //         });

        //         return true;
        //     } catch (_) {
        //         return false;
        //     }
        // }
        // return false;
    }

    async getDbId(name: string) {
        const packageId = await this.getPackageId();
        const bankId = await this.getBankId();

        if (!packageId || !bankId || !this.suiClient) {
            throw new Error('no bankId or packageId');
        }

        const tx = new Transaction();
        const target = ''+packageId+'::suisql::find_db_by_name';
        const input = (new TextEncoder()).encode( name );

        const args = [
            tx.object(bankId),
            tx.pure(bcs.vector(bcs.u8()).serialize(input)),
        ];

        tx.moveCall({ 
                target, 
                arguments: args, 
                typeArguments: [], 
            });

        const sender = '0x0000000000000000000000000000000000000000000000000000000000000000';
        tx.setSenderIfNotSet( sender);
        const sims = await this.suiClient.devInspectTransactionBlock({
                transactionBlock: tx,
                sender,
            });

        let foundDbId = null;
        if (sims && sims.events && sims.events.length) {
            for (const event of sims.events) {
                if (event && event.type && event.type.indexOf('RemindDBEvent') !== -1) {
                    foundDbId = (event.parsedJson as any).id;
                }
            }
            
        }

        return foundDbId;
    }

    async makeDb(name: string) {
        const packageId = await this.getPackageId();
        const bankId = await this.getBankId();

        if (!packageId || !bankId || !this.suiClient) {
            throw new Error('no bankId or packageId or no signer');
        }

        const tx = new Transaction();
        const target = ''+packageId+'::suisql::db';
        const input = (new TextEncoder()).encode( name );

        const args = [
            tx.object(bankId),
            tx.pure(bcs.vector(bcs.u8()).serialize(input)),
        ];

        tx.moveCall({ 
                target, 
                arguments: args, 
                typeArguments: [], 
            });

        // tx.setSenderIfNotSet(this.signer.toSuiAddress());
        // const transactionBytes = await tx.build({ client: this.suiClient });

        let createdDbId = null;

        const txResults = await this.executeTx(tx);

        // const result = await this.suiClient.signAndExecuteTransaction({ 
        //     signer: this.signer, 
        //     transaction: transactionBytes,
        // });

        // if (result && result.digest) {
        //     const finalResults = await this.suiClient.waitForTransaction({
        //         digest: result.digest,
        //         options: {
        //             showEffects: true,
        //             showEvents: true,
        //         },
        //     });

        if (txResults && txResults.events && txResults.events.length) {
            for (const event of txResults.events) {
                if (event && event.type && event.type.indexOf('NewDBEvent') !== -1) {
                    createdDbId = (event.parsedJson as any).id;
                }
            }
        }

        // } 
        
        if (!createdDbId) {
            throw new Error('can not create suiSql db');
        }

        return createdDbId;
    }

    async executeTx(tx: Transaction) {
        if (!this.suiClient) {
            throw new Error('no suiClient');
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
                requestType: 'WaitForLocalExecution',
            });

            if (result && result.digest) {
                digest = result.digest;
            }
        } else {
            throw new Error('either signer or signAndExecuteTransaction function required');
        }


        if (digest) {
            const finalResults = await this.suiClient.getTransactionBlock({
                digest: digest,
                options: {
                    showEffects: true,
                    showEvents: true,
                },
            });

            return finalResults;
        }

        return null;
    }
}