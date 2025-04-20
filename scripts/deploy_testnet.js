import path from 'path';
import { SuiMaster } from 'suidouble';
import { fileURLToPath } from 'url';
import fs from 'fs';
// import { adjustMoveTOMLFor } from './includes.js';
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory


const run = async()=>{
    // RUST_LOG="off,sui_node=info" sui start --with-faucet --force-regenesis
    const privateKey = await fs.promises.readFile(path.join(__dirname, './.privatekey'), 'utf-8');

    if (!privateKey) {
        console.error('Please create a file .privatekey with your private key');
        return;
    }

    const suiMaster = new SuiMaster({client: 'testnet', privateKey: privateKey, debug: true});
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
    await pk.build({ env: 'testnet' });
    await pk.publish();

    // await adjustMoveTOMLFor('../move/Move.toml', 'local');

    console.log('deployed as', pk.id);
};

run();