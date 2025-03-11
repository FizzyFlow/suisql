import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';

import { WalrusClient } from "./walrusSdk";

type SuiSqlWalrusParams = {
    suiClient: SuiClient,
    signer?: Signer,
    network?: string,
};

export default class SuiSqlWalrus {
    private suiClient?: SuiClient;
    private signer?: Signer;
    private network: string = 'testnet';

    private walrusClient?: WalrusClient;

    constructor(params: SuiSqlWalrusParams) {
        this.suiClient = params.suiClient;
        this.signer = params.signer;

        const walrusClient = new WalrusClient({
            network: 'testnet',
            suiClient: this.suiClient,
            packageConfig: {
                packageId: '0x795ddbc26b8cfff2551f45e198b87fc19473f2df50f995376b924ac80e56f88b',
                latestPackageId: '0x261b2e46428a152570f9ac08972d67f7c12d62469ccd381a51774c1df7a829ca',
                systemObjectId: '0x98ebc47370603fe81d9e15491b2f1443d619d1dab720d586e429ed233e1255c1',
                stakingPoolId: '0x20266a17b4f1a216727f3eef5772f8d486a9e3b5e319af80a5b75809c035561d',
                walPackageId: '0x8190b041122eb492bf63cb464476bd68c6b7e570a4079645a8b28732b6197a82',
            },
        });

        this.walrusClient = walrusClient;
    }

    async write(data: Uint8Array) {
        if (!this.walrusClient || !this.signer) {
            return null;
        }

        const { blobId } = await this.walrusClient.writeBlob({
            blob: data,
            deletable: true,
            epochs: 3,
            signer: this.signer,
            owner: this.signer.toSuiAddress(),
            attributes: null,
        });

        return blobId;
    }

    async read(blobId: string) {
        const data = await this.walrusClient?.readBlob({ blobId: blobId });

        return data;
    }
}