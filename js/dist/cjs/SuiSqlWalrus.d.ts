import type { Signer } from '@mysten/sui/cryptography';
import type { WalrusClient } from '@mysten/walrus';
export type SuiSqlWalrusWalrusClient = WalrusClient;
type SuiSqlWalrusParams = {
    walrusClient?: WalrusClient;
    signer?: Signer;
    network?: string;
    walrusWasmUrl?: string;
};
export default class SuiSqlWalrus {
    private signer?;
    private network;
    private walrusClient?;
    constructor(params: SuiSqlWalrusParams);
    calculateBlobId(data: Uint8Array): Promise<bigint | null>;
    write(data: Uint8Array): Promise<string | null>;
    read(blobId: string): Promise<Uint8Array | null>;
}
export {};
