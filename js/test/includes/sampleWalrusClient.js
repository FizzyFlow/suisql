process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // ifnore certs of walrus nodes

import { WalrusClient } from '@mysten/walrus';
import { SuiGrpcClient, GrpcWebFetchTransport } from '@mysten/sui/grpc';
import { Agent } from "undici";

const suiMainnetClient = new SuiGrpcClient({
    network: 'mainnet',
    transport: new GrpcWebFetchTransport({ baseUrl: 'https://fullnode.mainnet.sui.io:443' }),
});
const suiTestnetClient = new SuiGrpcClient({
    network: 'testnet',
    transport: new GrpcWebFetchTransport({ baseUrl: 'https://fullnode.testnet.sui.io:443' }),
});

const path = require('path').join(__dirname, 'walrus_wasm_bg.wasm');
const bytes = require('fs').readFileSync(path);

const debugFetch = true;
const maxParallelQueries = 30;
const fetchQueryTimeout = 15000; // 15 sec
let activeQueriesCount = 0;

// in case we go without upload relay, we can limit parallel queries
// to walrus storage nodes:
// without this, in browser we can easily hit exceptions
const limitedFetch = async (url, options) => {
    if (activeQueriesCount >= maxParallelQueries) {
        do {
            await new Promise((res)=> setTimeout(res, 1000) );
        } while (activeQueriesCount >= maxParallelQueries);
    }
    activeQueriesCount++;
    const urlToDisplay = url.slice(0, 40) + '...';
    if (debugFetch) {
        console.log(`Starting fetch to ${urlToDisplay}. Active queries: ${activeQueriesCount}`);
    }
    try {
        options.signal = AbortSignal.timeout(fetchQueryTimeout);
        const res = await fetch(url, options);
        activeQueriesCount--;
        return res;
    } catch (e) {
        activeQueriesCount--;
        throw e;
    }
};
const walrusMainnetClient = new WalrusClient({
    network: 'mainnet',
    wasmUrl: bytes,
    suiClient: suiMainnetClient,
    storageNodeClientOptions: {
        fetch: limitedFetch,
        timeout: 170000,
    },
    uploadRelay: { // https://upload-relay.mainnet.walrus.space/v1/tip-config
        host: 'https://upload-relay.mainnet.walrus.space',
        sendTip: {
            address: "0x765a6ff2c13b47e2603416d0b5a156df498a5c51bc8085be3838e43e06086256",
            kind: {
                linear: {
                    base: 0,
                    perEncodedKib: 40
                }
            }
        },
    },
});

const walrusTestnetClient = new WalrusClient({
    network: 'testnet',
    wasmUrl: bytes,
    suiClient: suiTestnetClient,
    storageNodeClientOptions: {
        fetch: limitedFetch,
        timeout: 170000,
    },
    uploadRelay: { // https://upload-relay.testnet.walrus.space/v1/tip-config
        host: 'https://upload-relay.testnet.walrus.space',
        sendTip: {
            address: "0x4b6a7439159cf10533147fc3d678cf10b714f2bc998f6cb1f1b0b9594cdc52b6",
            kind: {
                const: 105,
            }
        },
    },
});


const walrusTestnetClientNoRelay = new WalrusClient({
    network: 'testnet',
    wasmUrl: bytes,
    suiClient: suiTestnetClient,
    storageNodeClientOptions: {
        fetch: limitedFetch,
        timeout: 170000,
    },
});

const walrusMainnetClientNoRelay = new WalrusClient({
    network: 'mainnet',
    wasmUrl: bytes,
    suiClient: suiMainnetClient,
    storageNodeClientOptions: {
        fetch: limitedFetch,
        timeout: 170000,
    },
});

export default {
    testnet: walrusTestnetClient,
    mainnet: walrusMainnetClient,
    mainnetNoRelay: walrusMainnetClientNoRelay,
    testnetNoRelay: walrusTestnetClientNoRelay,
};

