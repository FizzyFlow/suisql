import type SuiSql from "./SuiSql";
type SuiSqlFieldParams = {
    suiSql: SuiSql;
    cid: string | number;
    name: string;
    type: string;
    notnull: boolean | number | string;
    dfltValue?: null | string | undefined;
    pk: boolean | number | string;
};
export default class SuiSqlField {
    private suiSql;
    private name;
    private type;
    private notnull;
    private dfltValue?;
    private pk;
    private cid;
    constructor(params: SuiSqlFieldParams);
}
export {};
