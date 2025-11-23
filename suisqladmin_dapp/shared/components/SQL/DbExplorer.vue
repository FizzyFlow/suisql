<template>

    <q-card flat >
        <q-card-section class="q-pa-none relative-position q-pa-md" style="min-height: 85vh;">
            
            <DbExplorerSelectDb v-if="!db && !dbName && connectedChain" @dbName="onDbNameSelected" :network="connectedChain" />

            <div class="row q-col-gutter-sm" v-if="dbName">
                <div class="col-3">

                    <DbExplorerSidebarMenu :db="db" v-if="db" ref="sidebar" @select="onSidebarSelect"
                    @changeDb="changeDb"    />

                </div>
                <div class="col-9">

                    <q-card class="relative-position" flat bordered v-if="!db" style="min-height: 300px;">
                        <q-inner-loading
                            showing
                            label="SuiSQL DB initializing..."
                            label-class="text-primary"
                            color="primary"
                            label-style="font-size: 1.1em"
                            />
                    </q-card>

                    <DbWelcome :db="db" v-if="db && !selectedItemType" @refresh="onDbCreated" />

                    <DbExplorerMakeTable :db="db" v-if="db && selectedItemType == 'add_table'" 
                        @created="onDbCreated"  />
                    <DbExplorerInsert :db="db" v-if="db && selectedItemType == 'insert'" 
                        :tableName="selectedItemParam"
                        @created="onDbCreated"  />
                    <DbExplorerList :db="db" v-if="db && selectedItemType == 'table'" 
                        :tableName="selectedItemParam"
                        @created="onDbCreated"  />
                    <DbExplorerRunSQL :db="db" v-if="db && selectedItemType == 'sql'" />

                </div>
            </div>


        </q-card-section>
    </q-card>

</template>
<style lang="css">


</style>
<script>
import SuiSql from '@fizzyflow/suisql';
// import { runWasm } from 'suisql';

import DbExplorerSelectDb from './DbExplorerSelectDb.vue';

import DbWelcome from './DbWelcome.vue';
import DbExplorerMakeTable from './DbExplorerMakeTable.vue';
import DbExplorerInsert from './DbExplorerInsert.vue';
import DbExplorerList from './DbExplorerList.vue';
import DbExplorerSidebarMenu from './DbExplorerSidebarMenu.vue';
import DbExplorerRunSQL from './DbExplorerRunSQL.vue';

import { WalrusClient } from '@mysten/walrus';

import { SuiUtils } from 'suidouble';

// import { Agent, fetch, setGlobalDispatcher } from 'undici';

