
import SuiSql from '@fizzyflow/suisql';
import { WalrusClient } from '@mysten/walrus';
import { SuiMaster, SuiUtils } from 'suidouble';
import { initCetusSDK } from '@cetusprotocol/cetus-sui-clmm-sdk';

import * as fs from 'fs';

const run = async () => {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // ifnore certs of walrus nodes
    const privateKey = await fs.promises.readFile('./.privatekey', 'utf-8');

    if (!privateKey) {
        console.error('Please create a file .privatekey with your private key in format of suiprivkey1...');
        return;
    }

    const suiMaster = new SuiMaster({client: 'mainnet', privateKey: privateKey, debug: true});
    await suiMaster.initialize();

    console.log('connected as ', suiMaster.address);

    const suiClient = SuiUtils.suiClientForRPC({
            url: 'https://fullnode.mainnet.sui.io:443',
            chainname: 'mainnet',
        }); // instance of Sui TS SDK Client
    const signer = suiMaster.signer;    // instance os Sui TS SDK Signer

    const walrusClient = new WalrusClient({
        network: 'mainnet',
        suiRpcUrl: 'https://fullnode.mainnet.sui.io:443',
    });

    const db = new SuiSql({
            name: 'cetuspools',
            network: 'mainnet',
            aggregatorUrl: 'https://aggregator.walrus-mainnet.walrus.space',
            suiClient: suiClient,
            walrusClient: walrusClient,
            signer: signer,
            debug: true,
        });

    await db.initialize();

    console.log('DB initialized, ', db.id, db.state);

    const cetusClmmSDK = initCetusSDK({network: 'mainnet'});

    const pools = await cetusClmmSDK.Pool.getPoolsWithPage([]);
    console.log('Found pools: ', pools.length ,pools);

    //
    if (db.state === 'EMPTY' || db.state === 'OK' || db.state === 'ERROR') {
        console.log('Seeding the data...');
        await db.iterateStatements(`
            DROP TABLE IF EXISTS coins;
            DROP TABLE IF EXISTS pools;
            CREATE TABLE coins( id integer primary key, coinType text UNIQUE );
            CREATE INDEX coinType ON coins(coinType);
            CREATE TABLE pools( id integer primary key, coin_a_id INTEGER, coin_b_id INTEGER, poolAddress text, feeRate INTEGER );
                        `);

        const allCoinTypes = {};
        for (const pool of pools) {

            const coinA = pool.coinTypeA;
            const coinB = pool.coinTypeB;
            if (!allCoinTypes[coinA]) {
                await db.query(`
                    INSERT INTO coins (id, coinType) 
                    VALUES (NULL, '${coinA}');
                `); 
                const res = await db.query("SELECT * FROM coins WHERE coinType = ?;", [coinA]);
                allCoinTypes[coinA] = res[0].id;
            }
            if (!allCoinTypes[coinB]) {
                await db.query(`
                    INSERT INTO coins (id, coinType) 
                    VALUES (NULL, '${coinB}');
                `); 
                const res = await db.query("SELECT * FROM coins WHERE coinType = ?;", [coinB]);
                allCoinTypes[coinB] = res[0].id;
            }
        }

        for (const pool of pools) {
            const coinA = pool.coinTypeA;
            const coinB = pool.coinTypeB;
            const poolAddress = pool.poolAddress;
            const feeRate = parseInt(pool.fee_rate);

            await db.query(`
                INSERT INTO pools (id, coin_a_id, coin_b_id, poolAddress, feeRate) 
                VALUES (NULL, '${allCoinTypes[coinA]}', '${allCoinTypes[coinB]}', '${poolAddress}', ${feeRate});
            `); 
        }

        await db.sync();
    }

};

await run();