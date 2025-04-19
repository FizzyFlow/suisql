
import { describe, expect, it } from "vitest";

import SuiSql from "../src/SuiSql";
import { SuiMaster } from 'suidouble';

import walrusClientMock from './includes/sampleWalrusClient.js';

describe("set up empty db", () => {
    it("works", {}, async () => {

        // const path = require('path').join(__dirname, 'walrus_wasm_bg.wasm');
        // const bytes = require('fs').readFileSync(path);
        
        // console.log(bytes);
        // const wasmModule = new WebAssembly.Module(bytes);
        // const wasmInstance = new WebAssembly.Instance(wasmModule, imports);

        const phrase = "off head person candy multiply trend doll affair sketch weekend girl produce";
        // 0x50edd3b7a0f2c5b0093c541b9f28be1754a639f5ea8a7d45c9cd01563aae23b3
        const suiMasterTestnet = new SuiMaster({client: 'testnet', phrase: phrase, debug: true});
        await suiMasterTestnet.initialize();

        try {
            await suiMasterTestnet.requestSuiFromFaucet();
        } catch (e) {
            // ok, if you have testnet sui in wallet
            console.error(e);
        }

        // const walrusClient = new WalrusClient({
        //     network: 'testnet',
        //     wasmUrl: walrusClientMock,
        //     suiRpcUrl: 'https://fullnode.testnet.sui.io:443',
        // });

        const db = new SuiSql({
                name: 'new testdb 234433ffff23122 2231232',
                network: 'testnet',
                aggregatorUrl: 'https://aggregator.walrus-testnet.walrus.space',
                suiClient: suiMasterTestnet.client,
                walrusClient: walrusClientMock,
                signer: suiMasterTestnet.signer,
                debug: true,
            });

        const databases = await db.listDatabases();
        console.log(databases);
        return;

        const state = await db.initialize();



        expect(db.hasUnsavedChanges()).toBeFalsy();

        // await db.sync.syncFromBlockchain();

        if (state == 'EMPTY') {
            await db.iterateStatements(`
                DROP TABLE IF EXISTS employees;
                CREATE TABLE employees( id integer primary key,  name    text,
                              designation text,     manager integer,
                              hired_on    date,     salary  integer,
                              commission  float,    dept    integer);
    
                INSERT INTO employees VALUES (NULL,'JOHNSON','ADMIN',6,'1990-12-17',18000,NULL,4);
                INSERT INTO employees VALUES (NULL,'HARDING','MANAGER',9,'1998-02-02',52000,300,3);
                INSERT INTO employees VALUES (NULL,'TAFT','SALES I',2,'1996-01-02',25000,500,3);
                INSERT INTO employees VALUES (NULL,'HOOVER','SALES I',2,'1990-04-02',27000,NULL,3);
                INSERT INTO employees VALUES (NULL,'LINCOLN','TECH',6,'1994-06-23',22500,1400,4);
                INSERT INTO employees VALUES (NULL,'GARFIELD','MANAGER',9,'1993-05-01',54000,NULL,4);
                INSERT INTO employees VALUES (NULL,'POLK','TECH',6,'1997-09-22',25000,NULL,4);
                INSERT INTO employees VALUES (NULL,'GRANT','ENGINEER',10,'1997-03-30',32000,NULL,2);
                INSERT INTO employees VALUES (NULL,'JACKSON','CEO',NULL,'1990-01-01',75000,NULL,4);
                INSERT INTO employees VALUES (NULL,'FILLMORE','MANAGER',9,'1994-08-09',56000,NULL,2);
                INSERT INTO employees VALUES (NULL,'ADAMS','ENGINEER',10,'1996-03-15',34000,NULL,2);
                INSERT INTO employees VALUES (NULL,'WASHINGTON','ADMIN',6,'1998-04-16',18000,NULL,4);
                INSERT INTO employees VALUES (NULL,'MONROE','ENGINEER',10,'2000-12-03',30000,NULL,2);
                INSERT INTO employees VALUES (NULL,'ROOSEVELT','CPA',9,'1995-10-12',35000,NULL,1);
                `);
    
            expect(db.hasUnsavedChanges()).toBeTruthy();
    
            await db.syncToBlockchain();
        }

        // await db.run("UPDATE employees SET name = 'GARFIELD_UPDATED' WHERE name = 'GARFIELD';");

        // console.log(await db.listTables());
        

        // // console.log( await db.describeTable('employees') );

        // await db.sync.syncToBlockchain({ 
        //     forceExpectWalrus: true,
        // });

        // await db.sync.fillExpectedWalrus();


    //     // console.log(db.id);
    //     const res = await db.prepare("SELECT designation,COUNT(*) AS nbr, (AVG(salary)) AS avg_salary FROM employees GROUP BY designation ORDER BY avg_salary DESC;");
    //     const count = await res.forEach((row)=>{
    //         console.log(row);
    //         // row:  { designation: 'CEO', nbr: 1, avg_salary: 75000 }
    //         // row:  { designation: 'MANAGER', nbr: 3, avg_salary: 54000 }
    //         // row:  { designation: 'CPA', nbr: 1, avg_salary: 35000 }
    //         // row:  { designation: 'ENGINEER', nbr: 3, avg_salary: 32000 }
    //         // row:  { designation: 'SALES I', nbr: 2, avg_salary: 26000 }
    //         // row:  { designation: 'TECH', nbr: 2, avg_salary: 23750 }
    //         // row:  { designation: 'ADMIN', nbr: 2, avg_salary: 18000 }
    //     });

    //     const res3 = await db.prepare("SELECT * FROM sqlite_schema");
    //     const count3 = await res3.forEach((row)=>{
    //         console.log(row);
    //     });

        const res2 = await db.prepare("SELECT * FROM employees;");
        const count2 = await res2.forEach((row)=>{
            console.log(row);
            // row:  { designation: 'CEO', nbr: 1, avg_salary: 75000 }
            // row:  { designation: 'MANAGER', nbr: 3, avg_salary: 54000 }
            // row:  { designation: 'CPA', nbr: 1, avg_salary: 35000 }
            // row:  { designation: 'ENGINEER', nbr: 3, avg_salary: 32000 }
            // row:  { designation: 'SALES I', nbr: 2, avg_salary: 26000 }
            // row:  { designation: 'TECH', nbr: 2, avg_salary: 23750 }
            // row:  { designation: 'ADMIN', nbr: 2, avg_salary: 18000 }
        });
    });
});