
// import { BlobEncoder } from '@mysten/walrus-wasm';

// import type { SuiClient } from '@mysten/sui/client';


import type { Signer } from '@mysten/sui/cryptography';

import { getFullnodeUrl } from '@mysten/sui/client';

// import { WalrusClient } from "./walrusSdk2";
// import type { WalrusClient } from '@mysten/walrus';
import SuiSqlLog from './SuiSqlLog';

import type { WalrusClient } from '@mysten/walrus';

import { blobIdIntFromBytes, blobIdToInt, blobIdFromInt } from './SuiSqlUtils';

import axios from 'axios';


export type SuiSqlWalrusWalrusClient = WalrusClient;

type SuiSqlWalrusParams = {
    walrusClient?: WalrusClient,
    currentWalletAddress?: string,
    publisherUrl?: string,
    aggregatorUrl?: string,
    signer?: Signer,
    network?: string, // sui network, 'mainnet', 'testnet', 
};


const N_SHARDS = 1000; // https://github.com/MystenLabs/ts-sdks/blob/main/packages/walrus/src/constants.ts
                       // systemObjectId -> dynamicField ( SystemStateInnerV1 ) -> fields -> committee -> n_shards

export default class SuiSqlWalrus {
    private signer?: Signer;

    private walrusClient?: WalrusClient;
    private currentWalletAddress?: string;

    private publisherUrl?: string;
    private aggregatorUrl?: string;

    private canWrite: boolean = false;
    private canRead: boolean = false;

    constructor(params: SuiSqlWalrusParams) {
        this.signer = params.signer;
        this.currentWalletAddress = params.currentWalletAddress;
        this.publisherUrl = params.publisherUrl;
        this.aggregatorUrl = params.aggregatorUrl;
        this.walrusClient = params.walrusClient;

        if (!this.currentWalletAddress && this.signer) {
            this.currentWalletAddress = this.signer.toSuiAddress();
        }

        if (!this.walrusClient && params.network) {
            if (!this.aggregatorUrl) {
                // we can use aggregator
                if (params.network == 'testnet') {
                    this.aggregatorUrl = 'https://aggregator.walrus-testnet.walrus.space';
                }
            }
            if (!this.publisherUrl && this.currentWalletAddress) {
                // we can use publisher if we know current user address
                if (params.network == 'testnet') {
                    this.publisherUrl = 'https://publisher.walrus-testnet.walrus.space';
                }
            }
        }

        if (!this.publisherUrl && !this.signer && this.currentWalletAddress) {
            // we need publisher, as we can't write with walrusClient without signer
            if (params.network == 'testnet') {
                this.publisherUrl = 'https://publisher.walrus-testnet.walrus.space';
            }
        }

        this.canWrite = false;
        if (this.walrusClient) {
            this.canRead = true;
            if (this.signer) {
                this.canWrite = true;
            }
            if (this.publisherUrl && this.currentWalletAddress) {
                this.canWrite = true;
            }
        } else {
            if (this.publisherUrl && this.currentWalletAddress) {
                this.canWrite = true;
            }
            if (this.aggregatorUrl) {
                this.canRead = true;
            }
        }

        SuiSqlLog.log('SuiSqlWalrus instance', params, 'canRead:', this.canRead, 'canWrite:', this.canWrite);
    }

    async getSystemObjectId(): Promise<string | null> {
        if (!this.walrusClient) {
            return null;
        }

        const systemObject = await this.walrusClient.systemObject();

        return systemObject.id.id;
    }

    // static async calculateBlobId(data: Uint8Array): Promise<bigint | null> {
    //     if (!this.walrusClient) {
    //         return null;
    //     }

    //     const { blobId } = await this.walrusClient.encodeBlob(data);
    //     return blobId;

    //     return null;
    // }

    async calculateBlobId(data: Uint8Array): Promise<bigint | null> {
        if (!this.walrusClient) {
            return null;
        }

        const { blobId } = await this.walrusClient.encodeBlob(data);
        
        if (blobId) {
            return blobIdToInt(blobId);
        }

        return null;
    }

    getCurrentAddress() {
        if (this.signer) {
            return this.signer.toSuiAddress();
        }
        if (this.currentWalletAddress) {
            return this.currentWalletAddress;
        }
        return null;        
    }

    async writeToPublisher(data: Uint8Array): Promise<{ blobId: bigint, blobObjectId: string } | null> {
        const form = new FormData();
        form.append('file', new Blob([data]));
        
        const publisherUrl = this.publisherUrl+'/v1/blobs?deletable=true&send_object_to='+this.getCurrentAddress();
        SuiSqlLog.log('writing blob to walrus via publisher', form);

        const res = await axios.put(publisherUrl, data);

        console.log('walrus publisher response', res);

        if (res && res.data && res.data.newlyCreated && res.data.newlyCreated.blobObject && res.data.newlyCreated.blobObject.id) {
            SuiSqlLog.log('success', res.data);
            return {
                blobId: blobIdToInt(''+res.data.newlyCreated.blobObject.blobId),
                blobObjectId: res.data.newlyCreated.blobObject.id,
            };
        }

        throw new Error('Failed to write blob to walrus publisher');
    }

    async write(data: Uint8Array): Promise<{ blobId: bigint, blobObjectId: string } | null> {
        if (this.publisherUrl && this.currentWalletAddress) {
            return await this.writeToPublisher(data);
        }
        if (!this.walrusClient || !this.signer) {
            return null;
        }

        SuiSqlLog.log('writing blob to walrus', data);

        const { blobId, blobObject } = await this.walrusClient.writeBlob({
            blob: data,
            deletable: true,
            epochs: 2,
            signer: this.signer,
            owner: this.signer.toSuiAddress(),
            attributes: undefined,
        });

        const blobObjectId = blobObject.id.id;
        const blobIdAsInt = blobIdToInt(blobId);

        SuiSqlLog.log('walrus write success', blobIdAsInt, blobObjectId);

        return { blobId: blobIdAsInt, blobObjectId };
    }

    async readFromAggregator(blobId: string): Promise<Uint8Array | null> {
        const asString = blobIdFromInt(blobId);
        const url = this.aggregatorUrl+"/v1/blobs/" + asString;

        SuiSqlLog.log('reading blob from walrus (Aggregator)', blobId);

        const res = await axios.get(url, { responseType: 'arraybuffer' });

        return new Uint8Array(res.data);
    }

    async read(blobId: string): Promise<Uint8Array | null> {
        if (this.aggregatorUrl) {
            return await this.readFromAggregator(blobId);
        }

        const asString = blobIdFromInt(blobId);

        SuiSqlLog.log('reading blob from walrus (SDK)', blobId, asString);

        const data = await this.walrusClient?.readBlob({ blobId: asString });

        if (data) {
            SuiSqlLog.log('walrus read success', data);
            return data;
        }

        return null;
    }
}