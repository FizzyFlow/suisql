var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { int32ToUint8ArrayBE, concatUint8Arrays, compress, decompress } from "./SuiSqlUtils";
import SuiSqlBinaryPatch from "./SuiSqlBinaryPatch";
class SuiSqliteBinaryView {
  constructor(params) {
    __publicField(this, "binary");
    // private walrusClient?: WalrusClient;
    __publicField(this, "createdAt");
    this.binary = Uint8Array.from(params.binary);
    this.createdAt = Date.now();
  }
  async getPatched(binaryPatch) {
    const decompressed = await decompress(binaryPatch);
    const pageSize = this.getPageSize();
    let maxPageNumber = this.getPagesCount() - 1;
    const pages = {};
    let pos = 0;
    while (pos < decompressed.length) {
      const command = decompressed[pos];
      if (command == 0) {
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
  async getBinaryPatch(comparedTo) {
    const pageSize1 = comparedTo.getPageSize();
    const pageSize2 = this.getPageSize();
    if (pageSize1 != pageSize2) {
      return null;
    }
    const pageCount1 = comparedTo.getPagesCount();
    const pageCount2 = this.getPagesCount();
    const patchParts = [];
    for (let i = 0; i < pageCount2; i++) {
      if (pageCount1 <= i) {
        const page2 = this.getPage(i);
        patchParts.push(new Uint8Array([0]));
        patchParts.push(int32ToUint8ArrayBE(i));
        patchParts.push(page2);
      } else {
        const sha256_2 = await this.getPageSha256(i);
        const sha256_1 = await comparedTo.getPageSha256(i);
        if (sha256_1 != sha256_2) {
          const page1 = comparedTo.getPage(i);
          const page2 = this.getPage(i);
          const diff = SuiSqlBinaryPatch.binaryDiff(page1, page2);
          console.log("patch", diff);
          patchParts.push(new Uint8Array([1]));
          patchParts.push(int32ToUint8ArrayBE(i));
          patchParts.push(int32ToUint8ArrayBE(diff.length));
          patchParts.push(diff);
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
  getPage(pageNumber) {
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
  async getPageSha256(pageNumber) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", this.getPage(pageNumber));
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  checkHeaderIsOk() {
    const header = this.binary.slice(0, 16);
    const expected = new TextEncoder().encode("SQLite format 3\0");
    if (new TextDecoder().decode(header) == new TextDecoder().decode(expected)) {
      return true;
    }
    return false;
  }
  checkLooksValid() {
    if (this.binary.length == this.getPageSize() * (this.getPagesCount() - 1)) {
      return true;
    }
    return false;
  }
  getSize() {
    return this.binary.length;
  }
  getPageSize() {
    const data = this.binary.slice(16, 18);
    if (data[0] == 0 && data[1] == 1) {
      return 65536;
    }
    return data[0] * 256 + data[1];
  }
  getPagesCount() {
    return new DataView(this.binary.buffer, 28).getUint32(0, false) + 1;
  }
  getFileChangeCounter() {
    return new DataView(this.binary.buffer, 24).getUint32(0, false);
  }
}
export {
  SuiSqliteBinaryView as default
};
//# sourceMappingURL=SuiSqliteBinaryView.js.map
