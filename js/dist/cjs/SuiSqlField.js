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
var SuiSqlField_exports = {};
__export(SuiSqlField_exports, {
  default: () => SuiSqlField
});
module.exports = __toCommonJS(SuiSqlField_exports);
class SuiSqlField {
  constructor(params) {
    __publicField(this, "suiSql");
    __publicField(this, "name");
    __publicField(this, "type");
    __publicField(this, "notnull");
    __publicField(this, "dfltValue");
    __publicField(this, "pk");
    __publicField(this, "cid");
    this.suiSql = params.suiSql;
    this.name = params.name;
    this.type = params.type;
    this.notnull = params.notnull === true || params.notnull === "1" || params.notnull === 1;
    this.dfltValue = params.dfltValue;
    this.pk = params.pk === true || params.pk === "1" || params.pk === 1;
    this.cid = parseInt("" + params.cid);
  }
}
//# sourceMappingURL=SuiSqlField.js.map
