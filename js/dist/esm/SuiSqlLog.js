var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
const _SuiSqlLog = class _SuiSqlLog {
  static switch(onOff) {
    _SuiSqlLog._debug = onOff;
  }
  static log(...args) {
    if (!_SuiSqlLog._debug) {
      return;
    }
    let prefix = "SuiSql";
    args.unshift(this.constructor.name + " |");
    args.unshift(prefix);
    console.info.apply(null, args);
  }
};
__publicField(_SuiSqlLog, "_debug", false);
let SuiSqlLog = _SuiSqlLog;
;
export {
  SuiSqlLog as default
};
//# sourceMappingURL=SuiSqlLog.js.map
