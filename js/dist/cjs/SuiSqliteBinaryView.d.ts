type SuiSqliteBinaryViewParams = {
    binary: Uint8Array;
};
export default class SuiSqliteBinaryView {
    binary: Uint8Array;
    private walrusClient?;
    createdAt?: number;
    constructor(params: SuiSqliteBinaryViewParams);
    getBinaryPatch(comparedTo: SuiSqliteBinaryView): Promise<Uint8Array<ArrayBufferLike> | null>;
    /**
     * Returns binary of SqlLite format page. Little difference is that:
     * - page is 1-based, so first page
     * - page 0 is the header ( 100 bytes as per Sqlite format )
     * - page 1 is the first page of the database, and its size is (page size - 100 bytes) size
     * @param pageNumber
     * @returns
     */
    getPage(pageNumber: number): Uint8Array;
    getPageSha256(pageNumber: number): Promise<string>;
    getPageWalrusBlobId(pageNumber: number): Promise<string | null>;
    checkHeaderIsOk(): boolean;
    checkLooksValid(): boolean;
    getSize(): number;
    getPageSize(): number;
    getPagesCount(): number;
    getFileChangeCounter(): number;
}
export {};
