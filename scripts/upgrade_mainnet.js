import path from 'path';
import { SuiMaster } from 'suidouble';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

import fs, { writeFileSync } from 'fs';

import minimist from 'minimist';
const argv = minimist(process.argv.slice(2));

export const getPublishedAt = (pathToMoveTOML) => {
    const data = fs.readFileSync(path.join(__dirname, pathToMoveTOML), 'utf8');
    const lines = data.split("\n");
    for (const line of lines) {
        if (line.startsWith('published-at')) {
            const id = line.split('=')[1].split('"')[1].trim();
            if (id.startsWith('0x')) {
                console.log('published-at in ', pathToMoveTOML, ' = ', id);
                return id;
            } else {
                throw new Error('can not get published at from', pathToMoveTOML);
            }
        }
    }
} 


const run = async()=>{
    // RUST_LOG="off,sui_node=info" sui start --with-faucet --force-regenesis
   
    if (!argv.phrase) {
        throw new Error('wrong phrase');
    }

    const id = await getPublishedAt('../move/Move.toml');
    console.error(id);
    console.log(path.join(__dirname, '../move'));

    const suiMaster = new SuiMaster({client: 'mainnet', privateKey: argv.phrase, debug: true});


    const pk = suiMaster.addPackage({
        id: id,
        path: path.join(__dirname, '../move'),
    });
    await pk.isOnChain();

    await pk.build({ env: 'mainnet' });


    // let bankId = null;
    // const eventsPaginated = await pk.modules.suisql_events.fetchEvents({ eventTypeName: 'NewBankEvent' });
    // await eventsPaginated.forEach((suiEvent)=>{ bankId = suiEvent.parsedJson.id; });

    // if (!bankId) {
    //     throw new Error('bankId is not found');
    // }

    await pk.upgrade();

    console.log('should be upgraded. Do not forget to update in config and Move.toml');
    console.log('upgraded packageId', pk.address);

    // console.log('migrate function will be executed in 10 seconds');
    // await new Promise((res)=>setTimeout(res, 10000));

    // try {
    //     const success = await pk.moveCall('suisql', 'migrate', [bankId]);
    //     if (success && success.status == 'success') {
    //         console.log('migrate function successfull');
    //     }
    // } catch (e) {
    //     console.error(e);
    // }
};

run();