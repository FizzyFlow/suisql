import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
type SuiSqlWalrusParams = {
    suiClient: SuiClient;
    signer?: Signer;
    network?: string;
};
export default class SuiSqlWalrus {
    private suiClient?;
    private signer?;
    private network;
    private walrusClient?;
    constructor(params: SuiSqlWalrusParams);
    getBlobId(data: Uint8Array): Promise<string | null>;
    write(data: Uint8Array): Promise<string | null>;
    read(blobId: string): Promise<Uint8Array | null>;
}
export {};
