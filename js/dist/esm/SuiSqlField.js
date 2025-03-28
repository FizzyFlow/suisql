var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
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
export {
  SuiSqlField as default
};
//# sourceMappingURL=SuiSqlField.js.map
