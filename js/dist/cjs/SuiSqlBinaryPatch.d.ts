export default class SuiSqlBinaryPatch {
    /**
     * Applies a binary patch to an original Uint8Array.
     * @param {Uint8Array} original - The original array to be patched.
     * @param {Uint8Array} binaryPatch - The binary patch to apply.
     * @returns {Uint8Array} - The patched array.
     */
    static applyPatch(original: Uint8Array, binaryPatch: Uint8Array): Uint8Array<ArrayBuffer>;
    static compressedBinaryDiff(a: Uint8Array, b: Uint8Array): Promise<Uint8Array<ArrayBufferLike>>;
    static binaryDiff(a: Uint8Array, b: Uint8Array): Uint8Array<ArrayBuffer>;
    static diff(a: Uint8Array, b: Uint8Array): {
        start: number;
        length: number;
        newBytes: Uint8Array<ArrayBuffer>;
    }[];
    static encodeFixedLengthPatch(patch: any[]): Uint8Array<ArrayBuffer>;
    static concatUint8Arrays(arrays: Uint8Array[]): Uint8Array<ArrayBuffer>;
}
