import type SuiSql from "./SuiSql.js";

type SuiSqlFieldParams = {
    suiSql: SuiSql,

    // below are fields from select * from pragma_table_info(?), normalized
    cid: string | number, // column id
    name: string, 
    type: string,                                                    
    notnull: boolean | number | string,                  
    dfltValue?: null | string | undefined,
    pk: boolean | number | string,          
};


export default class SuiSqlField {
    private suiSql: SuiSql;
    private name: string;
    private type: string;
    private notnull: boolean;
    private dfltValue?: null | string;
    private pk: boolean;

    private cid: number;


    constructor(params: SuiSqlFieldParams) {
        this.suiSql = params.suiSql;
        this.name = params.name;
        this.type = params.type;
        this.notnull = (params.notnull === true || params.notnull === '1' || params.notnull === 1);
        this.dfltValue = params.dfltValue;
        this.pk = (params.pk === true || params.pk === '1' || params.pk === 1);
        this.cid = parseInt((''+params.cid));
    }
}