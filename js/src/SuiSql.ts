import initSqlJs from 'sql.js';
import SuiSqlStatement from './SuiSqlStatement';
import SuiSqlSync from './SuiSqlSync';

import type { Database, BindParams } from "sql.js";
import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';

type SuiSqlParams = {
    id?: string,
    name?: string,
    suiClient?: SuiClient,
    walrusSuiClient?: SuiClient,
    signer?: Signer,
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
    private signer?: Signer;

    public sync?: SuiSqlSync;
    public state: State = State.INITIALIZING;
    private statements: Array<SuiSqlStatement> = [];
    private _db: Database | null = null;
    private _SQL: initSqlJs.SqlJsStatic | null = null;

    constructor(params?: SuiSqlParams) {
        this._SQL = null;

        if (params) {
            if (params.id) {
                this.id = params.id;
            }
            if (params.name) {
                this.name = params.name;
            }
            if (params.signer) {
                this.signer = params.signer;
            }
            if (params.suiClient) {
                this.suiClient = params.suiClient;
                this.sync = new SuiSqlSync({
                    id: this.id,
                    name: this.name,
                    suiClient: this.suiClient,
                    walrusSuiClient: params.walrusSuiClient,
                    signer: this.signer,
                    suiSql: this,
                });
            }
        }
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
        this._db = new this._SQL.Database(data);
    }

    async initialize() {
        this._SQL = await initSqlJs();
        this.state = State.EMPTY;
        this._db = new this._SQL.Database();

        try {
            if (this.sync) {
                await this.sync.syncFromBlockchain();
                // that would also update this.state to OK in case there is something synced from the chain

                this.id = this.sync.id;
            }
        } catch (e) {
            this.state = State.ERROR;
        }

        return this.state;
    }

    markAsOk() {
        this.state = State.OK;
    }

    /**
     * Execute an SQL query, ignoring the rows it returns.
     */
    async run(sql: string, params: BindParams) {
        const suiSqlStatement = new SuiSqlStatement({
            suiSql: this,
            sql: sql,
        });
        if (params != null) {
            suiSqlStatement.bind(params);
        }
        suiSqlStatement.run();
        this.statements.push(suiSqlStatement);

        return true;
    }

    /**
     * Prepare an SQL statement
     * 
     * @param {string} sql a string of SQL, that can contain placeholders (?, :VVV, :AAA, @AAA)
     * @param {array|object} params values to bind to placeholders
     */
    async prepare(sql: string, params: BindParams) {
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
     * Run an sql text containing many sql queries, one by one, ignoring return data. Returns the count of processed queries.
     */
    async iterateStatements(sql: string): Promise<number> {
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
}