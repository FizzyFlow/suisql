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

export { anyShallowCopy, isSureWriteSql, compress, decompress };