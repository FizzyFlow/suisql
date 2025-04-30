### SuiSQL BTC Prices database

Quick CLI usage example of SuiSQL library.

```bash
pnpm install
```

Query some data from it (no private key needed):

```bash
node query_db.js
```

Initialize and seed the database:

Create the file named `.privatekey` containing your wallet private key in format of `suiprivkey1....` and run:

```bash
node seed_the_data.js
```

### Links

    - Thanks to Novandra Anugrah for the [dataset](https://www.kaggle.com/datasets/novandraanugrah/bitcoin-historical-datasets-2018-2024)
    - [SuiSQL](https://github.com/FizzyFlow/suisql/)
    - [Browse this DB on web](http://moome.pro/sql?db=btc_historical_prices)