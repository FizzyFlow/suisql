import type SuiSql from "./SuiSql";
import type { Statement, BindParams } from "sql.js";
import { anyShallowCopy, isSureWriteSql } from "./SuiSqlUtils";

type SuiSqlStatementParams = {
    suiSql: SuiSql,
    statement?: Statement | undefined | null,
    sql?: string | undefined | null,
    params?: BindParams,
};

type WriteExecution = {
    at: number,
    sql: string,
    params: BindParams,
};

export default class SuiSqlStatement {
    private suiSql: SuiSql;
    private stmp: Statement | undefined | null = null;
    private sql: string | undefined | null = null;
    private params: BindParams = null;
    private executedAt: number | null = null;
    public writeExecutions: Array<WriteExecution> = [];

    constructor(params: SuiSqlStatementParams) {
        this.suiSql = params.suiSql;

        if (params.statement) {
            this.stmp = params.statement;
            this.sql = this.stmp.getSQL().trim();
        } else if (params.sql) {
            this.sql = params.sql.trim();
            if (this.suiSql.db) {
                this.stmp = this.suiSql.db.prepare(this.sql);
            }
        }
        
        if (!this.stmp || !this.sql) {
            throw new Error('either sql or statement param requried');
        }

        this.params = null;
        if (params.params) {
            this.bind(params.params);
        }

        this.executedAt = null;
        this.writeExecutions = [];
    }

    bind(params: BindParams) {
        this.params = params;
        if (this.stmp) {
            this.stmp.bind(params);
        }
    }

    step() {
        if (!this.stmp) {
            return null;
        }

        this.executedAt = Date.now();
        const stepResult = this.stmp.step();

        if (this.sql && isSureWriteSql(this.sql)) {
            this.writeExecutions.push({
                params: anyShallowCopy(this.params),
                sql: this.sql,
                at: this.executedAt,
            });
        }

        return stepResult;
    }

    get() {
        if (this.stmp) {
            return this.stmp.get();
        }
        return null;
    }

    /**
     * Shorthand for bind + step + reset Bind the values, execute the statement, ignoring the rows it returns, and resets it
     */
    run(params = null) {
        if (params) {
            this.bind(params);
        }
        this.step();
        this.reset();
    }

    /**
     * Reset a statement, so that its parameters can be bound to new values It also clears all previous bindings, freeing the memory used by bound parameters.
     */
    reset() {
        if (this.stmp) {
            return this.stmp.reset();
        }
    }

    /**
     * Free the memory used by the statement
     */
    free() {
        if (this.stmp) {
            return this.stmp.free();
        }
        return false;
    }

    getAsObject() {
        if (this.stmp) {
            return this.stmp.getAsObject();
        }
        return null;
    }

    /**
     * Loop over results from db. Callback may be an async function, waited to be fulfilled to get the next item.
     * returns count of processed results.
     */
    async forEach(callback: Function, maxCount: number | undefined | null) {
        let processedCount = 0;
        let needMore = true;
        while (needMore) {
            let hasData = this.step();

            if (hasData) {
                await callback(this.getAsObject());
                processedCount = processedCount + 1;
    
                if (maxCount && maxCount < processedCount) {
                    needMore = false;
                }
            } else {
                needMore = false;
            }
        }

        return processedCount;
    }
}