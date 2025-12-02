
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

const chain = 'testnet';
const randomDbName = 'testdb_' + Math.random().toString(36).substring(2, 15);

const sampleDbNames = {
    mainnet: 'testdb_wdsx7pwjl6c',
    testnet: 'testdb_wdsx7pwjl6c',
};
const sampleDbIds = {
    mainnet: '0x17ca21f96da213031c1595ccd0108dc1fee50cead1a0b77ff14ac495b30db105',
    testnet: '0x17ca21f96da213031c1595ccd0108dc1fee50cead1a0b77ff14ac495b30db105',
};
const aggregators = {
    mainnet: 'https://aggregator.walrus-mainnet.walrus.space',
    testnet: 'https://aggregator.walrus-testnet.walrus.space',
};
const publishers = {
    mainnet: 'https://publisher.walrus-mainnet.walrus.space',
    testnet: 'https://publisher.walrus-01.tududes.com',
};

let suiMaster = null;

describe('initialize connection to blockchain', () => {
    it("initialized", {}, async () => {
        suiMaster = new SuiMaster({client: chain, privateKey: privateKey, debug: true});
        await suiMaster.initialize();
        expect(suiMaster).toBeTruthy();
        expect(suiMaster.client).toBeTruthy(); // for new SuiSQL({ ... suiClient: ...})
        expect(suiMaster.signer).toBeTruthy(); // for new SuiSQL({ ... signer: ...})
        expect(suiMaster.address).toBeTruthy();  
    });
});

const addCustomRowSyncAndCheckBack = async(db, params = {}) => {
    // 1 - check if there's employees table in the db.
    // 2 - add a row with unique name to it and sync to blockhain
    // 3 - reload the db and check if the row is there
    // 4 - remove the row and sync to blockchain again
    // 5 - reload the db and check if the row is gone
    const { 
        forceWalrus = false, // sync as walrus on the  step 2
    } = params;

    const testValue = 'CHECK_' + Math.random();

    const res = await db.query("SELECT designation,COUNT(*) AS nbr, (AVG(salary)) AS avg_salary FROM employees GROUP BY designation ORDER BY avg_salary DESC;");

    expect(res).toBeTruthy();
    expect(res.length).toBeGreaterThan(0);

    const countRes = await db.query("SELECT COUNT(*) AS cnt FROM employees;");

    if (countRes[0].cnt > 50) {
        await db.query(`DELETE FROM employees WHERE designation = 'BRO';`);
    }

    await db.iterateStatements(`
            INSERT INTO employees VALUES (NULL,'${testValue}','BRO',9,'1985-10-12',25000,NULL,1);
            `);
    
    await db.sync({ forceWalrus: forceWalrus });

    const reloadedDb = await db.database(db.name);

    const testRes = await reloadedDb.query(`SELECT * FROM employees WHERE name = '${testValue}';`);

    expect(testRes).toBeTruthy();
    expect(testRes.length).toBe(1);
    expect(testRes[0].name).toBe(testValue);

    await db.iterateStatements(`
            DELETE FROM employees WHERE name = '${testValue}';
            `);

    await db.sync({  }); // save as patch

    const reloadedDb2 = await db.database(db.name);

    const testRes2 = await reloadedDb2.query(`SELECT * FROM employees WHERE name = '${testValue}';`);

    expect(testRes2).toBeTruthy();
    expect(testRes2.length).toBe(0);
};

