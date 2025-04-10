import type { Statement, BindParams, Database, SqlJsStatic } from "sql.js";
import initSqlJs from 'sql.js';

export type {
    Statement,
    BindParams,
    Database,
};

const isBrowser = Object.getPrototypeOf(
    Object.getPrototypeOf(globalThis)
  ) !== Object.prototype;

console.log('isBrowser', isBrowser);

export default class SuiSqlLibrarian {

    public isReady: boolean = false;
    private SQLC: SqlJsStatic | null = null;

    constructor() {
    }

    async getLib(): Promise<Function> {
        if (!isBrowser) {
            return initSqlJs;
        } else {
            return await this.loadScript();
        }
    }

    async loadScript(): Promise<Function> {
        if (window['initSqlJs']) {
            return window['initSqlJs'];
        }

        const promise = new Promise((res)=>{
            const imported = document.createElement('script');
            imported.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm-debug.js';
            imported.setAttribute("type", "text/javascript");
            document.head.appendChild(imported);
            imported.onload = () => {
                res(window['initSqlJs']);
            };
        });

        return ((await promise) as Function);
    }

    async init(): Promise<boolean> {
        if (this.SQLC && this.isReady) {
            return true;
        }

        const initSqlJsFunction = await this.getLib();
        if (isBrowser) {
            const SQLC: SqlJsStatic = await initSqlJsFunction({
                locateFile: (file: string) =>
                    `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`,
            });
            this.SQLC = SQLC;
            this.isReady = true;
        } else {
            const SQLC: SqlJsStatic = await initSqlJsFunction({
            });
            this.SQLC = SQLC;
            this.isReady = true;
        }

        return true;
    }

    fromBinarySync(binary: Uint8Array): Database | null {
        if (this.isReady && this.SQLC) {
            return new (this.SQLC.Database)(binary);
        }
        return null;        
    }

    async fromBinary(binary?: Uint8Array): Promise<Database | null> {
        await this.init();
        if (this.isReady && this.SQLC) {
            if (binary) {
                return new (this.SQLC.Database)(binary);
            } else {
                return new (this.SQLC.Database)();
            }
        } 
    
        return null;
    }
}