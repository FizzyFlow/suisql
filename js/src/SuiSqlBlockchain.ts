import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { packages } from "./SuiSqlConsts";

import { Transaction } from "@mysten/sui/transactions";
import { bcs } from '@mysten/sui/bcs';

type SuiSqlParams = {
    suiClient: SuiClient,
    signer?: Signer,
};

export default class SuiSqlBlockchain {
    private suiClient?: SuiClient;
    private signer?: Signer;
    private network: string = 'local';
    private forcedPackageId?: string;
    private bankId?: string;

    constructor(params: SuiSqlParams) {
        this.suiClient = params.suiClient;
        this.signer = params.signer;

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
        const packageId = await this.getPackageId();

        const result = await (this.suiClient as SuiClient).getObject({
            id: dbId, // normalized id
            options: {
              showType: true,
              showContent: true,
              showOwner: true,
            },
        });

        let patches = [];
        if (result?.data?.content) {
            const fields = (result.data.content as any).fields;
            if (fields && fields.id && fields.id.id) {
                patches = fields.patches;
            }
        }

        return {
            patches,
        };
    }

    async savePatch(dbId: string, patch: Uint8Array) {
        const packageId = await this.getPackageId();

        if (!packageId || !this.signer || !this.suiClient) {
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
                return false;
            }
        }
        return false;
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
                    console.log(event);
                    foundDbId = (event.parsedJson as any).id;
                }
            }
            
        }

        return foundDbId;
    }

    async makeDb(name: string) {
        const packageId = await this.getPackageId();
        const bankId = await this.getBankId();

        if (!packageId || !bankId || !this.signer || !this.suiClient) {
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

        tx.setSenderIfNotSet(this.signer.toSuiAddress());
        const transactionBytes = await tx.build({ client: this.suiClient });

        let createdDbId = null;

        const result = await this.suiClient.signAndExecuteTransaction({ 
            signer: this.signer, 
            transaction: transactionBytes,
        });

        if (result && result.digest) {
            const finalResults = await this.suiClient.waitForTransaction({
                digest: result.digest,
                options: {
                    showEffects: true,
                    showEvents: true,
                },
            });

            if (finalResults && finalResults.events && finalResults.events.length) {
                for (const event of finalResults.events) {
                    if (event && event.type && event.type.indexOf('NewDBEvent') !== -1) {
                        console.log(event);
                        createdDbId = (event.parsedJson as any).id;
                    }
                }
            }
        } 
        
        if (!createdDbId) {
            throw new Error('can not submit transaction: '+result);
        }

        console.log(createdDbId);
        return createdDbId;
    }
}