const maxPureArgumentSize = 16 * 1024; // todo: add base64 conversion K
const maxBinaryArgumentSize = Math.floor(3 * maxPureArgumentSize / 4) - 4;
const maxMoveObjectSize = 250 * 1024;

const packages:Object = {
        local: '0x9010c9927792bca9df88323ea0fce0605d141a6d4d95e8e82697f0a810196144',
        testnet: '0xcc21097ba03acbb1e57c71fd0778b6cf9dc83dd8f2b3e7392ffaa02a964aa660',
    };

export {
    maxPureArgumentSize,
    maxBinaryArgumentSize,
    maxMoveObjectSize,
    packages,
};