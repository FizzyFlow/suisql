import initSqlJs from 'sql.js';
import SuiSqlStatement from './SuiSqlStatement';
import SuiSqlSync from './SuiSqlSync';

import type { Database, BindParams } from "sql.js";
import type { SuiClient } from '@mysten/sui/client';
import type { Signer } from '@mysten/sui/cryptography';

type SuiSqlParams = {
    id?: string,
    suiClient?: SuiClient,
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
    private suiClient?: SuiClient;
    private signer?: Signer;

    public sync?: SuiSqlSync;
    public state: State = State.INITIALIZING;
    private statements: Array<SuiSqlStatement> = [];
    private _db: Database | null = null;
    private _SQL: initSqlJs.SqlJsStatic | null = null;

    constructor(params?: SuiSqlParams) {
        this._SQL = null;
        // this._state = null;
        // this._db = null;

        // this._statements = [];

        if (params) {
            if (params.id) {
                this.id = params.id;
            }
            if (params.suiClient) {
                this.suiClient = params.suiClient;
            }
            if (params.signer) {
                this.signer = params.signer;
            }
    
            this.sync = new SuiSqlSync({
                    id: this.id,
                    suiClient: this.suiClient,
                    signer: this.signer,
                    suiSql: this,
                });
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

    async initialize() {
        this._SQL = await initSqlJs();
        this.state = State.EMPTY;
        this._db = new this._SQL.Database();

        // this._state = SuiSql.EMPTY;

        // await this.run("CREATE TABLE test (col1, col2);");
        // await this.run("CREATE TABLE test2 (col21, col22);");
        // // // Insert two rows: (1,111) and (2,222)
        // await this.run("INSERT INTO test VALUES (?,?), (?,?)", [1,111,2,222]);
        // await this.run("INSERT INTO test VALUES (?,?), (?,?)", [1,111,2,222]);
        // await this.run("INSERT INTO test2 VALUES (?,?), (?,?)", [3,111,4,222]);

        // const data = this._db.export();
        // console.log(data);

        return this.state;
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