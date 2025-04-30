import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { Transaction } from "@mysten/sui/transactions";
/**
 * Should accept Transaction as parameter and return executed transaction digest
 */
export type CustomSignAndExecuteTransactionFunction = (tx: Transaction) => Promise<string>;
type SuiSqlBlockchainParams = {
    suiClient: SuiClient;
    signer?: Signer;
    signAndExecuteTransaction?: CustomSignAndExecuteTransactionFunction;
    currentWalletAddress?: string;
    network?: string;
};
export type SuiSqlOwnerType = {
    AddressOwner?: string;
    ObjectOwner?: string;
    Shared?: any;
    Immutable?: boolean;
};
export default class SuiSqlBlockchain {
    private suiClient?;
    private signer?;
    private currentWalletAddress?;
    private signAndExecuteTransaction?;
    private network;
    private forcedPackageId?;
    private bankId?;
    private __walCoinType?;
    constructor(params: SuiSqlBlockchainParams);
    setPackageId(packageId: string): void;
    getPackageId(): string | null;
    getWriteCapId(dbId: string): Promise<string | null | undefined>;
    getBankId(): Promise<string | undefined>;
    getFields(dbId: string): Promise<{
        patches: any;
        walrusBlobId: any;
        walrusEndEpoch: number | null;
        walrusStorageSize: number | null;
        expectedWalrusBlobId: any;
        owner: SuiSqlOwnerType | null;
    }>;
    getWalCoinType(): Promise<string>;
    getWalCoinForTx(tx: Transaction, amount: bigint): Promise<import("@mysten/sui/dist/cjs/transactions/Transaction.js").TransactionResult>;
    extendWalrus(dbId: string, walrusSystemAddress: string, extendedEpochs: number, totalPrice?: bigint): Promise<number | boolean>;
    clampWithWalrus(dbId: string, blobAddress: string, walrusSystemAddress: string): Promise<boolean>;
    fillExpectedWalrus(dbId: string, blobAddress: string, walrusSystemAddress: string): Promise<boolean>;
    savePatch(dbId: string, patch: Uint8Array, expectedWalrusBlobId?: bigint): Promise<boolean>;
    getDbId(name: string): Promise<any>;
    makeDb(name: string): Promise<any>;
    listDatabases(callback?: Function): Promise<Array<string>>;
    getCurrentAddress(): string | null;
    executeTx(tx: Transaction): Promise<import("@mysten/sui/dist/cjs/client/index.js").SuiTransactionBlockResponse | null>;
    executeRegisterBlobTransaction(tx: Transaction): Promise<string | null>;
    coinOfAmountToTxCoin(tx: Transaction, owner: string, coinType: string, amount: bigint, addEmptyCoins?: boolean): Promise<import("@mysten/sui/dist/cjs/transactions/Transaction.js").TransactionResult>;
    coinObjectsEnoughForAmount(owner: string, coinType: string, expectedAmount: bigint, addEmptyCoins?: boolean): Promise<string[] | null>;
}
export {};
