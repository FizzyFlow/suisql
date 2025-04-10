
// import { BlobEncoder } from '@mysten/walrus-wasm';

// import type { SuiClient } from '@mysten/sui/client';


import type { Signer } from '@mysten/sui/cryptography';

import { getFullnodeUrl } from '@mysten/sui/client';

// import { WalrusClient } from "./walrusSdk2";
// import type { WalrusClient } from '@mysten/walrus';
import SuiSqlLog from './SuiSqlLog';

import type { WalrusClient } from '@mysten/walrus';

import { blobIdIntFromBytes, blobIdToInt, blobIdFromInt } from './SuiSqlUtils';

export type SuiSqlWalrusWalrusClient = WalrusClient;

type SuiSqlWalrusParams = {
    walrusClient?: WalrusClient,
    signer?: Signer,
    network?: string,

    walrusWasmUrl?: string,      // need it for blobId calculation, if no walrusClient is provided
};


const N_SHARDS = 1000; // https://github.com/MystenLabs/ts-sdks/blob/main/packages/walrus/src/constants.ts
                       // systemObjectId -> dynamicField ( SystemStateInnerV1 ) -> fields -> committee -> n_shards

export default class SuiSqlWalrus {
    private signer?: Signer;
    private network: string = 'testnet';

    private walrusClient?: WalrusClient;

    constructor(params: SuiSqlWalrusParams) {
        // this.suiClient = params.suiClient;
        this.signer = params.signer;

        // const walrusClient = new WalrusClient({
        //     network: 'testnet',
        //     suiClient: this.suiClient,
        //     storageNodeClientOptions: {
        //         fetch: (url, options) => {
        //             console.log('fetching', url);
        //             return fetch(url, options);
        //         },
        //         timeout: 60_000,
        //     },
        //     // packageConfig: {
        //     //     packageId: '0x795ddbc26b8cfff2551f45e198b87fc19473f2df50f995376b924ac80e56f88b',
        //     //     latestPackageId: '0x261b2e46428a152570f9ac08972d67f7c12d62469ccd381a51774c1df7a829ca',
        //     //     systemObjectId: '0x98ebc47370603fe81d9e15491b2f1443d619d1dab720d586e429ed233e1255c1',
        //     //     stakingPoolId: '0x20266a17b4f1a216727f3eef5772f8d486a9e3b5e319af80a5b75809c035561d',
        //     //     walPackageId: '0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82',
        //     // },
        // });

        if (params.walrusClient) {
            this.walrusClient = params.walrusClient;
        } else if (params.network) {
            this.network = params.network;
            const rpcUrl = getFullnodeUrl(this.network as any);
            // this.walrusClient = new WalrusClient({
            //     network: (this.network as any),
            //     suiRpcUrl: rpcUrl,
            //     wasmUrl: params.walrusWasmUrl,
            // });
        } else {
            throw new Error('No walrusClient or network provided for SuiSqlWalrus, can not initialize walrus connection');
        }
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

    async write(data: Uint8Array): Promise<{ blobId: string, blobObjectId: string } | null> {
        console.log(data, this.walrusClient, this.signer);
        if (!this.walrusClient || !this.signer) {
            return null;
        }

        SuiSqlLog.log('wrining blob to walrus', data);
        console.log(data);

        const { blobId, blobObject } = await this.walrusClient.writeBlob({
            blob: data,
            deletable: true,
            epochs: 3,
            signer: this.signer,
            owner: this.signer.toSuiAddress(),
            attributes: undefined,
        });

        const blobObjectId = blobObject.id.id;

        SuiSqlLog.log('walrus write success', blobId, blobObjectId);

        return { blobId, blobObjectId };
    }

    async read(blobId: string): Promise<Uint8Array | null> {
        const asString = blobIdFromInt(blobId);
        SuiSqlLog.log('reading blob from walrus', blobId, asString);

        const data = await this.walrusClient?.readBlob({ blobId: asString });

        if (data) {
            SuiSqlLog.log('walrus read success', data);
            return data;
        }

        return null;
    }
}