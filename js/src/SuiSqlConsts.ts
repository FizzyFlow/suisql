const maxPureArgumentSize = 16 * 1024; // todo: add base64 conversion K
const maxBinaryArgumentSize = Math.floor(3 * maxPureArgumentSize / 4) - 4;
const maxMoveObjectSize = 250 * 1024;

const packages:Object = {
        local: '0x9010c9927792bca9df88323ea0fce0605d141a6d4d95e8e82697f0a810196144',
        testnet: '0xe548b2b04b52acb1a5d5d5f887e0f3fe92143249d28831b67aa9b0f83419d8c5',
    };

export {
    maxPureArgumentSize,
    maxBinaryArgumentSize,
    maxMoveObjectSize,
    packages,
};