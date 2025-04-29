import type { Signer } from '@mysten/sui/cryptography';
import type { WalrusClient } from '@mysten/walrus';
export type SuiSqlWalrusWalrusClient = WalrusClient;
type SuiSqlWalrusParams = {
    walrusClient?: WalrusClient;
    currentWalletAddress?: string;
    publisherUrl?: string;
    aggregatorUrl?: string;
    signer?: Signer;
    network?: string;
};
export default class SuiSqlWalrus {
    private signer?;
    private walrusClient?;
    private currentWalletAddress?;
    private publisherUrl?;
    private aggregatorUrl?;
    private canWrite;
    private canRead;
    constructor(params: SuiSqlWalrusParams);
    getStoragePricePerEpoch(size: number): Promise<bigint | null>;
    getSystemObjectId(): Promise<string | null>;
    getSystemCurrentEpoch(): Promise<number | null>;
    calculateBlobId(data: Uint8Array): Promise<bigint | null>;
    getCurrentAddress(): string | null;
    writeToPublisher(data: Uint8Array): Promise<{
        blobId: bigint;
        blobObjectId: string;
    } | null>;
    write(data: Uint8Array): Promise<{
        blobId: bigint;
        blobObjectId: string;
    } | null>;
    readFromAggregator(blobId: string): Promise<Uint8Array | null>;
    read(blobId: string): Promise<Uint8Array | null>;
}
export {};
