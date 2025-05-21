<template>

    <div>
    
        <q-banner inline-actions :dark="false"  style="background-color: transparent;">
            <span>State&nbsp;</span>
            <span>
                {{dbState}}
            </span>
        </q-banner>

        <q-banner inline-actions :dark="false"  style="background-color: transparent;">
            <span v-if="!needSync && !isSyncing">Rights</span>
            <span>
                READ
            </span>
            <span v-if="hasWriteAccessLoading">
                <q-spinner color="primary" size="1em" />
            </span>
            <span v-if="hasWriteAccess">+ WRITE</span>
        </q-banner>

        <q-banner inline-actions :dark="false"  style="background-color: transparent;">
            <span v-if="!needSync && !isSyncing">Up to date</span>
            <span v-if="needSync">
                {{ unsavedChangesCount() }} patches
            </span>
            <span v-if="isSyncing">
                syncing <q-spinner color="primary" size="1em" />
            </span>


            <template v-slot:action>
                <q-btn-group outline>
                    <q-btn outline color="primary" label="Save" 
                        v-if="needSync || isSyncing" 
                        :loading="isSyncing" @click="sync" />
                    <q-btn outline color="primary" label="Save (force Walrus)" 
                        v-if="needSync || isSyncing" 
                        :loading="isSyncing" @click="syncForce" />
                </q-btn-group>
            </template>
        </q-banner>


        <q-banner inline-actions :dark="false"  style="background-color: transparent;">
        <span>DB Object</span>

        <template v-slot:action>
            <SuiObjectLink :id="db.id" v-if="db && db.id" color="primary" />
        </template>
        </q-banner>



        <q-banner inline-actions :dark="false"  style="background-color: transparent;">
        <span>Base Walrus Blob</span>

        <template v-slot:action>
            {{  walrusBlobIdAsString  }}&nbsp;<q-btn v-if="walrusExplorerURL" 
                        type="a" :href="walrusExplorerURL" icon="dns" size="sm" outline target="_blank" color="primary" />
        </template>
        </q-banner>  

        <q-banner inline-actions :dark="false"  style="background-color: transparent;">
        <span>Base Blob End Epoch</span>

        <template v-slot:action>
            {{  walrusEndEpoch  }}&nbsp; <q-btn v-if="walrusEndEpoch" 
            icon="add" size="sm" outline @click="extendEpoch" color="primary" />
        </template>
        </q-banner>  
    
    </div>
    
    </template>
    <style lang="css">
    
    
    </style>
    <script>
    import SuiObjectLink from 'shared/components/CommonSui/SuiObjectLink.vue';
    import { toRaw } from 'vue';
    
    export default {
        name: 'DbExplorerBlockchainInfo',
        emit: [],
        components: {
            SuiObjectLink,
        },
        props: {
            db: Object,
        },
        data() {
            return {
                isSyncing: false,
    
                needSync: false,
    
                showPageViewer: true,

                hasWriteAccess: false,
                hasWriteAccessLoading: true,
            }
        },
        computed: {
            dbState() {
                if (this.db && this.db.state) {
                    return this.db.state;
                }
                return null;
            },
            network() {
                if (this.db && this.db.network) {
                    return this.db.network;
                }
                return null;
            },
            needSyncToWatch() {
                if (this.db.hasUnsavedChanges()) {
                    return true;
                }
                return false;
            },
            walrusEndEpoch() {
                if (this.db && this.db.walrusEndEpoch) {
                    return ''+this.db.walrusEndEpoch;
                }
                return null;
            },
            walrusBlobId() {
                if (this.db && this.db.walrusBlobId) {
                    return ''+this.db.walrusBlobId;
                }
                return null;
            },
            walrusBlobIdAsString() {
                if (!this.walrusBlobId) {
                    return null;
                }
                const blobId = this.walrusBlobId;
                return blobId.slice(0, 4) + '...' + blobId.slice(-4);
            },
            walrusExplorerURL() {
                if (this.walrusBlobId) {
                    const network = this.db.network;
                    if (network == 'testnet') {
                        return 'https://walruscan.com/testnet/blob/'+this.walrusBlobId;
                    } else {
                        return 'https://walruscan.com/mainnet/blob/'+this.walrusBlobId;
                    }
                }
                return null;
            }
        },
        watch: {
            needSyncToWatch() {
                this.needSync = this.db.hasUnsavedChanges();
            },
        },
        methods: {
            unsavedChangesCount() {
                const count = this.db.unsavedChangesCount();
                if (!count) {
                    this.needSync = false;
                } else {
                    this.needSync = true;
                }
    
                return count;
            },
            async extendEpoch() {
                this.isSyncing = true;
                try {
                    await toRaw(this.db).extendWalrus(10);
                    this.$emit('flushCalculations');
                } catch(e) {
                    console.error(e);
                    this.$q.notify({
                            message: 'Error: '+e,
                            color: 'negative',
                        });
                }
                this.isSyncing = false;

                this.$forceUpdate();
                this.$emit('flushCalculations');
            },
            async sync() {
                this.isSyncing = true;
                try {
                    await toRaw(this.db).sync();
                    this.$emit('flushCalculations');
                } catch(e) {
                    console.error(e);
                    this.$q.notify({
                            message: 'Error: '+e,
                            color: 'negative',
                        });
                }
                this.isSyncing = false;

                this.$forceUpdate();
                this.$emit('flushCalculations');
            },
            async syncForce() {
                this.isSyncing = true;
                try {
                    await toRaw(this.db).sync({
                            forceWalrus: true,
                        });
                    this.$emit('flushCalculations');
                } catch(e) {
                    console.error(e);
                    this.$q.notify({
                            message: 'Error: '+e,
                            color: 'negative',
                        });
                }
                this.isSyncing = false;

                this.$forceUpdate();
            },
            async loadRights() {
                if (this.db) {
                    this.hasWriteAccess = await toRaw(this.db).hasWriteAccess();
                }
                this.hasWriteAccessLoading = false;
            }
        },
        unmounted: function() {
            clearInterval(this.__timeout);
        },
        mounted: function(){
            this.loadRights();
            this.__timeout = setInterval(() => {
                this.unsavedChangesCount();
            }, 1000);
        }
    }
    
    </script>