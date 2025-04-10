const maxPureArgumentSize = 16 * 1024;
const maxBinaryArgumentSize = Math.floor(3 * maxPureArgumentSize / 4) - 4;
const maxMoveObjectSize = 250 * 1024;
const packages = {
  local: "0x9010c9927792bca9df88323ea0fce0605d141a6d4d95e8e82697f0a810196144",
  testnet: "0xe4237cb522a8bf46cfe8f5373100c425a8fe19b8a945734b9a505c322af2e1e2"
};
export {
  maxBinaryArgumentSize,
  maxMoveObjectSize,
  maxPureArgumentSize,
  packages
};
//# sourceMappingURL=SuiSqlConsts.js.map