describe('load existing db', () => {
    it("loads existing database by its id", {}, async () => {
        const db = new SuiSql({
                id: sampleDbIds[chain],
                network: chain,
                aggregatorUrl: aggregators[chain],
                publisherUrl:  publishers[chain], //'https://publisher.walrus-01.tududes.com'
                suiClient: suiMaster.client,
                walrusClient: walrusClientMock[`${chain}NoRelay`],
                signer: suiMaster.signer,
                debug: true
            });


        const res = await db.query("SELECT designation,COUNT(*) AS nbr, (AVG(salary)) AS avg_salary FROM employees GROUP BY designation ORDER BY avg_salary DESC;");

        expect(res).toBeTruthy();
        expect(res.length).toBeGreaterThan(0);

        // after initialize();
        expect(db.name).toBe(sampleDbNames[chain]);
        expect(db.id).toBe(sampleDbIds[chain]);
    });

    it("loads existing database by its name", {}, async () => {
        const db = new SuiSql({
                name: sampleDbNames[chain],
                network: chain,
                aggregatorUrl: aggregators[chain],
                publisherUrl:  publishers[chain], //'https://publisher.walrus-01.tududes.com'
                suiClient: suiMaster.client,
                walrusClient: walrusClientMock[`${chain}NoRelay`],
                signer: suiMaster.signer,
                debug: true
            });

        const res = await db.query("SELECT designation,COUNT(*) AS nbr, (AVG(salary)) AS avg_salary FROM employees GROUP BY designation ORDER BY avg_salary DESC;");

        expect(res).toBeTruthy();
        expect(res.length).toBeGreaterThan(0);

        // after initialize();
        expect(db.name).toBe(sampleDbNames[chain]);
        expect(db.id).toBe(sampleDbIds[chain]);

    });



    let newDb = null;
    it("make new  database and save it on the blockchain", {}, async () => {
        const randomDbName = 'random_database_name_' + Math.random().toString(36).substring(2, 15) + '_' + Math.random().toString(36).substring(2, 15);
        newDb = new SuiSql({
                name: randomDbName,
                network: chain,
                suiClient: suiMaster.client,
                signer: suiMaster.signer,

                aggregatorUrl: aggregators[chain],
                walrusClient: walrusClientMock[`${chain}NoRelay`],

                debug: true
            });

        await newDb.initialize();

        expect(newDb.state).toBe('EMPTY'); // EMPTY - new, OK - loaded, 

        await newDb.iterateStatements(`
            DROP TABLE IF EXISTS employees;
            CREATE TABLE employees( id integer primary key,  name    text,
                            designation text,     manager integer,
                            hired_on    date,     salary  integer,
                            commission  float,    dept    integer);

            INSERT INTO employees VALUES (NULL,'JOHNSON','ADMIN',6,'1990-12-17',18000,NULL,4);`);

        const res = await newDb.query("SELECT * FROM employees;");

        expect(res).toBeTruthy();
        expect(res.length).toBe(1);

        await addCustomRowSyncAndCheckBack(newDb, { forceWalrus: false });
    });

    it("fill it with data until it overloads sui limits and goes to walrus automatically rebating sui storage", {}, async () => {
        const instance = await newDb.database(newDb.name);
        await instance.initialize();

        let addedRows = 0;
        do {
            const addNRowsPerSync = 500;
            let queries = '';
            for (let i = 0; i < addNRowsPerSync; i++) {
                queries += `
                    INSERT INTO employees VALUES (NULL,'Fillah${Math.random().toString(36).substring(2, 15)}','FILLER',6,'1990-12-17',18000,NULL,4);
                `;
            }
            await instance.iterateStatements(queries);
            await instance.sync({  });
        console.log('Database has deployed to walrus with blob id:', instance.suiSqlSync, instance.suiSqlSync.walrusBlobId);
            addedRows += addNRowsPerSync;

        } while (!(instance?.suiSqlSync?.walrusBlobId));

        console.log('Database has deployed to walrus with blob id:', instance.suiSqlSync, instance.suiSqlSync.walrusBlobId);

        const checkInstance = await newDb.database(instance.name);
        await checkInstance.initialize();

        const countRes = await checkInstance.query("SELECT COUNT(*) AS cnt FROM employees WHERE designation = 'FILLER';");
        expect(countRes[0].cnt).toBe(addedRows);
    });

    it("loads existing database and commit patch to it on walrus (raw mode, to nodes directly)", {}, async () => {
        const db = new SuiSql({
                name: sampleDbNames[chain],
                network: chain,
                aggregatorUrl: aggregators[chain],
                walrusClient: walrusClientMock[`${chain}NoRelay`],
                suiClient: suiMaster.client,
                signer: suiMaster.signer,
                currentWalletAddress: suiMaster.address,
                debug: true
            });

        await addCustomRowSyncAndCheckBack(db, { forceWalrus: true });
    });

    it("loads existing database and commit patch to it on walrus with publisher (and check it's saved correctly)", {}, async () => {
        const db = new SuiSql({
                name: sampleDbNames[chain],
                network: chain,
                aggregatorUrl: aggregators[chain],
                publisherUrl:  publishers[chain], 
                suiClient: suiMaster.client,
                signer: suiMaster.signer,
                currentWalletAddress: suiMaster.address,
                debug: true
            });

        await addCustomRowSyncAndCheckBack(db, { forceWalrus: true });
    });

    it("loads existing database and commit patch to it on walrus with upload relay (and check it's saved correctly)", {}, async () => {
        const db = new SuiSql({
                name: sampleDbNames[chain],
                network: chain,
                aggregatorUrl: aggregators[chain],
                walrusClient: walrusClientMock[chain],
                suiClient: suiMaster.client,
                signer: suiMaster.signer,
                currentWalletAddress: suiMaster.address,
                debug: true
            });

        await addCustomRowSyncAndCheckBack(db, { forceWalrus: true });
    });


});