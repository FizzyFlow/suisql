import pako from "pako";
const compress = async (input) => {
  return pako.deflate(input);
};
const decompress = async (compressed) => {
  return pako.inflate(compressed);
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
export {
  anyShallowCopy,
  compress,
  concatUint8Arrays,
  decompress,
  getFieldsFromCreateTableSql,
  int32ToUint8ArrayBE,
  isSureWriteSql
};
//# sourceMappingURL=SuiSqlUtils.js.map
