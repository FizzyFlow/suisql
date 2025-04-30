
import SuiSql from '@fizzyflow/suisql';
import { SuiUtils } from 'suidouble';

const run = async () => {

    const suiClient = SuiUtils.suiClientFor('mainnet'); // instance of Sui TS SDK Client

    const db = new SuiSql({ // enough for read-only, for write params - check the seed_the_data.js
            name: 'btc_historical_prices',
            network: 'mainnet',
            aggregatorUrl: 'https://aggregator.walrus-mainnet.walrus.space',
            suiClient: suiClient,
            debug: true,
        });

    await db.initialize();

    console.log('DB initialized, ', db.id, db.state);

    const res = await db.prepare("SELECT * FROM btc_prices ORDER BY price ASC LIMIT 3;");

    console.log('3 rows with lowest prices: ')
    const count = await res.forEach((row)=>{
        console.log(row);
    });

    const res2 = await db.prepare("SELECT * FROM btc_prices ORDER BY open_date DESC LIMIT 3;");
    console.log('3 most recent rows: ')
    const count2 = await res2.forEach((row)=>{
        console.log(row);
    });
};

await run();