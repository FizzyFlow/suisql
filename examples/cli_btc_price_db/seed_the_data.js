
import SuiSql from '@fizzyflow/suisql';
import { WalrusClient } from '@mysten/walrus';
import { SuiMaster } from 'suidouble';
import * as fs from 'fs';
import * as csv from 'fast-csv';

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

    const rows = [];

    await new Promise((res)=>{
        fs.createReadStream('./btc_1h_data_2018_to_2025.csv')
            .pipe(csv.parse({ headers: true }))
            .on('error', error => console.error(error))
            .on('data', row => { rows.push(row); })
            .on('end', (rowCount) => { console.log(`Parsed ${rowCount} rows`); res();});
    });

    console.log(rows[1000]);
    console.log(new Date(rows[1000]['Open time']));




    const suiClient = suiMaster.client; // instance of Sui TS SDK Client
    const signer = suiMaster.signer;    // instance os Sui TS SDK Signer

    const walrusClient = new WalrusClient({
        network: 'mainnet',
        suiRpcUrl: 'https://fullnode.mainnet.sui.io:443',
    });

    const db = new SuiSql({
            name: 'btc_historical_prices',
            network: 'mainnet',
            aggregatorUrl: 'https://aggregator.walrus-mainnet.walrus.space',
            suiClient: suiClient,
            walrusClient: walrusClient,
            signer: signer,
            debug: true,
        });

    await db.initialize();

    console.log('DB initialized, ', db.id, db.state);

    if (db.state === 'EMPTY' || db.state === 'OK') {
        console.log('Seeding the data...');

        await db.iterateStatements(`
            DROP TABLE IF EXISTS btc_prices;
            CREATE TABLE btc_prices( id integer primary key,  
                        open_date    date,     price  float, volume float );
            CREATE INDEX open_date ON btc_prices(open_date);
            CREATE INDEX price ON btc_prices(price);
            CREATE INDEX volume ON btc_prices(volume);
                        `);

        for (const row of rows) {
            const date = new Date(row['Open time']);
            const price = parseFloat(row['Open']);
            const volume = parseFloat(row['Volume']);

            await db.query(`
                INSERT INTO btc_prices (open_date, price, volume) 
                VALUES (?, ?, ?);
            `, [date.toISOString(), price, volume]);                
        }

        console.log('DB seeded', rows.length, 'rows');
        console.log('Syncing the DB to the blockchain...');

        await db.sync();
    }

};

await run();