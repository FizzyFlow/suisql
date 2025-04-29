import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { packages } from "./SuiSqlConsts";

import { Transaction, Commands } from "@mysten/sui/transactions";
import { bcs } from '@mysten/sui/bcs';

import SuiSqlLog from './SuiSqlLog';

/**
 * Should accept Transaction as parameter and return executed transaction digest
 */
export type CustomSignAndExecuteTransactionFunction =
  (tx: Transaction) => Promise<string>;

type SuiSqlBlockchainParams = {
    suiClient: SuiClient,

    signer?: Signer,

    signAndExecuteTransaction?: CustomSignAndExecuteTransactionFunction,
    currentWalletAddress?: string,

    network?: string,
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

    private currentWalletAddress?: string;
    private signAndExecuteTransaction?: CustomSignAndExecuteTransactionFunction;

    private network: string = 'local';
    private forcedPackageId?: string;
    private bankId?: string;

    constructor(params: SuiSqlBlockchainParams) {
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


    async getWriteCapId(dbId: string) {
        if (!this.suiClient) {
            throw new Error('suiClient required');
        }
        const packageId = await this.getPackageId();
        if (!packageId) {
            throw new Error('can not find bank if do not know the package');
        }

        const currentAddress = this.getCurrentAddress();
        if (!currentAddress) {
            return null;
        }

        const result = await this.suiClient.getOwnedObjects({
            owner: currentAddress,
            filter: {
                StructType: (packageId + '::suisql::WriteCap'),
            },
            options: {
                showContent: true,
            },
        });

        // @todo: handle pagination
        let writeCapId = null;
        for (const obj of result.data) {
            const fields = (obj?.data?.content as any).fields;
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
            throw new Error('can not find bank if do not know the package');
        }
        if (!this.suiClient) {
            throw new Error('suiClient required');
        }

        let bankId = null;
        // find bankId from the event
        const resp = await this.suiClient.queryEvents({
                query: {"MoveEventType": ""+packageId+"::suisql_events::NewBankEvent"},
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
        let walrusBlobId = null;
        let walrusEndEpoch: number | null = null;
        let walrusStorageSize: number | null = null;
        let expectedWalrusBlobId = null;
        let owner = null;


        if (result?.data?.content) {
            const fields = (result.data.content as any).fields;
            if (fields && fields.id && fields.id.id) {
                patches = fields.patches;
            }
            if (fields && fields.walrus_blob_id) {
                walrusBlobId = fields.walrus_blob_id;
            }
            if (fields && fields.expected_walrus_blob_id) {
                expectedWalrusBlobId = fields.expected_walrus_blob_id;
            }
            if (fields && fields.walrus_blob && fields.walrus_blob.fields && fields.walrus_blob.fields.storage) {
                walrusEndEpoch = parseInt(''+fields.walrus_blob.fields.storage.fields.end_epoch);
            }
            if (fields && fields.walrus_blob && fields.walrus_blob.fields && fields.walrus_blob.fields.storage) {
                walrusStorageSize = parseInt(''+fields.walrus_blob.fields.storage.fields.storage_size);
            }

            if (result.data.owner) {
                owner = (result.data.owner as SuiSqlOwnerType);
            }
        }

        return {
            patches,
            walrusBlobId,
            walrusEndEpoch,
            walrusStorageSize,
            expectedWalrusBlobId,
            owner, 
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

    async extendWalrus(dbId: string, walrusSystemAddress: string, extendedEpochs: number, totalPrice?: bigint): Promise<number | boolean> {
        const packageId = await this.getPackageId();

        if (!packageId || !this.suiClient) {
            throw new Error('no packageId or no signer');
        }

        const currentAddress = this.getCurrentAddress();
        if (!currentAddress) {
            throw new Error('no current wallet address');
        }

        const tx = new Transaction();
        const target = ''+packageId+'::suisql::extend_walrus';

        // get wal coin type from the method signature
        const normalized = await this.suiClient.getNormalizedMoveFunction({
            package: packageId,
            module: 'suisql',
            function: 'extend_walrus',
        });

        let walCoinType = null;
        if (normalized && normalized.parameters && normalized.parameters.length > 3) {
            const walPackage = (normalized.parameters[3] as any)?.MutableReference?.Struct?.typeArguments[0]?.Struct?.address;
            walCoinType = ''+walPackage+'::wal::WAL';
        }

        if (!walCoinType) {
            throw new Error('can not get walCoinType from extend_walrus method signature');
        }

        const walCoin = await this.coinOfAmountToTxCoin(tx, currentAddress, walCoinType, (totalPrice || BigInt(10000000000)), true);

        const args = [
            tx.object(dbId),
            tx.object(walrusSystemAddress),
            tx.pure(bcs.u32().serialize(extendedEpochs)),
            walCoin,
        ];

        tx.moveCall({ 
                target, 
                arguments: args, 
                typeArguments: [], 
            });
        tx.transferObjects([walCoin], currentAddress); // send the charge back

        try {
            const txResults = await this.executeTx(tx);

            if (txResults && txResults.events && txResults.events.length) {
                for (const event of txResults.events) {
                    if (event && event.type && event.type.indexOf('BlobCertified') !== -1) {
                        const updatedEndEpoch = (event.parsedJson as any).end_epoch;
                        if (updatedEndEpoch) {
                            return parseInt(''+updatedEndEpoch);
                        }
                    }
                }
            }

            return true; // are we true if no BlobCertified event?
        } catch (e) {
            // @todo: catch EInvalidEpochsAhead ?

            console.error('fillExpectedWalrus error', e);
            return false;
        }
    }

    async clampWithWalrus(dbId: string, blobAddress: string, walrusSystemAddress: string) {
        const packageId = await this.getPackageId();

        if (!packageId || !this.suiClient) {
            throw new Error('no packageId or no signer');
        }

        const writeCapId = await this.getWriteCapId(dbId);

        if (!writeCapId) {
            throw new Error('no writeCapId');
        }

        const tx = new Transaction();
        const target = ''+packageId+'::suisql::clamp_with_walrus';

        const args = [
            tx.object(dbId),
            tx.object(writeCapId),
            tx.object(walrusSystemAddress),
            tx.object(blobAddress),
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
            console.error('fillExpectedWalrus error', e);
            return false;
        }
    }

    async fillExpectedWalrus(dbId: string, blobAddress: string, walrusSystemAddress: string) {
        const packageId = await this.getPackageId();

        if (!packageId || !this.suiClient) {
            throw new Error('no packageId or no signer');
        }

        /// no need for write cap here
        const tx = new Transaction();
        const target = ''+packageId+'::suisql::fill_expected_walrus';

        console.log(dbId, walrusSystemAddress, blobAddress);

        const args = [
            tx.object(dbId),
            tx.object(walrusSystemAddress),
            tx.object(blobAddress),
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
            console.error('fillExpectedWalrus error', e);
            return false;
        }
    }

    async savePatch(dbId: string, patch: Uint8Array, expectedWalrusBlobId?: bigint) {
        const packageId = await this.getPackageId();

        if (!packageId || !this.suiClient) {
            throw new Error('no packageId or no signer');
        }

        const writeCapId = await this.getWriteCapId(dbId);

        if (!writeCapId) {
            throw new Error('no writeCapId');
        }

        const tx = new Transaction();
        const target = ''+packageId+'::suisql::patch' + (expectedWalrusBlobId ? '_and_expect_walrus' : '');

        const args = [
            tx.object(dbId),
            tx.object(writeCapId),
            tx.pure(bcs.vector(bcs.u8()).serialize(patch)),
        ];

        if (expectedWalrusBlobId) {
            args.push(tx.pure(bcs.u256().serialize(expectedWalrusBlobId)));
        }

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

        let createdDbId = null;

        const txResults = await this.executeTx(tx);

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

    async listDatabases(callback?: Function): Promise<Array<string>> {
        const packageId = await this.getPackageId();
        const bankId = await this.getBankId();

        if (!packageId || !bankId || !this.suiClient) {
            throw new Error('no bankId or packageId or no suiClient');
        }

        //1st, get bank object
        const resp = await this.suiClient.getObject({
            id: bankId,
            options: {
                showContent: true,
            }
        });
        const mapId = (resp.data?.content as any)?.fields?.map?.fields?.id?.id;

        let cursor = null;
        let hasNextPage = false;
        const ret = [];
        do {
            const resp = await this.suiClient.getDynamicFields({
                parentId: mapId,
            });
            const thisRunRet = [];
            for (const obj of resp.data) {
                let name = obj.name.value;
                // to get db object id we need to query dynamic field object content (obj.objectId)
                // so we save some time, returning only names, which is enough for for SuiSql DB iniaitliazation
                ret.push(''+name);
                thisRunRet.push(''+name);
            }

            if (callback) {
                await callback(thisRunRet);
            }

            if (resp && resp.hasNextPage) {
                hasNextPage = true;
                cursor = resp.nextCursor;
            } else {
                hasNextPage = false;
            }
        } while (hasNextPage);

        return ret;
    }

    getCurrentAddress() {
        if (!this.suiClient) {
            throw new Error('no suiClient');
        }
        if (this.signer) {
            return this.signer.toSuiAddress();
        }
        if (this.currentWalletAddress) {
            return this.currentWalletAddress;
        }
        return null;        
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

    async executeRegisterBlobTransaction(tx: Transaction): Promise<string | null> {
        if (!this.suiClient) {
            throw new Error('no suiClient');
        }

        const results = await this.executeTx(tx);
        if (results && results.effects && results.effects) {
            const effects = (results.effects as any);
            const createdObjectIds = [];
            for (const rec of effects.created) {
                if (rec?.reference?.objectId) {
                    createdObjectIds.push(rec.reference.objectId);
                }
            }
            const allObjects = await this.suiClient.multiGetObjects({ ids: createdObjectIds, options: { showType: true }, });
            if (allObjects && allObjects.length) {
                for (const object of allObjects) {
                    if (object && object.data && object.data.type && object.data.type.indexOf('::blob::Blob') !== -1) {
                        return object.data.objectId;
                    }
                }
            }
        }

        return null;
    }


    async coinOfAmountToTxCoin(tx: Transaction, owner: string, coinType: string,  amount: bigint, addEmptyCoins = false) {
        SuiSqlLog.log('composing coin of amount', coinType, amount);

        const expectedAmountAsBigInt = BigInt(amount);
        const coinIds = await this.coinObjectsEnoughForAmount(owner, coinType, expectedAmountAsBigInt, addEmptyCoins);

        if (!coinIds || !coinIds.length) {
            throw new Error('you do not have enough coins of needed type ');
        }

        SuiSqlLog.log('composing coin objects, count', coinIds.length);

        if (coinIds.length == 1) {
            if (coinType.indexOf('::sui::SUI') !== -1) {
                const coinInput = tx.add(Commands.SplitCoins(tx.gas, [tx.pure.u64(expectedAmountAsBigInt)]));
                return coinInput;
            } else {
                const coinInput = tx.add(Commands.SplitCoins(tx.object(coinIds[0]), [tx.pure.u64(expectedAmountAsBigInt)]));
                return coinInput;
            }
        } else {
            // few coin objects to merge
            const coinIdToMergeIn = coinIds.shift();

            if (coinIdToMergeIn) {
                tx.add(Commands.MergeCoins(tx.object(coinIdToMergeIn), coinIds.map((id)=>{return tx.object(id);})));
                const coinInputSplet = tx.add(Commands.SplitCoins(tx.object(coinIdToMergeIn), [tx.pure.u64(expectedAmountAsBigInt)]));
    
                return coinInputSplet;
            }
        }

        throw new Error('should not happen');
    }

    async coinObjectsEnoughForAmount(owner: string, coinType: string, expectedAmount: bigint, addEmptyCoins = false) {
        if (!this.suiClient) {
            throw new Error('suiClient required');
        }

        const expectedAmountAsBigInt = BigInt(expectedAmount);

        const coinIds = [];
        const coins = [];

        let result = null;
        let cursor = null;
        do {
            result = await this.suiClient.getCoins({
                owner: owner,
                coinType: coinType,
                limit: 50,
                cursor: cursor,
            });
            coins.push(...result.data);

            cursor = result.nextCursor;
        } while (result.hasNextPage);

        coins.sort((a, b) => {
            // From big to small
            return Number(b.balance) - Number(a.balance);
        });

        let totalAmount = BigInt(0);
        for (const coin of coins) {
            if (totalAmount <= expectedAmountAsBigInt) {
                coinIds.push(coin.coinObjectId);
                totalAmount = totalAmount + BigInt(coin.balance);
            } else {
                if (addEmptyCoins && BigInt(coin.balance) == 0n) {
                    coinIds.push(coin.coinObjectId);
                }
            }
        }

        if (totalAmount >= expectedAmountAsBigInt) {
            return coinIds;
        }

        return null;
    }
}