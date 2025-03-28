import pako from 'pako';

/**
 * Compress Uint8Array
 */
const compress = async (input: Uint8Array): Promise<Uint8Array> => {
    return pako.deflate(input);
};

/**
 * Decompress zlib compresses Uint8Array
 */
const decompress = async (compressed: Uint8Array): Promise<Uint8Array> => {
    return pako.inflate(compressed);
}

/**
 * Makes a shallow copy of object, array or primitive
 */
const anyShallowCopy = (input: Object|Array<any>|any): Object|Array<any>|any => {
    if (Array.isArray(input)) {
        return [...input]; // Shallow copy of array
    } else if (typeof input === 'object' && input !== null) {
        return { ...input }; // Shallow copy of object
    } else {
        return input; // Return as is for non-objects (primitives)
    }
};

/**
 * Determine if SQL statement 100% updates database state
 */
const isSureWriteSql = (sql: string) => {
    const checks = ['CREATE', 'ALTER', 'INSERT', 'UPDATE', 'DELETE', 'DROP'];
    for (const check of checks) {
        if (sql.trim().toUpperCase().startsWith(check)) {
            return true;
        }
    }
    return false;
};

const getFieldsFromCreateTableSql = (sql: string): Array<string> | null => {
    const inParentheses = extractTopLevelParenthesesText( sql.split("\n").join(' ') );

    if (!inParentheses || !inParentheses[0]) {
        return null;
    }
    const fields = inParentheses[0].split(',');

    const ret = [];
    for (const field of fields) {
        const definition = field.trim().toLowerCase();
        ret.push(definition);
    }

    console.log(ret);
    console.log(ret);

    return ret;
};


const extractTopLevelParenthesesText = (str: string): Array<string> => {
    let result = [];
    let stack = [];
    let startIndex = -1;

    for (let i = 0; i < str.length; i++) {
        if (str[i] === '(') {
            if (stack.length === 0) {
                startIndex = i + 1; // Start after '('
            }
            stack.push('(');
        } else if (str[i] === ')') {
            stack.pop();
            if (stack.length === 0 && startIndex !== -1) {
                result.push(str.substring(startIndex, i));
                startIndex = -1; // Reset for the next top-level match
            }
        }
    }

    return result;
}

const int32ToUint8ArrayBE = (num: number) => Uint8Array.from([num >>> 24, num >>> 16 & 0xff, num >>> 8 & 0xff, num & 0xff]);


const concatUint8Arrays = (arrays: Uint8Array[]) => {
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
    isSureWriteSql, 
    compress, 
    decompress,
    getFieldsFromCreateTableSql,
    int32ToUint8ArrayBE,
    concatUint8Arrays,
};