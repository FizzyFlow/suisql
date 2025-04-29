import SuiSql from "./SuiSql";
import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import SuiSqlBlockchain from "./SuiSqlBlockchain";
import { CustomSignAndExecuteTransactionFunction } from "./SuiSqlBlockchain";
import SuiSqlWalrus from "./SuiSqlWalrus";
import type { SuiSqlWalrusWalrusClient } from './SuiSqlWalrus';
type SuiSqlSyncParams = {
    suiSql: SuiSql;
    id?: string;
    name?: string;
    suiClient: SuiClient;
    walrusClient?: SuiSqlWalrusWalrusClient;
    publisherUrl?: string;
    aggregatorUrl?: string;
    signer?: Signer;
    currentWalletAddress?: string;
    signAndExecuteTransaction?: CustomSignAndExecuteTransactionFunction;
    network?: string;
};
export type SuiSqlSyncToBlobckchainParams = {
    forceWalrus?: boolean;
    forceExpectWalrus?: boolean;
};
export default class SuiSqlSync {
    id?: string;
    name?: string;
    hasBeenCreated: boolean;
    private owner?;
    walrusBlobId?: string;
    walrusEndEpoch?: number;
    walrusStorageSize?: number;
    private suiSql;
    private suiClient;
    private syncedAt;
    private patchesTotalSize;
    network: string;
    chain?: SuiSqlBlockchain;
    walrus?: SuiSqlWalrus;
    private canWrite?;
    constructor(params: SuiSqlSyncParams);
    hasWriteAccess(): Promise<boolean>;
    get syncedAtDate(): Date | null;
    get ownerAddress(): string | null;
    unsavedChangesCount(): number;
    /**
     * Returns true if db has changes that should be saved into the blockchain
     */
    hasUnsavedChanges(): boolean;
    syncFromBlockchain(): Promise<boolean>;
    syncToBlockchain(params?: SuiSqlSyncToBlobckchainParams): Promise<boolean>;
    extendWalrus(extendedEpochs?: number): Promise<boolean | undefined>;
    fillExpectedWalrus(): Promise<boolean | undefined>;
    loadFromWalrus(walrusBlobId: string): Promise<void>;
    applyPatch(patch: Uint8Array): Promise<boolean>;
    applySqlPatch(patch: Uint8Array): Promise<boolean>;
    getFull(): Promise<Uint8Array<ArrayBufferLike> | null>;
    getPatchJSON(): Promise<string>;
    getPatch(): Promise<Uint8Array<ArrayBufferLike>>;
}
export {};
