
import SuiSql from '@fizzyflow/suisql';
import { SuiUtils } from 'suidouble';
import Table from 'cli-table3';
import { bcs } from '@mysten/sui/bcs';

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;

    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const run = async () => {

    const args = process.argv.slice(2); // skip the first two
    const lastArg = args[args.length - 1];

    const suiClient = SuiUtils.suiClientFor('mainnet'); // instance of Sui TS SDK Client

    const db = new SuiSql({ // enough for read-only, for write params - check the seed_the_data.js
            name: lastArg,
            network: 'mainnet',
            aggregatorUrl: 'https://aggregator.walrus-mainnet.walrus.space',
            suiClient: suiClient,
            debug: false,
        });

    await db.initialize();

    console.log('DB initialized, ', db.id, db.state);

    const table = new Table({
        head: ['Database', db.name],
        // colWidths: [20, 10],
    });

    const currentEpoch = await db.suiSqlSync.walrus.getSystemCurrentEpoch();
    table.push(['DB Object ID', db.id ? db.id : 'Not Found']);

    if (db.state === 'OK') {
        let walrusBlobId = db.walrusBlobId;

        let dbMemorySize = formatBytes(db.export().length, 2);

        table.push(['DB Memory Size', dbMemorySize]);

        if (walrusBlobId) {
            let walrusEndEpoch = db.suiSqlSync.walrusEndEpoch;
            let walrusStorageSize = formatBytes(db.suiSqlSync.walrusStorageSize, 2);

            const walrusBlobIdAsInt = BigInt(bcs.u256().fromBase64(walrusBlobId.replaceAll('-', '+').replaceAll('_', '/')));
            const binaryData = await db.suiSqlSync.walrus.readFromAggregator(walrusBlobIdAsInt);
            let walrusBlobSize = formatBytes(binaryData.length, 2);

            table.push(
                ['Walrus Blob Id', walrusBlobId],
                ['Walrus Blob End Epoch', walrusEndEpoch],
                ['Walrus Blob Size', walrusBlobSize],
                ['Walrus Storage', walrusStorageSize],
            );
        } else {
            table.push(
                ['Walrus Blob Id', 'No Blob Set' ],
            );
        }

        const suiObjectFields = await db.suiSqlSync.chain.getFields(db.id);
        const patchesCount = suiObjectFields?.patches?.length;
        let patchesTotalSize = db.suiSqlSync.patchesTotalSize;

        table.push(
            ['Patches '+(walrusBlobId ? 'Over Blob' : ''), patchesCount || 0],
            ['Patches Size', formatBytes(patchesTotalSize, 2)],
        );

        let tables = [];
        await db.listTables().then((tablesList) => {
            tables = tablesList;
        });

        table.push(
            ['Tables', tables.join(', ') || 'No Tables'],
        );

    }


    console.log(table.toString());
};

await run();