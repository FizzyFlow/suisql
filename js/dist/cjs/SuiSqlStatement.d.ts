import type SuiSql from "./SuiSql.js";
import type { Statement, BindParams } from "sql.js";
type SuiSqlStatementParams = {
    suiSql: SuiSql;
    statement?: Statement | undefined | null;
    sql?: string | undefined | null;
    params?: BindParams;
};
type WriteExecution = {
    at: number;
    sql: string;
    params: BindParams;
};
export default class SuiSqlStatement {
    private suiSql;
    private stmp;
    private sql;
    private params;
    private executedAt;
    writeExecutions: Array<WriteExecution>;
    constructor(params: SuiSqlStatementParams);
    bind(params: BindParams): void;
    step(): boolean | null;
    get(): import("sql.js").SqlValue[] | null;
    /**
     * Shorthand for bind + step + reset Bind the values, execute the statement, ignoring the rows it returns, and resets it
     */
    run(params?: null): void;
    /**
     * Reset a statement, so that its parameters can be bound to new values It also clears all previous bindings, freeing the memory used by bound parameters.
     */
    reset(): void;
    /**
     * Free the memory used by the statement
     */
    free(): boolean;
    getAsObject(): import("sql.js").ParamsObject | null;
    /**
     * Loop over results from db. Callback may be an async function, waited to be fulfilled to get the next item.
     * returns count of processed results.
     */
    forEach(callback: Function, maxCount?: number | undefined | null): Promise<number>;
}
export {};
