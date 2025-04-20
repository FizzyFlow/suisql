const maxPureArgumentSize = 16 * 1024;
const maxBinaryArgumentSize = Math.floor(3 * maxPureArgumentSize / 4) - 4;
const maxMoveObjectSize = 250 * 1024;
const packages = {
  local: "0x9010c9927792bca9df88323ea0fce0605d141a6d4d95e8e82697f0a810196144",
  testnet: "0x07518d608ea08ea73e4a5ad0da461334fcd339dcdcdcc574022fdadfaafadb6b"
};
export {
  maxBinaryArgumentSize,
  maxMoveObjectSize,
  maxPureArgumentSize,
  packages
};
//# sourceMappingURL=SuiSqlConsts.js.map
