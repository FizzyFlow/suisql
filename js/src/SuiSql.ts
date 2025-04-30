// import initSqlJs from 'sql.js';
import SuiSqlStatement from './SuiSqlStatement.js';
import SuiSqlSync from './SuiSqlSync.js';

import type { SuiSqlSyncToBlobckchainParams } from './SuiSqlSync.js';

// import type { Database, BindParams } from "sql.js";
import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';

// import { getFieldsFromCreateTableSql } from './SuiSqlUtils';
import SuiSqlField from './SuiSqlField.js';
import SuiSqlLibrarian from './SuiSqlLibrarian.js';

import type { Database, BindParams } from './SuiSqlLibrarian.js';

import { CustomSignAndExecuteTransactionFunction } from "./SuiSqlBlockchain.js";

import SuiSqliteBinaryView from './SuiSqliteBinaryView.js';

import SuiSqlLog from './SuiSqlLog.js';

import type { SuiSqlWalrusWalrusClient } from './SuiSqlWalrus.js';

type SuiSqlParams = {
    debug?: boolean,

    id?: string,                            // id of the database, if not provided, name is used
    name?: string,                          // name of the database, if no id is provided, SuiSql will look up for the database by name

    network?: string, // 'testnet' | 'mainnet'

    suiClient: SuiClient,                    // always needed, pass the one connected to needed network RPC
    signer?: Signer,                          // for write operations (both for sui and walrus)
    signAndExecuteTransaction?: CustomSignAndExecuteTransactionFunction, // for dApp, wrap wallet adapter signAndExecuteTransaction into this
    currentWalletAddress?: string,            // address of the connected wallet for write operations (both for sui and walrus)

    walrusClient?: SuiSqlWalrusWalrusClient,  // optional, either walrusClient (to read) or walrusClient + signer (to read/write)
    publisherUrl?: string,                    // or publisherUrl + currentWalletAddress ( to write )
    aggregatorUrl?: string,                   // better specify this always, as it's faster to read from aggregator than from walrusClient
};

enum State {
    INITIALIZING = 'INITIALIZING',
    EMPTY = 'EMPTY',
    ERROR = 'ERROR',
    OK = 'OK',
};

export default class SuiSql {

    public id?: string;
    public name?: string;

    private suiClient?: SuiClient;

    public suiSqlSync?: SuiSqlSync;
    public state: State = State.INITIALIZING;
    private statements: Array<SuiSqlStatement> = [];
    private _db: Database | null = null;
    // private _SQL: initSqlJs.SqlJsStatic | null = null;

    private librarian = new SuiSqlLibrarian();

    private __initializationPromise: Promise<State> | null = null;

    private paramsCopy?: SuiSqlParams;

    public mostRecentWriteChangeTime?: number; // time at which the most recent write operation was done

    public binaryView?: SuiSqliteBinaryView;
    public initialBinaryView?: SuiSqliteBinaryView;

    constructor(params: SuiSqlParams) {
        // this._SQL = null;
        this.paramsCopy = {...params};

        if (params.debug !== undefined) {
            SuiSqlLog.switch(params.debug);
        }

        if (params.id && params.name) {
            throw new Error('either id or name can be provided, not both');
        }

        if (params.id) {
            this.id = params.id;
        }
        if (params.name) {
            this.name = params.name;
        }
        if (params.suiClient) {
            
            this.suiClient = params.suiClient;

            if (this.id || this.name) {
                this.suiSqlSync = new SuiSqlSync({
                    suiSql: this,

                    id: this.id,
                    name: this.name,
                    
                    suiClient: this.suiClient,
                    
                    signer: params.signer,
                    signAndExecuteTransaction: params.signAndExecuteTransaction,
                    currentWalletAddress: params.currentWalletAddress,
                    
                    network: params.network,

                    walrusClient: params.walrusClient,
                    publisherUrl: params.publisherUrl,
                    aggregatorUrl: params.aggregatorUrl,
                });
            }
        } else {
            throw new Error('SuiClient is required');
        }
    }

    get network() {
        if (this.suiSqlSync) {
            return this.suiSqlSync.network;
        }
        return null;
    }

    /**
     * DB Base Walrus Blob ID ( in base64 format, the one for urls )
     */
    get walrusBlobId() {
        if (this.suiSqlSync) {
            return this.suiSqlSync.walrusBlobId;
        }
        return null;
    }

    get walrusEndEpoch() {
        if (this.suiSqlSync) {
            return this.suiSqlSync.walrusEndEpoch;
        }
        return null;
    }

    async hasWriteAccess() {
        if (this.suiSqlSync) {
            return await this.suiSqlSync.hasWriteAccess();
        }
        return false;
    }

    hasUnsavedChanges() {
        if (this.suiSqlSync) {
            return this.suiSqlSync.hasUnsavedChanges();
        }
        return false;
    }

