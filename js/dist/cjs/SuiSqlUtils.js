"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var SuiSqlUtils_exports = {};
__export(SuiSqlUtils_exports, {
  anyShallowCopy: () => anyShallowCopy,
  compress: () => compress,
  concatUint8Arrays: () => concatUint8Arrays,
  decompress: () => decompress,
  getFieldsFromCreateTableSql: () => getFieldsFromCreateTableSql,
  int32ToUint8ArrayBE: () => int32ToUint8ArrayBE,
  isSureWriteSql: () => isSureWriteSql
});
module.exports = __toCommonJS(SuiSqlUtils_exports);
var import_pako = __toESM(require("pako"));
const compress = async (input) => {
  return import_pako.default.deflate(input);
};
const decompress = async (compressed) => {
  return import_pako.default.inflate(compressed);
};
const anyShallowCopy = (input) => {
  if (Array.isArray(input)) {
    return [...input];
  } else if (typeof input === "object" && input !== null) {
    return { ...input };
  } else {
    return input;
  }
};
const isSureWriteSql = (sql) => {
  const checks = ["CREATE", "ALTER", "INSERT", "UPDATE", "DELETE", "DROP"];
  for (const check of checks) {
    if (sql.trim().toUpperCase().startsWith(check)) {
      return true;
    }
  }
  return false;
};
const getFieldsFromCreateTableSql = (sql) => {
  const inParentheses = extractTopLevelParenthesesText(sql.split("\n").join(" "));
  if (!inParentheses || !inParentheses[0]) {
    return null;
  }
  const fields = inParentheses[0].split(",");
  const ret = [];
  for (const field of fields) {
    const definition = field.trim().toLowerCase();
    ret.push(definition);
  }
  console.log(ret);
  console.log(ret);
  return ret;
};
const extractTopLevelParenthesesText = (str) => {
  let result = [];
  let stack = [];
  let startIndex = -1;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "(") {
      if (stack.length === 0) {
        startIndex = i + 1;
      }
      stack.push("(");
    } else if (str[i] === ")") {
      stack.pop();
      if (stack.length === 0 && startIndex !== -1) {
        result.push(str.substring(startIndex, i));
        startIndex = -1;
      }
    }
  }
  return result;
};
const int32ToUint8ArrayBE = (num) => Uint8Array.from([num >>> 24, num >>> 16 & 255, num >>> 8 & 255, num & 255]);
const concatUint8Arrays = (arrays) => {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
};
//# sourceMappingURL=SuiSqlUtils.js.map
