# SuiSQL

SuiSQL is a library and set of tools for working with decentralized SQL databases on the Sui blockchain and Walrus protocol.

It brings the power and familiarity of SQL relational databases into the world of Web3 — enabling developers to store, query, and verify tamper-proof data with full SQL support, minimal setup, and no centralized backend.

### Features

    ✅ SQLite-compatible — full-featured SQL engine (joins, filters, indexes)
    🪙 Decentralized storage — no backend required, data lives on-chain and on Walrus
    🔐 On-chain proofs — all write operations can be verified and audited
    🧠 Smart syncing — compressed SQL, binary patches, or full snapshots
    🆓 Free reads — anyone can read or clone the database without gas. Higher-layer encryption is possible but not built-in
    ⚙️ Easy to integrate — drop-in library for apps, games, dashboards, DAOs

### Architecture

SuiSQL runs a local, in-memory SQLite engine on the client. 
All write operations are stored locally and synced to the blockchain in batches using one of three strategies:

- Compressed SQL	Raw queries are compressed and stored on-chain
- Binary Patches	Diffs of the SQLite memory state are written
- Full Snapshots	Complete SQL binary state stored on the Walrus

The library automatically selects the best method based on: memory size, sui object limits, user cost (gas/SUI/WAL). Reading is always free and public.Higher-layer encryption is possible but not built-in.

#### Data Flow

- Client side writes queries using standard SQLite syntax
- SuiSQL executes them in-memory locally
- Sync operations bundle changes and push to the blockchain
- Client side fetches the on-chain database 100% synced on the next load

### Usage

```bash
npm install suisql
```

```javascript
import SuiSql from 'suisql';

// minimum setup:
const simpleDb = new SuiSql({ name: 'UniqueDbIdString', suiClient: suiSdkClient, });

// all params:
const db = new SuiSql({
        id: '0x50edd3b7a0f2c5b0093c541b9f28be1754a639f5ea8a7d45c9cd01563aae23b3', // if you already know it
        name: 'UniqueDbIdString', // or let SuiSQL get db id by the unique name

        network: 'testnet', // if you are ready, 'mainnet'

        suiClient: suiSdkClient, // initialize it with Sui SDK or with Suidouble library

        debug: true, // and watch console

                            // for write access:
        signer: keypair,                 // type { Signer } from '@mysten/sui/cryptography';
        signAndExecuteTransaction: sign, // or function, if you build dApp ( see below )
        currentWalletAddress: '0x50..fa',// required, if no signer provided but signAndExecuteTransaction is

                            // for walrus write access
        walrusClient: walrusSdkClient,                                // initialize it with Walrus SDK
        publisherUrl: 'https://publisher.walrus-testnet.walrus.space',// or with URL of the publisher service

                            // optionally, set other aggregatorUrl
        aggregatorUrl: 'https://aggregator.walrus-testnet.walrus.space',
    });
```


- **id** SuiSQL DB object address. If no id is provided, library will look up SuiSQL DB by its `name`.
- **name** SuiSQL lets you initialize a database using a human-readable unique name string instead of a raw Sui object ID. The library + smart contracts handle the name -> object ID resolution automatically under the hood.
- **network** 'testnet' or 'mainnet'
- **suiClient** Sui TS SDK's suiClient object connected to the needed network's RPC. suiClient is required for SuiSQL to work.
- **debug** boolean flag to echo debug console messages

Sui Write operations params:

- 1. Sui's TS SDK Signer object (like keypair). Easiest for backend usage, not safe for dApps:

    - **signer** - type { Signer } from '@mysten/sui/cryptography';

- 2. signAndExecuteTransaction as a function. So you can re-use walletAdapter in your dApp:

    - **currentWalletAddress** - address of the connected wallet
    - **signAndExecuteTransaction** - function to sign and publish TX to the sui blockchain and return it's digest

```javascript
const signAndExecuteTransaction = async (tx) => {
    const results = await walletAdapter.features['sui:signAndExecuteTransaction'].signAndExecuteTransaction({
        transaction: tx,
    });
    return results.digest;
};
```

SuiSQL integrates with the Walrus protocol to support large and efficient database storage and syncing beyond Sui object size limits.
There are two ways to connect to Walrus inside the library:

- 1. Aggregator & Publisher URLs. Easy to configure — just plug in URLs. Use public endpoints on testnet. Ideal for quick setup or lightweight apps.

    - **aggregatorUrl** - https://docs.wal.app/usage/web-api.html
    - **publisherUrl** - public testnet publishers will work here. For mainnet you'd need to set up your own publisher or use WalrusSDK client.

- 2. Walrus SDK Client. Full control over sync logic and signing. Best for advanced usage, self-hosting, and production deployments. 

    - **walrusClient** - Walrus SDK client object
    - **signer** - Signer for Walrus SDK client write operations ( same as for write operations above ).

Walrus methods can be mixed together, you can use aggregatorUrl for read operations and walrusClient for sync writes. Moreover, for small test databases, SuiSQL will work ok without Walrus params at all (fitting everything in the Sui object).

Additional way to sync database to Walrus implemented in SuiSQL is the delayed Walrus sync.

### Methods

