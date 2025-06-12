<template>

    <q-card flat >
        <q-card-section class="q-pa-none relative-position q-pa-md">
            
            <div class="row q-col-gutter-sm">
                <div class="col-2"></div>
                <div class="col-8 q-pb-lg">
                            
                    <p class="text-center">
                        <img src="/logo.png" alt="SuiSQL" class="q-mb-md" style="max-height: 100px;" />
                    </p>

                    <p class="text-center">
                        SuiSQL is a library and set of tools for working with decentralized SQL databases on the 
                        Sui blockchain and Walrus protocol.
                    </p>

                    <p class="q-mb-md text-center">
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
                        <q-btn color="primary" outline size="sm" class="q-mx-xs"
                            @click="$emit('dbName', 'cetuspools')"
                            >cetuspools</q-btn>
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

                        <div class="text-center q-mt-md">

    <q-card class="projects" flat style="display: inline-block; ">
    <router-link href="https://moome.pro" target="_blank"  style="text-decoration: none;">
      <q-item>
        <q-item-section avatar>
          <q-avatar size="56px">
            <img src="https://moome.pro/icon_256-min.png">
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label class="text-left" style="text-decoration: none;">Moome</q-item-label>
          <q-item-label caption  class="text-left" style="text-decoration: none;">Liquid staking memes</q-item-label>
        </q-item-section>
      </q-item>
    </router-link>
    </q-card>


    <q-card class="projects" flat style="display: inline-block; ">
    <router-link href="https://github.com/FizzyFlow" target="_blank"  style="text-decoration: none;">
      <q-item>
        <q-item-section avatar>
          <q-avatar size="56px">
            <img src="https://avatars.githubusercontent.com/u/32710302?s=200&v=4">
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label class="text-left" style="text-decoration: none;">FizzyFlow</q-item-label>
          <q-item-label caption  class="text-left" style="text-decoration: none;">Build. Build. Build</q-item-label>
        </q-item-section>
      </q-item>
    </router-link>
    </q-card>



    <q-card class="projects" flat style="display: inline-block; ">
    <router-link href="https://x.com/suidouble" target="_blank"  style="text-decoration: none;">
      <q-item>
        <q-item-section avatar>
          <q-avatar size="56px">
            <img src="https://pbs.twimg.com/profile_images/1798346265354178560/K_lWny0V_400x400.jpg">
          </q-avatar>
        </q-item-section>

        <q-item-section>
          <q-item-label class="text-left" style="text-decoration: none;">double.sui</q-item-label>
          <q-item-label caption  class="text-left" style="text-decoration: none;">Follow me on X</q-item-label>
        </q-item-section>
      </q-item>
    </router-link>
    </q-card>

                        </div>
                    </div>

                </div>
                <div class="col-2"></div>
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