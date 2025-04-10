process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // ifnore certs of walrus nodes

import { WalrusClient } from '@mysten/walrus';

const path = require('path').join(__dirname, 'walrus_wasm_bg.wasm');
const bytes = require('fs').readFileSync(path);

const walrusClient = new WalrusClient({
    network: 'testnet',
    wasmUrl: bytes,
    suiRpcUrl: 'https://fullnode.testnet.sui.io:443',
});

export default walrusClient;