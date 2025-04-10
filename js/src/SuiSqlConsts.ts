const maxPureArgumentSize = 16 * 1024; // todo: add base64 conversion K
const maxBinaryArgumentSize = Math.floor(3 * maxPureArgumentSize / 4) - 4;
const maxMoveObjectSize = 250 * 1024;

const packages:Object = {
        local: '0x9010c9927792bca9df88323ea0fce0605d141a6d4d95e8e82697f0a810196144',
        testnet: '0x62a9c64b5dbe2f23b5be71ce839d9632bd957ab54a79d3b2be99569e6efa276b',
    };

export {
    maxPureArgumentSize,
    maxBinaryArgumentSize,
    maxMoveObjectSize,
    packages,
};