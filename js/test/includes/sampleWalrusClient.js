process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // ifnore certs of walrus nodes

import { WalrusClient } from '@mysten/walrus';
import { Agent } from "undici";

const path = require('path').join(__dirname, 'walrus_wasm_bg.wasm');
const bytes = require('fs').readFileSync(path);

const walrusClient = new WalrusClient({
    network: 'testnet',
    wasmUrl: bytes,
    suiRpcUrl: 'https://fullnode.testnet.sui.io:443',
});

const walrusMainnetClient = new WalrusClient({
    network: 'mainnet',
    wasmUrl: bytes,
    suiRpcUrl: 'https://fullnode.mainnet.sui.io:443',
    storageNodeClientOptions: {
        fetch: async (url, options) => {
            // quick hack:
            try {
                options.dispatcher =  new Agent({ connectTimeout: 120000 });
                const res = await fetch(url, options);
                return res;
            } catch (e) {
                console.log(e);
                throw e;
            }
        },
        timeout: 140000,
    },    
});

export default {
    testnet: walrusClient,
    mainnet: walrusMainnetClient,
};

