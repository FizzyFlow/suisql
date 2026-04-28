
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
const aggregators = {
    mainnet: 'https://aggregator.walrus-mainnet.walrus.space',
    testnet: 'https://aggregator.walrus-testnet.walrus.space',
};
const publishers = {
    mainnet: 'https://publisher.walrus-mainnet.walrus.space',
    testnet: 'https://publisher.walrus-01.tududes.com',
};

let suiMaster = null;
const ownedDbs = [];

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

describe('find all databases unittest owns', () => {
    it("finds databases", {}, async () => {
        const db = new SuiSql({
            id: '0x0',
            network: chain,
            suiClient: suiMaster.client,
        });
        const packageId = db.packageId;

        const suiSQLPackage = await suiMaster.addPackage({ id: packageId });
        await suiSQLPackage.isOnChain();
        const paginatedResponse = await suiSQLPackage.modules.suisql.getOwnedObjects({
            typeName: 'WriteCap',
        });

        await paginatedResponse.forEach(async(suiObject)=>{
            suiMaster.objectStorage.push(suiObject.fields.sui_sql_db_id);
            ownedDbs.push({
                id: suiObject.fields.sui_sql_db_id,
            });
        });


        await suiMaster.objectStorage.fetchObjects();

        for (const db of ownedDbs) {
            const dbObject = await suiMaster.objectStorage.byAddress(db.id);
            if (dbObject && dbObject.fields) {
                db.name = dbObject.fields.name;
                if (!db.size) {
                    db.size = 0;
                }

                if (dbObject.fields.patches) {
                    for (const patch of dbObject.fields.patches) {
                        console.log(' patch:', patch);
                        db.size += patch.length;
                    }
                }
            }
        }

        console.log(`Found ${ownedDbs.length} owned databases:`, ownedDbs);

        for (const db of ownedDbs) {
            if (db.size > 200) {
                console.log(` Database ${db.name} (${db.id}) size: ${db.size} bytes. Lets clamp it to walrus to rebate some SUI`);
                const suiSqlDb = new SuiSql({
                    id: db.id,
                    network: chain,
                    aggregatorUrl: aggregators[chain],
                    suiClient: suiMaster.client,
                    walrusClient: walrusClientMock[`${chain}`],
                    signer: suiMaster.signer,
                    debug: true,
                });
                await suiSqlDb.initialize();
                await suiSqlDb.sync({ forceWalrus: true });
            }
        }
    });
});