export default {
	name: 'DbExplorer',
    emit: [],
    components: {
        DbExplorerSelectDb,
        DbWelcome,

        DbExplorerMakeTable,
        DbExplorerSidebarMenu,
        DbExplorerList,
        DbExplorerInsert,
        DbExplorerRunSQL,
    },
	props: {
        dbId: String,
	},
	data() {
		return {
            state: null,
            tables: [],
            db: null,

            selectedItemType: null,
            selectedItemParam: null,

            dbName: null,
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
	},
	methods: {
        changeDb() {
            this.dbName = null;
            this.db = null;
            this.state = null;
            this.selectedItemType = null;
            this.selectedItemParam = null;
            history.pushState({}, '', '/' );
        },
        onDbNameSelected(name) {
            this.dbName = name;
            history.pushState({}, '', '/?db=' + encodeURIComponent(name) );
            this.initialize();
        },
        onSidebarSelect(type, param) {
            this.selectedItemType = type;
            this.selectedItemParam = param;
        },
        async initialize() {
            const suiMaster = this.$store.sui.suiMaster;
            if (!suiMaster) {
                return;
            }

            const network = (''+suiMaster.connectedChain).split('sui:').join(''); // testnet, mainnet
            const suiClient = SuiUtils.normalizeClient(network); // instance of Sui SDK client

            const signAndExecuteTransaction = async (tx) => {
                tx.setSenderIfNotSet(suiMaster.address); // connected addy
                await tx.build({
                    client: suiClient,  // instance of Sui SDK client
                });

                const results = await suiMaster.signAndExecuteTransaction({
                    transaction: tx, // tx with built intents
                });

                // returning tx digest:
                return results.digest;
            };

            const uploadRelayOptions = {
                // https://upload-relay.mainnet.walrus.space/v1/tip-config
                host: 'https://upload-relay.mainnet.walrus.space',
                sendTip: {
                    address: "0x765a6ff2c13b47e2603416d0b5a156df498a5c51bc8085be3838e43e06086256",
                    kind: {
                        linear: {
                            base: 0,
                            perEncodedKib: 40
                        }
                    }
                },
            };
            if (network == 'testnet') {
                // https://upload-relay.testnet.walrus.space/v1/tip-config
                uploadRelayOptions.host = 'https://upload-relay.testnet.walrus.space';
                uploadRelayOptions.sendTip.address = '0x4b6a7439159cf10533147fc3d678cf10b714f2bc998f6cb1f1b0b9594cdc52b6';
                uploadRelayOptions.sendTip.kind.const = 105;
                delete uploadRelayOptions.sendTip.kind.linear;
            }

            let updateWalrusQueryNofification = null;
            let activeQueriesCount = 0;

            const walrusClient = new WalrusClient({
                network: network,
                suiClient: suiClient,
                wasmUrl: 'https://unpkg.com/@mysten/walrus-wasm@0.1.1/web/walrus_wasm_bg.wasm',
                uploadRelay: uploadRelayOptions,
                storageNodeClientOptions: {
                    fetch: async (url, options) => {
                        // in case we go without upload relay, we need to limit parallel queries
                        // to walrus storage nodes:
                        const maxParallelQueries = 30;
                        if (activeQueriesCount > maxParallelQueries) {
                            do {
                                await new Promise((res)=> setTimeout(res, 1000) );
                            } while (activeQueriesCount > maxParallelQueries);
                        }

                        activeQueriesCount++;

                        const urlToDisplay = url.slice(0, 40) + '...'

                        if (updateWalrusQueryNofification) {
                            updateWalrusQueryNofification({
                                spinner: true,
                                timeout: 3000,
                                message: 'Walrus: '+urlToDisplay,
                                caption: '-',
                            });
                        } else {
                            updateWalrusQueryNofification = this.$q.notify({
                                group: false, // required to be updatable
                                spinner: true,
                                timeout: 3000,
                                message: 'Walrus: '+urlToDisplay,
                                caption: 'walrus sync takes a lot of time in browser, please be patient',
                            });
                        }

                        try {
                            options.signal = AbortSignal.timeout(15000);
                            const res = await fetch(url, options);
                            activeQueriesCount--;
                            return res;
                        } catch (e) {
                            activeQueriesCount--;
                            throw e;
                        }
                    },
                    timeout: 170000,
                },
            });


            let aggregatorUrl = 'https://aggregator.walrus-testnet.walrus.space';
            let publisherUrl = 'https://walrus-publisher-testnet.n1stake.com';

            if (network == 'mainnet') {
                aggregatorUrl = 'https://aggregator.walrus-mainnet.walrus.space';
                publisherUrl = null;
            }

            const suiSQLOptions = {
                    network: network,
                    walrusClient: walrusClient,
                    suiClient: suiClient,
                    signAndExecuteTransaction: signAndExecuteTransaction,
                    debug: true,

                    currentWalletAddress: suiMaster.address,
                    aggregatorUrl: aggregatorUrl,
                    publisherUrl: publisherUrl,
                };
            if (this.dbName.startsWith('0x')) {
                suiSQLOptions.id = this.dbName;
            } else {
                suiSQLOptions.name = this.dbName;
            }

            const db = new SuiSql(suiSQLOptions);

            const state = await db.initialize();
            this.state = state;
            this.db = db;

            window.db = db;
        },
        onDbCreated() {
            this.$refs.sidebar.refreshTables();
        },
	},
	unmounted: function() {
	},
	mounted: function(){
        // this.initialize();
	}
}

</script>