    unsavedChangesCount() {
        if (this.suiSqlSync) {
            return this.suiSqlSync.unsavedChangesCount();
        }
        return 0;
    }

    getBinaryView() {
        if (!this.binaryView || 
            (this.binaryView && this.mostRecentWriteChangeTime &&
                (!this.binaryView.createdAt || this.binaryView.createdAt < this.mostRecentWriteChangeTime) ) ) {

            const data = this.export();
            if (data) {
                this.binaryView = new SuiSqliteBinaryView({
                    binary: data,
                });
            }
        }

        if (this.binaryView) {
            return this.binaryView;
        }

        return null;
    }

    async getBinaryPatch(): Promise<Uint8Array | null> {
        const currentBinaryView = this.getBinaryView();
        if (this.initialBinaryView && currentBinaryView) {
            const binaryPatch = await currentBinaryView.getBinaryPatch(this.initialBinaryView);
            return binaryPatch;
        }
        return null;
    }

    async getExpectedBlobId(): Promise<bigint | null> {
        const data = this.export();
        if (data && this.suiSqlSync && this.suiSqlSync.walrus) {
            return await this.suiSqlSync.walrus.calculateBlobId(data);
        }
        return null;
    }

    async applyBinaryPatch(binaryPatch: Uint8Array) {
        const currentBinaryView = this.getBinaryView();
        if (!currentBinaryView) {
            return false;
        }

        const patched = await currentBinaryView.getPatched(binaryPatch);
        this.replace(patched);

        return true;
    }

    async listDatabases(callback?: Function) {
        if (this.suiSqlSync && this.suiSqlSync.chain) {
            return await this.suiSqlSync.chain.listDatabases(callback);
        }
        return null;
    }

    /**
     * Initialize a database re-using configuration of the current one, so only the id or name is required
     * @param idOrName suiSql database id or name
     */
    async database(idOrName: string): Promise<SuiSql | null> {
        if (!this.paramsCopy) {
            return null;
        }

        const paramsCopy = {...this.paramsCopy};
        if (idOrName.startsWith('0x')) {
            paramsCopy.id = idOrName;
            delete paramsCopy.name;
        } else {
            paramsCopy.name = idOrName;
            delete paramsCopy.id;
        }

        const db = new SuiSql(paramsCopy);
        await db.initialize();

        return db;
    }

    get db() {
        return this._db;
    }

    get writeExecutions() {
        const ret = [];
        for (const stmt of this.statements) {
            ret.push(...stmt.writeExecutions);
        }

        return ret;
    }

    replace(data: Uint8Array) {
        if (this.librarian.isReady) {
            this.binaryView = undefined;
            this.initialBinaryView = new SuiSqliteBinaryView({
                binary: data,
            });;

            this._db = this.librarian.fromBinarySync(data);
            this.mostRecentWriteChangeTime = Date.now();

            return true;
        }
        return false;
    }

    async initialize() {
        if (this.__initializationPromise) {
            return await this.__initializationPromise;
        }

        let __initializationPromiseResolver: Function = () => {};
        this.__initializationPromise = new Promise((resolve) => {
            __initializationPromiseResolver = resolve;
        });

        SuiSqlLog.log('initializing SuiSql database...', this.paramsCopy);

        try {
            this.state = State.EMPTY;
            this._db = await this.librarian.fromBinary();
    
            try {
                if (this.suiSqlSync) {
                    await this.suiSqlSync.syncFromBlockchain();
                    // that would also update this.state to OK in case there is something synced from the chain
    
                    this.id = this.suiSqlSync.id;
                    if (!this.id) {
                        SuiSqlLog.log('error initilizing');

                        this.state = State.ERROR;
                    } else {
                        SuiSqlLog.log('db id', this.id);
                        this.mostRecentWriteChangeTime = Date.now();

                        if (this.suiSqlSync.hasBeenCreated) {
                            SuiSqlLog.log('database is freshly created');

                            this.state = State.EMPTY;
                        } else {
                            // SuiSqlLog.log('database is synced from the blockchain');

                            this.state = State.OK;
                        }

                        // make a binary view of the database to calculate binary patches later
                        let data = this.export();
                        if (data) {
                            if (data.length == 0) {
                                await this.touch();
                                const redata = this.export();
                                if (redata) {
                                    data = redata;
                                }
                            }

                            this.initialBinaryView = new SuiSqliteBinaryView({
                                binary: data,
                            });
                        }
                    }
                }
            } catch (e) {
                SuiSqlLog.log('error', e);
                this.state = State.ERROR;
            }
        } catch (e) {
            SuiSqlLog.log('error', e);
            this.state = State.ERROR;
        }

        __initializationPromiseResolver(this.state);

        return this.state;
    }

