/**
 * Compress Uint8Array
 */
declare const compress: (input: Uint8Array) => Promise<Uint8Array>;
/**
 * Decompress zlib compresses Uint8Array
 */
declare const decompress: (compressed: Uint8Array) => Promise<Uint8Array>;
/**
 * Makes a shallow copy of object, array or primitive
 */
declare const anyShallowCopy: (input: Object | Array<any> | any) => Object | Array<any> | any;
/**
 * Determine if SQL statement 100% updates database state
 */
declare const isSureWriteSql: (sql: string) => boolean;
declare const getFieldsFromCreateTableSql: (sql: string) => Array<string> | null;
declare const int32ToUint8ArrayBE: (num: number) => Uint8Array<ArrayBuffer>;
declare const bigintToUint8Array: (bigint: bigint) => Uint8Array<ArrayBufferLike>;
declare const idTo64: (id: bigint | number | string) => string;
declare const walrus64ToBigInt: (v: string) => bigint;
declare const concatUint8Arrays: (arrays: Uint8Array[]) => Uint8Array<ArrayBuffer>;
declare function blobIdFromInt(blobId: bigint | string): string;
declare function blobIdFromBytes(blobId: Uint8Array): string;
declare function blobIdIntFromBytes(blobId: Uint8Array): bigint;
declare function blobIdToInt(blobId: string): bigint;
export { anyShallowCopy, isSureWriteSql, compress, decompress, getFieldsFromCreateTableSql, int32ToUint8ArrayBE, bigintToUint8Array, idTo64, walrus64ToBigInt, concatUint8Arrays, blobIdFromInt, blobIdFromBytes, blobIdToInt, blobIdIntFromBytes, };
