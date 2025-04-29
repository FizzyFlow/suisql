import type { Signer } from '@mysten/sui/cryptography';
import type { WalrusClient, RegisterBlobOptions, CertifyBlobOptions } from '@mysten/walrus';
import type { Transaction } from "@mysten/sui/transactions";
import type SuiSqlBlockchain from './SuiSqlBlockchain';
export type SuiSqlWalrusWalrusClient = WalrusClient;
type SuiSqlWalrusParams = {
    walrusClient?: WalrusClient;
    chain?: SuiSqlBlockchain;
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
    private chain?;
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
    write2(data: Uint8Array): Promise<{
        blobId: bigint;
        blobObjectId: string;
    } | null>;
    readFromAggregator(blobId: string): Promise<Uint8Array | null>;
    read(blobId: string): Promise<Uint8Array | null>;
    registerBlobTransaction(options: RegisterBlobOptions): Promise<Transaction>;
    certifyBlobTransaction(options: CertifyBlobOptions): Promise<Transaction>;
}
export {};