Most SuiSQL methods are asynchronous and return Promises — you must **await** them unless explicitly stated otherwise.

#### db.initialize()

Performs full database initialization, including: querying metadata and data from the Sui blockchain, syncing from Walrus, reconstructing the full SQLite database in memory.

Returns the current **state** of the database after setup:

- 'OK'	    Database loaded successfully and is ready for querying
- 'EMPTY'	Database object exists but contains no data — ready for first-time setup
- 'ERROR'	Initialization failed (e.g. invalid object, sync issue, etc.)

You can also access the current database state at any time via: `db.state` property.

#### db.iterateStatements(sqlText: string)

Executes multiple SQL commands from a single SQL text block.

- Splits and runs each SQL statement in sequence
- Useful for running full SQL files (e.g. schema setup, migrations)
- Returns the number of statements executed

```javascript
const state = await db.initialize();
if (state == 'EMPTY') {
    // fill the fresh database
    await db.iterateStatements(`
        DROP TABLE IF EXISTS employees;
        CREATE TABLE employees( id integer primary key,  name    text,
                        designation text,     manager integer,
                        hired_on    date,     salary  integer,
                        commission  float,    dept    integer);

        INSERT INTO employees VALUES (NULL,'JOHNSON','ADMIN',6,'1990-12-17',18000,NULL,4);
        INSERT INTO employees VALUES (NULL,'HARDING','MANAGER',9,'1998-02-02',52000,300,3);
        INSERT INTO employees VALUES (NULL,'TAFT','SALES I',2,'1996-01-02',25000,500,3);
        `);
}
```

#### db.query(sql, bindedParams?)

Runs a SQL query against the local SuiSQL database.

- Executes in-memory using a full-featured SQLite engine
- Returns an array of rows (as plain JS objects)
- Supports parameter binding, just like standard SQLite

```javascript
const rows = await db.query(
    'SELECT * FROM transactions WHERE category = ? AND amount > ?',
    ['pink boots', 100]
);
console.log(rows);
/*
[
  { id: 1, category: 'pink boots', amount: 399 },
  { id: 5, category: 'pink boots', amount: 199 }
]
*/
```

#### db.prepare(sql, bindedParams?)

Creates a prepared statement object for the given SQL query.
Use this method when working with large result sets that you want to iterate over efficiently.

```javascript
const stmt = await db.prepare("SELECT * FROM employees;");
const count = await stmt.forEach((row) => {
    console.log(row);
    // row:  { designation: 'CEO', nbr: 1, avg_salary: 75000 }
    // row:  { designation: 'MANAGER', nbr: 3, avg_salary: 54000 }
    // row:  { designation: 'CPA', nbr: 1, avg_salary: 35000 }
});
```

#### db.sync(params?)

Syncs the current in-memory SQLite database state to the Sui blockchain and (if needed) to Walrus.

The library will automatically determine the most efficient sync method:

    - Compressed SQL statements
    - Binary memory patches
    - Full Walrus snapshot

You can override or enhance that behavior using optional flags:

- forceWalrus `boolean` Force full Walrus sync, even if not required by size or structure
- forceExpectWalrus `boolean` Performs calculations for delayed Walrus sync during normal sync flow

```javascript
await db.query(`
  INSERT INTO transactions (category, amount) VALUES ('cloud rent', 999);
`);
await db.sync(); // Will choose best sync method
// await db.sync({
//     forceWalrus: true,
//     forceExpectWalrus: true,
// });
```

### Delayed Walrus Sync

SuiSQL supports delayed syncing, allowing you to separate on-chain write confirmation from the heavy blob upload to Walrus. This unlocks powerful workflows for performance, batching, and decentralized collaboration.

- You submit a write operation (via db.sync()) using a non-Walrus method (e.g., compressed SQL or binary patch).
- The library calculates the expected Walrus blob_id from the current in-memory SQLite state.
- Later, you or anyone (even with a different signer) can upload the matching blob to Walrus and link it to the database object on-chain.
- The smart contract validates that the blob matches the expected hash, ensuring trustless consistency.

Client session:

```javascript
await db.sync({
    forceExpectWalrus: true // Calculates expected blob_id without uploading it to walrus, and saves in the SuiSQL object along with patches
});
```

Other session (with params required for walrus write):
```javascript
await db.initialize();
await db.fillExpectedWalrus();
```

- Each Walrus blob is deterministically hashed from the SQLite memory state
- That hash becomes the blob ID used across all sync logic
- SuiSQL smart contracts enforce this match — no mismatched data can be linked

SuiSQL on-chain package intelligently manages Walrus blobs under the hood for maximum efficiency

- Blob data is stored on-chain in the SuiSQL database object
- When appropriate, it extends storage by linking new blobs on top of existing ones (saving you some WAL)

### Resources:

- Walrus docs: https://docs.wal.app/
- SQLite docs: https://sqlite.org/datatype3.html
- SQLite.js docs: https://sql.js.org/documentation/Database.html
- Sui TS SDK: https://github.com/MystenLabs/ts-sdks/tree/main/packages/typescript
- Walrus SDK: https://github.com/MystenLabs/ts-sdks/tree/main/packages/walrus

