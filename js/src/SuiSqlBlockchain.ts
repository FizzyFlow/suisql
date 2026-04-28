// import type { SuiClient } from '@mysten/sui/client';

import { SuiGrpcClient, GrpcWebFetchTransport } from '@mysten/sui/grpc';
import { SuiGraphQLClient } from '@mysten/sui/graphql';
import type { Signer } from '@mysten/sui/cryptography';
import { packages, originalPackages, bankIds } from "./SuiSqlConsts.js";

import { Transaction, TransactionCommands as Commands } from "@mysten/sui/transactions";
import { bcs } from '@mysten/sui/bcs';
import { fromBase64 } from '@mysten/sui/utils';

import SuiSqlLog from './SuiSqlLog.js';

/**
 * Should accept Transaction as parameter and return executed transaction digest
 */
export type CustomSignAndExecuteTransactionFunction =
  (tx: Transaction) => Promise<string>;

type SuiSqlBlockchainParams = {
    suiClient: SuiGrpcClient,

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
    private suiClient?: SuiGrpcClient;
    
    private signer?: Signer;

    private currentWalletAddress?: string;
    private signAndExecuteTransaction?: CustomSignAndExecuteTransactionFunction;

    private network: string = 'local';
    private forcedPackageId?: string;
    private bankId?: string;

    private __walCoinType?: string;

    private getGraphQLClient(): SuiGraphQLClient {
        const urls: Record<string, string> = {
            mainnet: 'https://sui-mainnet.mystenlabs.com/graphql',
            testnet: 'https://sui-testnet.mystenlabs.com/graphql',
            devnet:  'https://sui-devnet.mystenlabs.com/graphql',
        };
        const url = urls[this.network] ?? 'http://127.0.0.1:9125';
        return new SuiGraphQLClient({ url, network: this.network as any });
    }

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

    getOriginalPackageId(): string | null {
        if (this.forcedPackageId) {
            return this.forcedPackageId;
        }

        if ( (originalPackages as any)[this.network] ) {
            return (originalPackages as any)[this.network];
        }

        return null;
    }

    async getWriteCapId(dbId: string) {
        if (!this.suiClient) {
            throw new Error('suiClient required');
        }
        const originalPackageId = await this.getOriginalPackageId();
        if (!originalPackageId) {
            throw new Error('no originalPackageId to get write cap');
        }

        const currentAddress = this.getCurrentAddress();
        if (!currentAddress) {
            return null;
        }

        const client = this.suiClient;
        let writeCapId = null;
        let cursor: string | null | undefined = undefined;
        while (true) {
            const result: Awaited<ReturnType<typeof client.listOwnedObjects>> = await client.listOwnedObjects({
                owner: currentAddress,
                type: (originalPackageId + '::suisql::WriteCap'),
                include: {
                    json: true,
                },
                cursor,
            });

            for (const obj of result.objects) {
                if ((obj?.json as any)?.sui_sql_db_id == dbId) {
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
            throw new Error('can not find bank if do not know the package');
        }

        if ( (bankIds as any)[this.network] ) {
            this.bankId = (bankIds as any)[this.network];
            return this.bankId;
        }

        if (!this.suiClient) {
            throw new Error('suiClient required');
        }

        let bankId = null;
        // find bankId from the event
        const resp = await this.getGraphQLClient().query({
            query: `{
                events(filter: { eventType: "${packageId}::suisql_events::NewBankEvent" }) {
                    nodes { contents { json } }
                }
            }`,
            variables: {},
        });

        const firstEvent = (resp.data as any)?.events?.nodes?.[0];
        if (firstEvent) {
            bankId = firstEvent?.contents?.json?.id ?? null;
        }

        this.bankId = bankId;
        return this.bankId;
    }

    async getFields(dbId: string) {
        // const packageId = await this.getPackageId();
        if (!this.suiClient) {
            throw new Error('suiClient required');
        }

        const result = await this.suiClient.getObject({
            objectId: dbId,
            include: { json: true },
        });

        let patches = [];
        let walrusBlobId = null;
        let walrusEndEpoch: number | null = null;
        let walrusStorageSize: number | null = null;
        let expectedWalrusBlobId = null;
        let owner = null;
        let name = null;

        console.log('[getFields] raw result.object:', JSON.stringify(result?.object, null, 2));

        if (result?.object?.json) {
            const fields = (result.object.json as any);
            console.log('[getFields] fields.patches raw:', JSON.stringify(fields.patches));
            console.log('[getFields] fields.id:', JSON.stringify(fields.id));
            if (fields.id) {
                patches = (fields.patches ?? []).map((p: string) => fromBase64(p));
            }
            console.log('[getFields] decoded patches count:', patches.length, 'sizes:', patches.map((p: Uint8Array) => p.length));
            if (fields.walrus_blob_id) {
                walrusBlobId = fields.walrus_blob_id;
            }
            if (fields.expected_walrus_blob_id) {
                expectedWalrusBlobId = fields.expected_walrus_blob_id;
            }
            if (fields.walrus_blob?.storage) {
                walrusEndEpoch = parseInt(''+fields.walrus_blob.storage.end_epoch);
                walrusStorageSize = parseInt(''+fields.walrus_blob.storage.storage_size);
            }
            if (fields.name) {
                name = fields.name;
            }

            if (result.object.owner) {
                owner = (result.object.owner as SuiSqlOwnerType);
            }
        }

        return {
            patches,
            walrusBlobId,
            walrusEndEpoch,
            walrusStorageSize,
            expectedWalrusBlobId,
            owner,
            name,
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
            throw new Error('no packageId or no signer');
        }
        // get wal coin type from the method signature
        const { function: normalized } = await this.suiClient.getMoveFunction({
            packageId,
            moduleName: 'suisql',
            name: 'extend_walrus',
        });

        let walCoinType = null;
        if (normalized && normalized.parameters && normalized.parameters.length > 3) {
            const param = normalized.parameters[3];
            const typeArg = param.body.$kind === 'datatype' ? param.body.datatype.typeParameters[0] : undefined;
            if (typeArg && typeArg.$kind === 'datatype') {
                walCoinType = typeArg.datatype.typeName;
            }
        }
        
        if (!walCoinType) {
            throw new Error('can not get walCoinType from extend_walrus method signature');
        }

        this.__walCoinType = walCoinType;

        return walCoinType;
    }

    async getWalCoinForTx(tx: Transaction, amount: bigint) {
        const packageId = await this.getPackageId();

        if (!packageId || !this.suiClient) {
            throw new Error('no packageId or no signer');
        }
        const currentAddress = this.getCurrentAddress();
        if (!currentAddress) {
            throw new Error('no current wallet address');
        }

        const walCoinType = await this.getWalCoinType();
        const walCoin = await this.coinOfAmountToTxCoin(tx, currentAddress, walCoinType, amount, true);

        return walCoin;
    }

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

        const walCoinType = await this.getWalCoinType();

        if (!walCoinType) {
            throw new Error('can not get walCoinType from extend_walrus method signature');
        }

        const walCoin = await this.coinOfAmountToTxCoin(tx, currentAddress, walCoinType, (totalPrice || BigInt(1000000000)), true);

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

            const txEvents = txResults?.Transaction?.events ?? txResults?.FailedTransaction?.events;
            if (txEvents && txEvents.length) {
                for (const event of txEvents) {
                    if (event && event.eventType && event.eventType.indexOf('BlobCertified') !== -1) {
                        const updatedEndEpoch = (event.json as any).end_epoch;
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
        SuiSqlLog.log('Clamping DB with Walrus blob', dbId, blobAddress);

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
            console.error('clampWithWalrus error', e);
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
        const sims = await this.suiClient.simulateTransaction({
                transaction: tx,
                include: { events: true },
                checksEnabled: false,
            });

        let foundDbId = null;
        const events = sims.Transaction?.events ?? sims.FailedTransaction?.events;
        if (events && events.length) {
            for (const event of events) {
                if (event && event.eventType && event.eventType.indexOf('RemindDBEvent') !== -1) {
                    foundDbId = (event.json as any).id;
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

        const txEvents = txResults?.Transaction?.events ?? txResults?.FailedTransaction?.events;
        if (txEvents && txEvents.length) {
            for (const event of txEvents) {
                if (event && event.eventType && event.eventType.indexOf('NewDBEvent') !== -1) {
                    createdDbId = (event.json as any).id;
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

        console.log(bankId);

        if (!packageId || !bankId || !this.suiClient) {
            throw new Error('no bankId or packageId or no suiClient');
        }

        //1st, get bank object
        const bankObj = await this.suiClient.getObject({
            objectId: bankId,
            include: { json: true },
        });
        const rawMap = (bankObj.object?.json as any)?.map;
        const mapId = typeof rawMap?.id === 'string' ? rawMap.id : rawMap?.id?.id;

        console.log(mapId);

        let cursor: string | null = null;
        let hasNextPage = false;
        const ret = [];
        do {
            const page: Awaited<ReturnType<typeof this.suiClient.listDynamicFields>> = await this.suiClient.listDynamicFields({
                parentId: mapId,
                cursor,
            });
            const thisRunRet = [];
            for (const obj of page.dynamicFields) {
                const name = bcs.string().parse(obj.name.bcs);
                // to get db object id we need to query dynamic field object content (obj.fieldId)
                // so we save some time, returning only names, which is enough for for SuiSql DB iniaitliazation
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

        SuiSqlLog.log('Executing tx on sui', tx);

        let digest = null;
        if (this.signAndExecuteTransaction) {
            digest = await this.signAndExecuteTransaction(tx);
        } else if (this.signer) {
            tx.setSenderIfNotSet(this.signer.toSuiAddress());
            const transactionBytes = await tx.build({ client: this.suiClient });
            const { signature } = await this.signer.signTransaction(transactionBytes);

            const result = await this.suiClient.executeTransaction({
                transaction: transactionBytes,
                signatures: [signature],
            });

            digest = result.Transaction?.digest ?? result.FailedTransaction?.digest ?? null;
        } else {
            throw new Error('either signer or signAndExecuteTransaction function required');
        }

        SuiSqlLog.log('Executing tx on sui. Digest: ', digest);

        if (digest) {
            const finalResults = await this.suiClient.waitForTransaction({
                digest,
                include: { effects: true, events: true },
            });
            SuiSqlLog.log('Executing tx on sui. Results: ', finalResults);

            return finalResults;
        }

        return null;
    }

    async executeRegisterBlobTransaction(tx: Transaction): Promise<string | null> {
        if (!this.suiClient) {
            throw new Error('no suiClient');
        }

        const results = await this.executeTx(tx);
        const txEffects = results?.Transaction?.effects ?? results?.FailedTransaction?.effects;
        if (txEffects) {
            const effects = (txEffects as any);
            const createdObjectIds = [];
            for (const rec of effects.created) {
                if (rec?.reference?.objectId) {
                    createdObjectIds.push(rec.reference.objectId);
                }
            }
            const { objects: allObjects } = await this.suiClient.getObjects({ objectIds: createdObjectIds });
            for (const object of allObjects) {
                if (!(object instanceof Error) && object.type.indexOf('::blob::Blob') !== -1) {
                    return object.objectId;
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
            throw new Error('Owner: '+owner+' does not have enough coins of needed type: '+coinType);
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
            result = await this.suiClient.listCoins({
                owner,
                coinType,
                limit: 50,
                cursor,
            });
            coins.push(...result.objects);

            cursor = result.cursor;
        } while (result.hasNextPage);

        coins.sort((a, b) => {
            // From big to small
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