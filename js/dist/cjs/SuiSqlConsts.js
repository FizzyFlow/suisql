"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var SuiSqlConsts_exports = {};
__export(SuiSqlConsts_exports, {
  maxBinaryArgumentSize: () => maxBinaryArgumentSize,
  maxMoveObjectSize: () => maxMoveObjectSize,
  maxPureArgumentSize: () => maxPureArgumentSize,
  packages: () => packages
});
module.exports = __toCommonJS(SuiSqlConsts_exports);
const maxPureArgumentSize = 16 * 1024;
const maxBinaryArgumentSize = Math.floor(3 * maxPureArgumentSize / 4) - 4;
const maxMoveObjectSize = 250 * 1024;
const packages = {
  local: "0x9010c9927792bca9df88323ea0fce0605d141a6d4d95e8e82697f0a810196144",
  testnet: "0xe548b2b04b52acb1a5d5d5f887e0f3fe92143249d28831b67aa9b0f83419d8c5"
};
//# sourceMappingURL=SuiSqlConsts.js.map
