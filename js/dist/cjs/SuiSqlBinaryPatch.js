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
var SuiSqlBinaryPatch_exports = {};
__export(SuiSqlBinaryPatch_exports, {
  default: () => SuiSqlBinaryPatch
});
module.exports = __toCommonJS(SuiSqlBinaryPatch_exports);
var import_SuiSqlUtils = require("./SuiSqlUtils.js");
class SuiSqlBinaryPatch {
  /**
   * Applies a binary patch to an original Uint8Array.
   * @param {Uint8Array} original - The original array to be patched.
   * @param {Uint8Array} binaryPatch - The binary patch to apply.
   * @returns {Uint8Array} - The patched array.
   */
  static applyPatch(original, binaryPatch) {
    const result = new Uint8Array(original);
    let offset = 0;
    while (offset < binaryPatch.length) {
      const start = binaryPatch[offset] << 24 | binaryPatch[offset + 1] << 16 | binaryPatch[offset + 2] << 8 | binaryPatch[offset + 3];
      const length = binaryPatch[offset + 4] << 8 | binaryPatch[offset + 5];
      offset += 6;
      const newBytes = binaryPatch.slice(offset, offset + length);
      result.set(newBytes, start);
      offset += length;
    }
    return result;
  }
  static async compressedBinaryDiff(a, b) {
    return (0, import_SuiSqlUtils.compress)(this.binaryDiff(a, b));
  }
  static binaryDiff(a, b) {
    return this.encodeFixedLengthPatch(this.diff(a, b));
  }
  static diff(a, b) {
    if (a.length !== b.length) {
      throw new Error("Arrays must be of equal length");
    }
    const patch = [];
    let i = 0;
    while (i < a.length) {
      if (a[i] === b[i]) {
        i++;
        continue;
      }
      const start = i;
      while (i < a.length && a[i] !== b[i]) {
        i++;
      }
      patch.push({
        start,
        length: i - start,
        newBytes: b.slice(start, i)
      });
    }
    return patch;
  }
  static encodeFixedLengthPatch(patch) {
    const chunks = [];
    for (const { start, length, newBytes } of patch) {
      const header = new Uint8Array(6);
      header[0] = start >>> 24 & 255;
      header[1] = start >>> 16 & 255;
      header[2] = start >>> 8 & 255;
      header[3] = start & 255;
      header[4] = length >>> 8 & 255;
      header[5] = length & 255;
      chunks.push(header, newBytes);
    }
    return this.concatUint8Arrays(chunks);
  }
  static concatUint8Arrays(arrays) {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }
}
//# sourceMappingURL=SuiSqlBinaryPatch.js.map
