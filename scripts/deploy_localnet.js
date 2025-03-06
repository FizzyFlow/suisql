import path from 'path';
import { SuiMaster } from 'suidouble';
import { fileURLToPath } from 'url';
// import { adjustMoveTOMLFor } from './includes.js';
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory


const run = async()=>{
    // RUST_LOG="off,sui_node=info" sui start --with-faucet --force-regenesis
   
    const phrase = "coin coin coin coin coin coin coin coin coin coin coin coin";
    const suiMaster = new SuiMaster({client: 'local', phrase: phrase, debug: true});
    await suiMaster.initialize();
    try {
        await suiMaster.requestSuiFromFaucet();
    } catch (e) {
        // ok, if you have testnet sui in wallet
        console.error(e);
    }
    
    console.log(suiMaster.address);
    // await adjustMoveTOMLFor('../move/Move.toml', 'mainnet');
    // await new Promise((res)=>setTimeout(res, 10000));

    const pk = suiMaster.addPackage({
        path: path.join(__dirname, '../move'),
    });
    await pk.publish();

    // await adjustMoveTOMLFor('../move/Move.toml', 'local');


    await new Promise((res)=>setTimeout(res, 2000));

    let dbId = null;

    try {
        const success = await pk.moveCall('suisql', 'db', []);
        if (success && success.status == 'success') {
            console.log('db created successfully');
            console.log(success.created);

            for (const obj of success.created) {
                if (obj && obj.typeName == 'SuiSqlDb') {
                    dbId = obj.id;
                }
            }

        }
    } catch (e) {
        console.error(e);
    }

    console.log('deployed as', pk.id);
    console.log('database id', dbId);
};

run();