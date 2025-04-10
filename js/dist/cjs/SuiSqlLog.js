"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
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
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var SuiSqlLog_exports = {};
__export(SuiSqlLog_exports, {
  default: () => SuiSqlLog
});
module.exports = __toCommonJS(SuiSqlLog_exports);
const _SuiSqlLog = class _SuiSqlLog {
  static switch(onOff) {
    _SuiSqlLog._debug = onOff;
  }
  static log(...args) {
    if (!_SuiSqlLog._debug) {
      return;
    }
    let prefix = "SuiSql | ";
    args.unshift(prefix);
    console.info.apply(null, args);
  }
};
__publicField(_SuiSqlLog, "_debug", false);
let SuiSqlLog = _SuiSqlLog;
;
//# sourceMappingURL=SuiSqlLog.js.map
