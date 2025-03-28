import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import { Transaction } from "@mysten/sui/transactions";
/**
 * Should accept Transaction as parameter and return executed transaction digest
 */
export type CustomSignAndExecuteTransactionFunction = (tx: Transaction) => Promise<string>;
type SuiSqlBlockchainParams = {
    suiClient: SuiClient;
    walrusSuiClient?: SuiClient;
    signer?: Signer;
    network?: string;
    signAndExecuteTransaction?: CustomSignAndExecuteTransactionFunction;
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
    private signAndExecuteTransaction?;
    private network;
    private forcedPackageId?;
    private bankId?;
    private walrus?;
    constructor(params: SuiSqlBlockchainParams);
    setPackageId(packageId: string): void;
    getPackageId(): string | null;
    getBankId(): Promise<string | undefined>;
    getFields(dbId: string): Promise<{
        patches: any;
        walrus: any;
        owner: SuiSqlOwnerType | null;
    }>;
    getFull(walrusBlobId: string): Promise<Uint8Array<ArrayBufferLike> | null | undefined>;
    saveFull(dbId: string, full: Uint8Array): Promise<boolean>;
    savePatch(dbId: string, patch: Uint8Array): Promise<boolean>;
    getDbId(name: string): Promise<any>;
    makeDb(name: string): Promise<any>;
    executeTx(tx: Transaction): Promise<import("@mysten/sui/dist/cjs/client").SuiTransactionBlockResponse | null>;
}
export {};
