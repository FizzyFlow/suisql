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
    constructor(params: SuiSqlBlockchainParams);
    setPackageId(packageId: string): void;
    getPackageId(): string | null;
    getWriteCapId(dbId: string): Promise<string | null | undefined>;
    getBankId(): Promise<string | undefined>;
    getFields(dbId: string): Promise<{
        patches: any;
        walrusBlobId: any;
        expectedWalrusBlobId: any;
        owner: SuiSqlOwnerType | null;
    }>;
    clampWithWalrus(dbId: string, blobAddress: string, walrusSystemAddress: string): Promise<boolean>;
    fillExpectedWalrus(dbId: string, blobAddress: string, walrusSystemAddress: string): Promise<boolean>;
    savePatch(dbId: string, patch: Uint8Array, expectedWalrusBlobId?: bigint): Promise<boolean>;
    getDbId(name: string): Promise<any>;
    makeDb(name: string): Promise<any>;
    getCurrentAddress(): string | null;
    executeTx(tx: Transaction): Promise<import("@mysten/sui/dist/cjs/client").SuiTransactionBlockResponse | null>;
}
export {};
