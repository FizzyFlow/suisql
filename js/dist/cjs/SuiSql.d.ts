import SuiSqlStatement from './SuiSqlStatement';
import SuiSqlSync from './SuiSqlSync';
import type { SuiSqlSyncToBlobckchainParams } from './SuiSqlSync';
import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';
import SuiSqlField from './SuiSqlField';
import type { BindParams } from './SuiSqlLibrarian';
import { CustomSignAndExecuteTransactionFunction } from "./SuiSqlBlockchain";
import SuiSqliteBinaryView from './SuiSqliteBinaryView';
import type { SuiSqlWalrusWalrusClient } from './SuiSqlWalrus';
type SuiSqlParams = {
    debug?: boolean;
    id?: string;
    name?: string;
    network?: string;
    suiClient: SuiClient;
    signer?: Signer;
    signAndExecuteTransaction?: CustomSignAndExecuteTransactionFunction;
    currentWalletAddress?: string;
    walrusClient?: SuiSqlWalrusWalrusClient;
    publisherUrl?: string;
    aggregatorUrl?: string;
};
declare enum State {
    INITIALIZING = "INITIALIZING",
    EMPTY = "EMPTY",
    ERROR = "ERROR",
    OK = "OK"
}
export default class SuiSql {
    id?: string;
    name?: string;
    private suiClient?;
    suiSqlSync?: SuiSqlSync;
    state: State;
    private statements;
    private _db;
    private librarian;
    private __initializationPromise;
    private paramsCopy?;
    mostRecentWriteChangeTime?: number;
    binaryView?: SuiSqliteBinaryView;
    initialBinaryView?: SuiSqliteBinaryView;
    constructor(params: SuiSqlParams);
    getBinaryView(): SuiSqliteBinaryView | null;
    getBinaryPatch(): Promise<Uint8Array | null>;
    getExpectedBlobId(): Promise<bigint | null>;
    applyBinaryPatch(binaryPatch: Uint8Array): Promise<boolean>;
    database(idOrName: string): Promise<SuiSql | null>;
    get db(): {
        close(): void;
        create_function(name: string, func: (...args: any[]) => any): /*elided*/ any;
        each(sql: string, params: BindParams, callback: import("sql.js").ParamsCallback, done: () => void): /*elided*/ any;
        each(sql: string, callback: import("sql.js").ParamsCallback, done: () => void): /*elided*/ any;
        exec(sql: string, params?: BindParams): import("sql.js").QueryExecResult[];
        export(): Uint8Array;
        getRowsModified(): number;
        handleError(): null | never;
        iterateStatements(sql: string): {
            getRemainingSQL(): string;
            next(): import("sql.js").StatementIteratorResult;
            [Symbol.iterator](): Iterator<{
                bind(values?: BindParams): boolean;
                free(): boolean;
                freemem(): void;
                get(params?: BindParams): import("sql.js").SqlValue[];
                getAsObject(params?: BindParams): import("sql.js").ParamsObject;
                getColumnNames(): string[];
                getNormalizedSQL(): string;
                getSQL(): string;
                reset(): void;
                run(values?: BindParams): void;
                step(): boolean;
            }>;
        };
        prepare(sql: string, params?: BindParams): {
            bind(values?: BindParams): boolean;
            free(): boolean;
            freemem(): void;
            get(params?: BindParams): import("sql.js").SqlValue[];
            getAsObject(params?: BindParams): import("sql.js").ParamsObject;
            getColumnNames(): string[];
            getNormalizedSQL(): string;
            getSQL(): string;
            reset(): void;
            run(values?: BindParams): void;
            step(): boolean;
        };
        run(sql: string, params?: BindParams): /*elided*/ any;
    } | null;
    get writeExecutions(): {
        at: number;
        sql: string;
        params: BindParams;
    }[];
    replace(data: Uint8Array): boolean;
    initialize(): Promise<State>;
    sync(params?: SuiSqlSyncToBlobckchainParams): Promise<void>;
    fillExpectedWalrus(): Promise<void>;
    markAsOk(): void;
    /**
     * Execute an SQL query, ignoring the rows it returns.
     */
    run(sql: string, params: BindParams): Promise<boolean>;
    /**
     * Prepare an SQL statement
     *
     * @param {string} sql a string of SQL, that can contain placeholders (?, :VVV, :AAA, @AAA)
     * @param {array|object} params values to bind to placeholders
     */
    prepare(sql: string, params?: BindParams): Promise<SuiSqlStatement>;
    /**
     * Prepare an SQL statement and return all available results immediately
     *
     * @param {string} sql a string of SQL, that can contain placeholders (?, :VVV, :AAA, @AAA)
     * @param {array|object} params values to bind to placeholders
     */
    query(sql: string, params?: BindParams): Promise<Array<any>>;
    /**
     * Run an sql text containing many sql queries, one by one, ignoring return data. Returns the count of processed queries.
     */
    iterateStatements(sql: string): Promise<number>;
    listTables(): Promise<(string | number | Uint8Array<ArrayBufferLike> | null)[]>;
    describeTable(tableName: string): Promise<SuiSqlField[]>;
    /**
     * Export the database as SqlLite binary representation
     */
    export(): Uint8Array | null;
}
export {};