    async sync(params?: SuiSqlSyncToBlobckchainParams) {
        if (this.suiSqlSync) {
            const success = await this.suiSqlSync.syncToBlockchain(params);
            if (success) {
                this.binaryView = undefined;
                const data = this.export();
                if (data) {
                    this.initialBinaryView = new SuiSqliteBinaryView({
                        binary: data,
                    });;
                } else {
                    this.initialBinaryView = undefined;
                }
            }
        } else {
            throw new Error('not enough initialization params to sync');
        }
    }

    async fillExpectedWalrus() {
        if (this.suiSqlSync) {
            await this.suiSqlSync.fillExpectedWalrus();
        } else {
            throw new Error('not enough initialization params to sync');
        }
    }

    async extendWalrus(extendedEpochs: number = 1) {
        await this.initialize();
        
        if (this.suiSqlSync) {
            await this.suiSqlSync.extendWalrus(extendedEpochs);
        } else {
            throw new Error('not enough initialization params to sync');
        }
    }

    markAsOk() {
        this.state = State.OK;
    }

    /**
     * Execute an SQL query, ignoring the rows it returns.
     */
    async run(sql: string, params: BindParams) {
        SuiSqlLog.log('run', sql, params);

        await this.initialize();

        const suiSqlStatement = new SuiSqlStatement({
            suiSql: this,
            sql: sql,
        });
        this.statements.push(suiSqlStatement);
        if (params != null) {
            suiSqlStatement.bind(params);
        }
        suiSqlStatement.run();

        return true;
    }

    /**
     * Prepare an SQL statement
     * 
     * @param {string} sql a string of SQL, that can contain placeholders (?, :VVV, :AAA, @AAA)
     * @param {array|object} params values to bind to placeholders
     */
    async prepare(sql: string, params?: BindParams) {
        SuiSqlLog.log('prepare', sql, params);

        await this.initialize();

        const suiSqlStatement = new SuiSqlStatement({
            suiSql: this,
            sql: sql,
        });
        if (params != null) {
            suiSqlStatement.bind(params);
        }
        this.statements.push(suiSqlStatement);

        return suiSqlStatement;
    }

    /**
     * Prepare an SQL statement and return all available results immediately
     * 
     * @param {string} sql a string of SQL, that can contain placeholders (?, :VVV, :AAA, @AAA)
     * @param {array|object} params values to bind to placeholders
     */
    async query(sql: string, params?: BindParams): Promise<Array<any>> {
        SuiSqlLog.log('query', sql, params);

        await this.initialize();

        const prepared = await this.prepare(sql, params);
        const ret = [];
        while (prepared.step()) {
            ret.push(prepared.getAsObject());
        }

        SuiSqlLog.log('query results', ret);

        return ret;
    }

    /**
     * Run an sql text containing many sql queries, one by one, ignoring return data. Returns the count of processed queries.
     */
    async iterateStatements(sql: string): Promise<number> {
        SuiSqlLog.log('iterateStatements', sql);

        await this.initialize();

        if (!this.db) {
            return 0;
        }

        let count = 0;
        for (let statement of this.db.iterateStatements(sql)) {
            const suiSqlStatement = new SuiSqlStatement({
                suiSql: this,
                statement: statement,
            });
            suiSqlStatement.step();
            this.statements.push(suiSqlStatement);
            // do not call statement.free() manually, each statement is freed
            // before the next one is parsed

            count = count + 1;
        }

        return count;
    }

    async touch() {
        if (!this.db) {
            return false;
        }

        try {
            const rawStatement = this.db.prepare("VACUUM;");
            rawStatement.step();
            rawStatement.free();
        } catch (e) {
            console.error(e);
        }

        return true;
    }

    async listTables() {
        SuiSqlLog.log('listTables');

        await this.initialize();

        const tables = [];
        const q = await this.prepare("SELECT name FROM sqlite_master WHERE type='table';");
        while (q.step()) {
            const row = q.getAsObject();
            if (row) {
                tables.push(row.name);
            }
        }
        q.free();

        SuiSqlLog.log('listTables results', tables);

        return tables;
    }

    async describeTable(tableName: string) {
        SuiSqlLog.log('describeTable', tableName);

        await this.initialize();

        const fields: Array<SuiSqlField> = [];
        try {
            const q = await this.prepare("select * from pragma_table_info(?) as tblInfo;", [tableName] );

            await q.forEach((row: any) => {
                fields.push(new SuiSqlField({
                    suiSql: this,
                    name: row.name,
                    type: row.type,
                    notnull: row.notnull,
                    dfltValue: row.dflt_value,
                    pk: row.pk, 
                    cid: row.cid,
                }));
            });

            q.free();
        } catch (e) {
            console.error(e);
        }

        SuiSqlLog.log('describeTable results', fields);

        return fields;
    }

    /**
     * Export the database as SqlLite binary representation
     */
    export(): Uint8Array | null {
        if (this.db) {
            return this.db.export();
        }

        return null;
    }
        
}