
import { describe, expect, it } from "vitest";

import SuiSql from "../src/SuiSql";
import { SuiMaster } from 'suidouble';

import walrusClientMock from './includes/sampleWalrusClient.js';

import * as fs from 'fs';
import { fileURLToPath } from 'url';
import path from "path";
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory


const privateKey = await fs.promises.readFile(path.join(__dirname, '.privatekey'), 'utf-8');
if (!privateKey) {
    throw new Error('Please create a file .privatekey with your private key in format of suiprivkey1...');
}

describe("update existing db with walrus", () => {
    it("to nodes", {}, async () => {

        const suiMasterTestnet = new SuiMaster({client: 'mainnet', privateKey: privateKey, debug: true});
        await suiMasterTestnet.initialize();

        try {
            await suiMasterTestnet.requestSuiFromFaucet();
        } catch (e) {
            // ok, if you have testnet sui in wallet
            console.error(e);
        }


        const db = new SuiSql({
                name: 'test33343433332',
                network: 'mainnet',
                aggregatorUrl: 'https://aggregator.walrus-mainnet.walrus.space',
                // publisherUrl: 'https://publisher.walrus-01.tududes.com',
                suiClient: suiMasterTestnet.client,
                walrusClient: walrusClientMock.mainnetNoRelay,
                signer: suiMasterTestnet.signer,
                debug: true
            });


        const state = await db.initialize();

        expect(db.hasUnsavedChanges()).toBeFalsy();


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
    
            // row:  { id: 1, name: 'JOHNSON', designation: 'ADMIN', manager: 6 ... }
            // row:  { id: 2, name: 'HARDING', designation: 'MANAGER', manager: 9 ... }
            // row:  { id: 3, name: 'TAFT', designation: 'SALES I', manager: 2 ... }

            expect(db.hasUnsavedChanges()).toBeTruthy();
    
            await db.sync();
        }

        await db.run("UPDATE employees SET name = 'TAFT_UUUP' WHERE name = 'TAFT';");

        await db.sync({ 
            forceWalrus: true,
        });


        // await db.sync({ 
        //     forceWalrus: true,
        // });
        // return;
        // await db.run("UPDATE employees SET name = 'GARFIELD_UPDATED' WHERE name = 'GARFIELD';");

        // console.log(await db.listTables());
        
        // console.log(db.walrusEndEpoch);

        // const currentEpoch = await db.suiSqlSync.walrus.getSystemCurrentEpoch();

        // console.log(currentEpoch);

        // return;

        // // console.log( await db.describeTable('employees') );

        // await db.sync({ 
        //     forceWalrus: true,
        // });
        // await db.extendWalrus(2);

        // console.log(db.walrusEndEpoch);

        // return;

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
    // //     });

    //     const res2 = await db.prepare("SELECT * FROM employees;");
    //     const count2 = await res2.forEach((row)=>{
    //         console.log(row);
    //         // row:  { designation: 'CEO', nbr: 1, avg_salary: 75000 }
    //         // row:  { designation: 'MANAGER', nbr: 3, avg_salary: 54000 }
    //         // row:  { designation: 'CPA', nbr: 1, avg_salary: 35000 }
    //         // row:  { designation: 'ENGINEER', nbr: 3, avg_salary: 32000 }
    //         // row:  { designation: 'SALES I', nbr: 2, avg_salary: 26000 }
    //         // row:  { designation: 'TECH', nbr: 2, avg_salary: 23750 }
    //         // row:  { designation: 'ADMIN', nbr: 2, avg_salary: 18000 }
    //     });
    });


    it("via relay", {}, async () => {

        const suiMasterTestnet = new SuiMaster({client: 'mainnet', privateKey: privateKey, debug: true});
        await suiMasterTestnet.initialize();

        try {
            await suiMasterTestnet.requestSuiFromFaucet();
        } catch (e) {
            // ok, if you have testnet sui in wallet
            console.error(e);
        }


        const db = new SuiSql({
                name: 'test33343433332',
                network: 'mainnet',
                aggregatorUrl: 'https://aggregator.walrus-mainnet.walrus.space',
                // publisherUrl: 'https://publisher.walrus-01.tududes.com',
                suiClient: suiMasterTestnet.client,
                walrusClient: walrusClientMock.mainnet,
                signer: suiMasterTestnet.signer,
                debug: true
            });


        const state = await db.initialize();

        expect(db.hasUnsavedChanges()).toBeFalsy();


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
    
            // row:  { id: 1, name: 'JOHNSON', designation: 'ADMIN', manager: 6 ... }
            // row:  { id: 2, name: 'HARDING', designation: 'MANAGER', manager: 9 ... }
            // row:  { id: 3, name: 'TAFT', designation: 'SALES I', manager: 2 ... }

            expect(db.hasUnsavedChanges()).toBeTruthy();
    
            await db.sync();
        }

        await db.run("UPDATE employees SET name = 'TAFT_UUUP' WHERE name = 'TAFT';");

        await db.sync({ 
            forceWalrus: true,
        });


        // await db.sync({ 
        //     forceWalrus: true,
        // });
        // return;
        // await db.run("UPDATE employees SET name = 'GARFIELD_UPDATED' WHERE name = 'GARFIELD';");

        // console.log(await db.listTables());
        
        // console.log(db.walrusEndEpoch);

        // const currentEpoch = await db.suiSqlSync.walrus.getSystemCurrentEpoch();

        // console.log(currentEpoch);

        // return;

        // // console.log( await db.describeTable('employees') );

        // await db.sync({ 
        //     forceWalrus: true,
        // });
        // await db.extendWalrus(2);

        // console.log(db.walrusEndEpoch);

        // return;

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
    // //     });

    //     const res2 = await db.prepare("SELECT * FROM employees;");
    //     const count2 = await res2.forEach((row)=>{
    //         console.log(row);
    //         // row:  { designation: 'CEO', nbr: 1, avg_salary: 75000 }
    //         // row:  { designation: 'MANAGER', nbr: 3, avg_salary: 54000 }
    //         // row:  { designation: 'CPA', nbr: 1, avg_salary: 35000 }
    //         // row:  { designation: 'ENGINEER', nbr: 3, avg_salary: 32000 }
    //         // row:  { designation: 'SALES I', nbr: 2, avg_salary: 26000 }
    //         // row:  { designation: 'TECH', nbr: 2, avg_salary: 23750 }
    //         // row:  { designation: 'ADMIN', nbr: 2, avg_salary: 18000 }
    //     });
    });
});