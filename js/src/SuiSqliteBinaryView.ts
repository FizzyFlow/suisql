

type SuiSqliteBinaryViewParams = {
    binary: Uint8Array,
};

// import { WalrusClient } from '@mysten/walrus';

import { int32ToUint8ArrayBE, concatUint8Arrays, compress, decompress, blobIdToInt, blobIdFromBytes } from './SuiSqlUtils';
import SuiSqlBinaryPatch from './SuiSqlBinaryPatch';

import SuiSqlWalrus from './SuiSqlWalrus';

// import { BlobEncoder } from '@mysten/walrus-wasm';
// import { bcs } from '@mysten/sui/bcs';

// export const BcsEncodingType = bcs
// 	.enum('EncodingType', {
// 		RedStuff: null,
// 		RS2: null,
// 	})
// 	.transform({
// 		input: (
// 			encodingType:
// 				| { RedStuff: boolean | object | null }
// 				| { RS2: boolean | object | null }
// 				| 'RedStuff'
// 				| 'RS2',
// 		) =>
// 			typeof encodingType === 'string'
// 				? ({ [encodingType]: null } as Exclude<typeof encodingType, string>)
// 				: encodingType,
// 		output: (encodingType) => encodingType,
// 	});

export default class SuiSqliteBinaryView {
    public binary: Uint8Array;
    // private walrusClient?: WalrusClient;
    createdAt?: number;

    constructor(params: SuiSqliteBinaryViewParams) {
        // note that SuiSqliteBinaryView expected to have Uint8Array of initialized buffer, not a subset of it
        this.binary = Uint8Array.from(params.binary);

        // this.walrusClient = new WalrusClient({
        //     network: 'testnet',
        //     suiRpcUrl: 'https://fullnode.testnet.sui.io:443',
        // });

        this.createdAt = Date.now();
    }

    async getPatched(binaryPatch: Uint8Array): Promise<Uint8Array> {
        const decompressed = await decompress(binaryPatch);
        const pageSize = this.getPageSize();

        let maxPageNumber = this.getPagesCount() - 1;

        const pages: { [key: number]: Uint8Array } = {};

        // read the patch
        let pos = 0;
        while (pos < decompressed.length) {
            const command = decompressed[pos];
            if (command == 0) {
                // add new page
                pos++;
                const pageNumber = new DataView(decompressed.buffer, pos).getUint32(0, false);
                pos = pos + 4;
                const page = decompressed.slice(pos, pos + pageSize);
                pos = pos + pageSize;

                if (pageNumber > maxPageNumber) {
                    maxPageNumber = pageNumber;
                }
                pages[pageNumber] = page;
            } else if (command == 1) {
                // patch page
                pos++;
                const pageNumber = new DataView(decompressed.buffer, pos).getUint32(0, false);
                pos = pos + 4;
                const patchSize = new DataView(decompressed.buffer, pos).getUint32(0, false);
                pos = pos + 4;
                const patch = decompressed.slice(pos, pos + patchSize);

                console.log(patch);

                const current = this.getPage(pageNumber);
                const patched = SuiSqlBinaryPatch.applyPatch(current, patch);
                pos = pos + patchSize;

                if (pageNumber > maxPageNumber) {
                    maxPageNumber = pageNumber;
                }
                pages[pageNumber] = patched;
            }
        }


        const ret = [];
        for (let i = 0; i <= maxPageNumber; i++) {
            if (pages[i]) {
                ret.push(pages[i]);
            } else {
                ret.push(this.getPage(i));
            }
        }

        return concatUint8Arrays(ret);
    }

    async getBinaryPatch(comparedTo: SuiSqliteBinaryView) {
        const pageSize1 = comparedTo.getPageSize();
        const pageSize2 = this.getPageSize();

        if (pageSize1 != pageSize2) {
            // we can't make the patch, full re-sync needed
            return null;
        }

        const pageCount1 = comparedTo.getPagesCount();
        const pageCount2 = this.getPagesCount();

        const patchParts = [];

        for (let i = 0; i < pageCount2; i++) {
            if (pageCount1 <= i) {
                // there was no such page in the comparedTo
                const page2 = this.getPage(i);
                patchParts.push(new Uint8Array([0]));    // 0 means "add new page"
                patchParts.push(int32ToUint8ArrayBE(i)); // page number
                patchParts.push(page2);                   // 
                // page size is the same as in original, so we don't need size of it
            } else {
                const sha256_2 = await this.getPageSha256(i);
                const sha256_1 = await comparedTo.getPageSha256(i);

                if (sha256_1 != sha256_2) {
                    // page changed
                    const page1 = comparedTo.getPage(i);
                    const page2 = this.getPage(i);

                    const diff = SuiSqlBinaryPatch.binaryDiff(page1, page2);
                    console.log('patch', diff);

                    patchParts.push(new Uint8Array([1]));    // 1 means "patch page"
                    patchParts.push(int32ToUint8ArrayBE(i)); // page number
                    patchParts.push(int32ToUint8ArrayBE(diff.length)); // patch length
                    patchParts.push(diff);                   //
                }                    
            }
        }

        return await compress(concatUint8Arrays(patchParts));
    }

    /**
     * Returns binary of SqlLite format page. Little difference is that:
     * - page is 1-based, so first page 
     * - page 0 is the header ( 100 bytes as per Sqlite format )
     * - page 1 is the first page of the database, and its size is (page size - 100 bytes) size
     * @param pageNumber 
     * @returns 
     */
    getPage(pageNumber: number): Uint8Array {
        if (pageNumber == 0) {
            return this.binary.subarray(0, 100);
        }

        const pageSize = this.getPageSize();

        if (pageNumber == 1) {
            return this.binary.subarray(100, pageSize);
        }
        const offset = (pageNumber - 1) * pageSize;

        return this.binary.subarray(offset, offset + pageSize);
    }

    async getPageSha256(pageNumber: number) {
        const digest = await globalThis.crypto.subtle.digest("SHA-256", this.getPage(pageNumber));
        return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    checkHeaderIsOk() {
        // first 16 bytes of the Sqlite database is the the header string: "SQLite format 3\000"
        const header = this.binary.slice(0, 16);
        const expected = (new TextEncoder().encode('SQLite format 3\0'));
        if ((new TextDecoder().decode(header)) == (new TextDecoder().decode(expected))) {
            return true;
        }
        return false;
    }

    checkLooksValid() {
        // header is the part of 1st page
        if (this.binary.length == this.getPageSize() * (this.getPagesCount() - 1) ) {
            return true;
        }

        return false;
    }

    getSize() {
        return this.binary.length;
    }

    getPageSize() {
        //offset 16, 2 bytes
        //The database page size in bytes. Must be a power of two between 512 and 32768 inclusive, or the value 1 representing a page size of 65536.
        const data = this.binary.slice(16, 18);
        if (data[0] == 0 && data[1] == 1) {
            return 65536;
        }
        return data[0] * 256 + data[1];
    }

    getPagesCount() {
        //28	4	Size of the database file in pages. The "in-header database size".
        // as extra, we represent header (first 100 bytes) as page 0, while page 1
        return new DataView(this.binary.buffer, 28).getUint32(0, false) + 1;
    }

    getFileChangeCounter() {
        // 24	4	File change counter.
        return new DataView(this.binary.buffer, 24).getUint32(0, false);
    }

}