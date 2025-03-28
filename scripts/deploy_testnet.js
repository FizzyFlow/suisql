import path from 'path';
import { SuiMaster } from 'suidouble';
import { fileURLToPath } from 'url';
// import { adjustMoveTOMLFor } from './includes.js';
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory


const run = async()=>{
    // RUST_LOG="off,sui_node=info" sui start --with-faucet --force-regenesis
   
    const phrase = "off head person candy multiply trend doll affair sketch weekend girl produce";
    // 0x50edd3b7a0f2c5b0093c541b9f28be1754a639f5ea8a7d45c9cd01563aae23b3
    const suiMaster = new SuiMaster({client: 'testnet', phrase: phrase, debug: true});
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

    console.log('deployed as', pk.id);
};

run();