<template>

    <q-card flat >
        <q-card-section class="q-pa-none relative-position q-pa-md">
            
            <div class="row q-col-gutter-sm">
                <div class="col-3"></div>
                <div class="col-6 q-pa-lg">
                            

                    <p>
                        SuiSQL is a library and set of tools for working with decentralized SQL databases on the 
                        Sui blockchain and Walrus protocol.
                    </p>

                    <p class="q-mb-md">
                        <a href="http://github.com/fizzyFlow/suisql/" target="_blank">SuiSql on GitHub</a>
                    </p>


                    <div v-if="connectedChain">

                        <h5  class="text-primary">SuiSql Databases | {{ network }}</h5>

                        <div class="q-my-xs">
                        <span class="text-primary">Sample DBs:</span> 
                        <q-btn color="primary" outline size="sm" class="q-mx-xs"
                            @click="$emit('dbName', 'btc_historical_prices')"
                            >btc_historical_prices</q-btn> 
                        <q-btn color="primary" outline size="sm" class="q-mx-xs"
                            @click="$emit('dbName', 'MoomeHolders')"
                            >MoomeHolders</q-btn>
                        </div>

                        <div class="relative-position">
                            
                            <q-select
                            filled
                            v-model="selectedDbName"
                            use-input
                            hide-selected
                            fill-input
                            input-debounce="0"
                            :options="options"
                            @filter="filterFn"
                            hint="Browse any SuiSQL database"
                            >
                            <template v-slot:no-option>
                                <q-item>
                                <q-item-section class="text-grey">
                                    No results
                                </q-item-section>
                                </q-item>
                            </template>
                            </q-select>

                            <q-inner-loading :showing="isLoadingDatabases">
                                <q-spinner-gears size="50px" color="primary" />
                            </q-inner-loading>
                        </div>


                        <div class="q-mt-md text-center">

                            or
                        </div>

                        <div class="q-mt-md text-center">
                            <q-input v-model="newDbName" label="Name New One" />
                        </div>
                        <div class="q-mt-md text-center">
                            <q-btn label="Create" color="primary" @click="createDb" :disable="!newDbName" />
                        </div>

                        <div class="q-mt-md text-left">
                            <ul>
                                <li>This is the database manage tool similar to SQL My Admin applications</li>
                                <li>Selected SuiSQL database instance will be available as global <i>db</i> var. 
                                    Feel free to check and interact with it from the browser console.</li>
                                <li>Suiet sometimes has issues confirming walrus-related transactions. Need to debug more. 
                                    <b>Slush (Sui Wallet)</b> works fine.</li>
                                <li>Pay attention to the walrus blob end_epoch if you want to use this for prod data. You can 
                                    extend blob life with this app.
                                </li>
                                <li>Even though it's on mainnet, SuiSQL is alpha as for now. Welcoming bug reports and PRs.</li>
                            </ul>

                        </div>
                    </div>

                </div>
                <div class="col-3"></div>
            </div>


        </q-card-section>
    </q-card>

</template>
<style lang="css">


</style>
<script>
import SuiSql from '@fizzyflow/suisql';
import { SuiUtils } from 'suidouble';

export default {
	name: 'DbExplorerSelectDb',
    emit: [],
    components: {
    },
	props: {
        network: {
            type: String,
            default: 'testnet',
        },
	},
	data() {
		return {
            state: null,
            db: null,

            names: [],
            selectedDbName: null,

            options: [],

            newDbName: null,

            isLoadingDatabases: false,
        }
	},
	computed: {
        connectedChain() {
            if (this.$store.sui && this.$store.sui.connectedChain) {
                return (''+this.$store.sui.connectedChain).split('sui:').join('');
            }
            return null;
        },
	},
	watch: {
        selectedDbName() {
            setTimeout(() => {
                if (this.selectedDbName) {
                    this.$emit('dbName', this.selectedDbName);
                }
            }, 50);
        }
	},
	methods: {
        async createDb() {
            if (!this.$store.sui.address) {
                await this.$store.sui.request();
                return false;
            }

            const connectedChain = (''+this.$store.sui.connectedChain).split('sui:').join('');
            if (connectedChain !== this.network) {
                this.$q.notify({
                        message: 'Please switch to '+ this.network + ' network in your wallet extension',
                        color: 'negative',
                    });
                return false;
            }

            this.$emit('dbName', this.newDbName);
        },
        filterFn(val, update) {
            update(() => {
                const needle = val.toLowerCase();
                this.options = this.names.filter(v => v.toLowerCase().indexOf(needle) > -1);
            })
        },
        async initialize() {
            this.isLoadingDatabases = true;

            const inURL = new URL(location.href).searchParams.get('db');
            if (inURL) {
                this.$emit('dbName', inURL);
                this.isLoadingDatabases = false;
                return;
            }

            const suiClient = SuiUtils.normalizeClient(this.network);
            const db = new SuiSql({
                    name: 'not going to use db object here',
                    network: this.network,
                    suiClient: suiClient,
                    debug: true,
                });
            this.names = [];
            this.options = [];

            await db.listDatabases((databaseNames) => {
                for (const name of databaseNames) {
                    if (!this.names.includes(name)) {
                        this.names.push(name);
                        this.options.push(name);
                    }
                }
                this.isLoadingDatabases = false;
            });
        },
	},
	unmounted: function() {
	},
	mounted: function(){
        this.initialize();
	}
}

</script>