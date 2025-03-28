import type { Statement, BindParams, Database } from "sql.js";
export type { Statement, BindParams, Database, };
export default class SuiSqlLibrarian {
    isReady: boolean;
    private SQLC;
    constructor();
    getLib(): Promise<Function>;
    loadScript(): Promise<Function>;
    init(): Promise<boolean>;
    fromBinarySync(binary: Uint8Array): Database | null;
    fromBinary(binary?: Uint8Array): Promise<Database | null>;
}
