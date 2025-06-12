<template>

    <div>
        <h6  class="text-primary">Fill db with sample data</h6>

        <q-input  v-model="coinType" label="coinType" 
                                filled :disable="isFilling"/>
        <q-btn @click="fillSampleData" label="Coin Holders" color="primary" outline class="q-mb-md" :loading="isFilling" />
    </div>

</template>
<style lang="css">


</style>
<script>
import SuiObjectLink from 'shared/components/CommonSui/SuiObjectLink.vue';
import Holders from 'shared/classes/Holders.js';
import { SuiMaster } from 'suidouble';
import { toRaw } from 'vue';

export default {
    name: 'DbExplorerSampler',
    emit: [],
    components: {
    },
    props: {
        db: Object,
    },
    data() {
        return {
            coinType: '0x80f9b6215ae18ed1a77f5d5153c4327fd48e17dbbcd12cde06b94dd2b95e3b18::moome::MOOME',
            holders: null,
            rows: [],
            suiCoin: null,
            inDbCoinId: null,

            isFilling: false,
        }
    },
    computed: {
    },
    watch: {
    },
    methods: {
        async fillSampleData() {
            const suiMaster = new SuiMaster({ client: 'mainnet' });

            this.isFilling = true;

            this.suiCoin = suiMaster.suiCoins.get(this.coinType);

            if (this.coinType == '0x80f9b6215ae18ed1a77f5d5153c4327fd48e17dbbcd12cde06b94dd2b95e3b18::moome::MOOME') {
                this.suiCoin._metadata = {
                    decimals: 9,
                    name: 'Moome',
                    symbol: 'MOOME',
                };
            } else {
                const metadata = await this.suiCoin.getMetadata();
                console.log('metadata', this.suiCoin.decimals);
            }


            if (!this.suiCoin.decimals) {
                this.$q.notify({
                    message: 'Coin Type not found on the mainnet',
                    color: 'negative',
                });
                return;
            }


            clearTimeout(this.__rowToDbTimeout);
            this.__rowToDbTimeout = null;

            await this.db.run(`
                CREATE TABLE IF NOT EXISTS wallets (
                    id INTEGER PRIMARY KEY,
                    address TEXT,
                    suins TEXT)
                    `);
            await this.db.run(`
                CREATE TABLE IF NOT EXISTS coins (
                    id INTEGER PRIMARY KEY,
                    coinType TEXT,
                    name TEXT)
                    `);
                    await this.db.run(`
                CREATE TABLE IF NOT EXISTS holders (
                    id INTEGER PRIMARY KEY,
                    coin_id INTEGER,
                    wallet_id INTEGER,
                    amount FLOAT)
                    `);

            const inDb = await this.db.query(`SELECT * FROM coins WHERE coinType = ?`, [this.coinType]);
            if (inDb.length > 0) {
                this.inDbCoinId = inDb[0].id;
            } else {
                await this.db.run(`INSERT INTO coins (coinType, name) VALUES (?, ?)`, [this.coinType, this.suiCoin.name]);
                const inDb = await this.db.query(`SELECT * FROM coins WHERE coinType = ?`, [this.coinType]);
                this.inDbCoinId = inDb[0].id;
            }
            
            this.$emit('refresh');

            this.holders = new Holders({ 
                suiMaster: suiMaster,
                coinType: this.coinType,
            });
            const __interval = setInterval(()=>{
                this.gotRows(this.holders.holders);
            }, 1000);
            
            try {
                await toRaw(this.holders).getCoinHolders();
            } catch (e) {
                console.log('error', e);
            }

            clearInterval(__interval);

            await this.gotRows(this.holders.holders);

            const values = [];

            await new Promise((res)=>setTimeout(res, 1000));

            const allWallets = await this.db.query(`SELECT * FROM wallets`);
            const allHolders = await this.db.query(`SELECT * FROM holders`);

            for (const holder of this.holders._holders) {
                if (!holder.address) {
                    continue;
                }
                console.log('holder', holder);

                const balanceAsString = this.suiCoin.amountToString(holder.balance, {withAbbr: false});

                const inDb = allWallets.filter((w)=>w.address == holder.address);
                const inDbHolders = allHolders.filter((h)=>h.coin_id == this.inDbCoinId && h.wallet_id == inDb[0].id);
                if (inDbHolders.length == 0) {
                    // await this.db.run(`INSERT INTO holders (coin_id, wallet_id, amount) VALUES (?, ?, ?)`, [this.inDbCoinId, inDb[0].id, balanceAsString]);
                    // await new Promise((res)=>setTimeout(res, 10));
                    values.push("("+ this.inDbCoinId + ", "+ inDb[0].id + ", '"+ balanceAsString + "')");
                }

            }

            if (values.length) {
                await this.db.run(`INSERT INTO holders (coin_id, wallet_id, amount) VALUES ${values.join(', ')}`);
            }

            this.isFilling = false;
        },
        // async rowToDb() {
        //     if (!row.length) {
        //         clearTimeout(this.__rowToDbTimeout);
        //         this.__rowToDbTimeout = null;
        //         return;
        //     }
        //     this.__rowToDbTimeout = true;

        //     const inDb = await this.db.query(`SELECT * FROM wallets WHERE address = ?`, [row.address]);
        //     const values = [];
        //     if (inDb.length == 0) {
        //         values.push("('"+ row.address + "', '"+ (row.defaultSuinsName ? row.defaultSuinsName : '') + "')");

        //         await this.db.run(`INSERT INTO wallets (address, suins) VALUES (?, ?)`, [row.address, row.defaultSuinsName ? row.defaultSuinsName : '']);

        //         await new Promise((res)=>setTimeout(res, 1));
        //     }

        //     if (values.length) {

        //     }

        //     this.__rowToDbTimeout = setTimeout(async ()=>{
        //         await this.rowToDb();
        //     }, 100);
        // },
        async gotRows(from) {
            if (!this._rowsAppended) {
                this._rowsAppended = {};
            }

            const values = [];
            for (const row of from) {
                if (row.balance) {
                    const amountAsString = this.suiCoin.amountToString(row.balance, {withAbbr: true})
                    row.amountAsString = amountAsString;
                }
                if (this.objectType == 'nft') {
                    row.amountAsString = row.count;
                }
                if (!this._rowsAppended[row.address]) {
                    this.rows.push(row);
                    this._rowsAppended[row.address] = true;

                    // const inDb = await this.db.query(`SELECT * FROM wallets WHERE address = ?`, [row.address]);
                    // if (inDb.length == 0) {
                    //     await this.db.run(`INSERT INTO wallets (address, suins) VALUES (?, ?)`, [row.address, row.defaultSuinsName ? row.defaultSuinsName : '']);

                    // }

                    if (row.address) {
                        const inDb = await this.db.query(`SELECT * FROM wallets WHERE address = ?`, [row.address]);
                        if (inDb.length == 0) {
                            values.push("('"+ row.address + "', '"+ (row.defaultSuinsName ? row.defaultSuinsName : '') + "')");
                        }
                    }

                }
            }

            if (values.length) {
                await this.db.run(`INSERT INTO wallets (address, suins) VALUES ${values.join(', ')}`);
            }

            // const holdersValues = [];
            // for (const row of from) {
            //     const inDb = await this.db.query(`SELECT * FROM wallets WHERE address = ?`, [row.address]);
            //     const inDbHolder = await this.db.query(`SELECT * FROM holders WHERE coin_id = ? AND wallet_id = ?`, [this.inDbCoinId, inDb[0].id]);
            //     if (inDbHolder.length == 0) {
            //         holdersValues.push("("+ this.inDbCoinId + ", "+ inDb[0].id + ", '"+ row.balance + "')");
            //     }
            // }

            // if (!this.__rowToDbTimeout) {
            //     this.rowToDb();
            // }

            console.log(this.rows);
        },
    },
    unmounted: function() {
    },
    mounted: function(){
    }
}

</script>