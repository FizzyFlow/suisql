const maxPureArgumentSize = 16 * 1024; // todo: add base64 conversion K
const maxBinaryArgumentSize = Math.floor(3 * maxPureArgumentSize / 4) - 4;
const maxMoveObjectSize = 250 * 1024;

const packages:Object = {
        local: '0x9010c9927792bca9df88323ea0fce0605d141a6d4d95e8e82697f0a810196144',
        testnet: '0x1d413bd519db4b3207c68766c33b362a384699cc7af34d97ad4dabdf223c223a', // testnet v2
        mainnet: '0xf55b2f4fbac4bfa87cf9ceb8a333b14834bcc8299965640d77e63818fbca5428', // mainnet v2
    };

const originalPackages:Object = {
        local: '0x9010c9927792bca9df88323ea0fce0605d141a6d4d95e8e82697f0a810196144',
        testnet: '0xe548b2b04b52acb1a5d5d5f887e0f3fe92143249d28831b67aa9b0f83419d8c5',
        mainnet: '0x650ff3788c4dbc7dcb3f909fd01642fd8a772dc7e003e575c9d502d51b07cabe',
    };


const bankIds:Object = {
    mainnet: '0x51800d865c2306091eb901c989e7dd982f6da87c04ee567d7259282e6f2c0e68',
    testnet: '0xf019aeaca553f968ce5a21f550a0a9ad1ce51d27d8f70c247e9a25e17c02e138',
};

export {
    maxPureArgumentSize,
    maxBinaryArgumentSize,
    maxMoveObjectSize,
    packages,
    originalPackages,
    bankIds,
};