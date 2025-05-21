<template>

<div>

    <q-list bordered class="non-selectable	"  v-if="selectedItemType">

<q-expansion-item  
    expand-separator
    default-opened
    icon="hub"
    :label="'Blockchain ('+network+')'"
    dense-toggle
    >


            <DbExplorerBlockchainInfo :db="db" @flushCalculations="flushCalculations" />

</q-expansion-item>


</q-list>
    
    <q-list bordered class="non-selectable	q-mt-md">
        <q-item clickable v-ripple  
            active-class="bg-teal-1 text-grey-8" 
            @click="changeDb" 
            >
            <q-item-section avatar>
                <q-icon color="primary" name="arrow_back" />
            </q-item-section>
            <q-item-section>Other Databases</q-item-section>
        </q-item>

        <q-separator />

        <template v-for="(table, index) in tables">
            <q-expansion-item  
                @click="selectItem('table', table)" 
                expand-separator
                icon="table"
                :active="selectedItemType == 'table' && selectedItemParam == table"
                active-class="bg-teal-1 text-grey-8"
                :label="table"
                dense-toggle
                >
                <q-list bordered class="non-selectable	">
                    <q-item clickable v-ripple  
                        active-class="bg-teal-1 text-grey-8" 
                        @click="selectItem('table', table)" 
                        
                        :active="selectedItemType == 'table' && selectedItemParam == table"
                        >
                        <q-item-section avatar>
                            <q-icon color="primary" name="table" />
                        </q-item-section>
                        <q-item-section>Browse</q-item-section>
                    </q-item>
                    <q-item clickable v-ripple  
                        active-class="bg-teal-1 text-grey-8" 
                        @click="selectItem('insert', table)" 
                        
                        :active="selectedItemType == 'insert' && selectedItemParam == table"
                        >
                        <q-item-section avatar>
                            <q-icon color="primary" name="add_box" />
                        </q-item-section>
                        <q-item-section>Insert</q-item-section>
                    </q-item>
                </q-list>
            </q-expansion-item>
        </template>

        <q-item :active="selectedItemType == 'add_table'" clickable v-ripple  active-class="bg-teal-1 text-grey-8" @click="selectItem('add_table')" >
            <q-item-section avatar>
                <q-icon color="primary" name="add_box" />
            </q-item-section>

            <q-item-section>Add Table</q-item-section>
        </q-item>

        <q-item :active="selectedItemType == 'sql'" clickable v-ripple  active-class="bg-teal-1 text-grey-8" @click="selectItem('sql')" >
            <q-item-section avatar>
                <q-icon color="primary" name="arrow_forward" />
            </q-item-section>

            <q-item-section>Execute SQL</q-item-section>
        </q-item>
    </q-list>


    <q-list bordered class="non-selectable	q-mt-md" v-if="selectedItemType">

<q-expansion-item  
    expand-separator
    default-opened
    icon="dns"
    label="DB Blobs"
    dense-toggle
    >

        <DbExplorerDbPagesViewer :db="db" ref="binaryViewer" />

</q-expansion-item>


</q-list>





</div>

</template>
<style lang="css">


</style>
<script>
import SuiObjectLink from 'shared/components/CommonSui/SuiObjectLink.vue';
import { toRaw } from 'vue';

import DbExplorerDbPagesViewer from './DbExplorerDbPagesViewer.vue';
import DbExplorerBlockchainInfo from './DbExplorerBlockchainInfo.vue';

export default {
	name: 'DbExplorerSidebarMenu',
    emit: [],
    components: {
        SuiObjectLink,
        DbExplorerDbPagesViewer,
        DbExplorerBlockchainInfo,
    },
	props: {
        db: Object,
	},
	data() {
		return {
            tables: [],
            selectedItemType: null,
            selectedItemParam: null,

            isSyncing: false,

            needSync: false,

            showPageViewer: true,
        }
	},
	computed: {
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
        flushCalculations() {
            this.$forceUpdate();
            this.$refs.binaryViewer.flushCalculations();
        },
        changeDb() {
            if (this.db && this.db.hasUnsavedChanges()) {
                this.$q.dialog({
                    title: 'Unsaved changes',
                    message: 'You have unsaved changes. Do you want to continue?',
                    persistent: true,
                    cancel: true,
                }).onOk(() => {
                    this.$emit('changeDb');
                });
            } else {
                this.$emit('changeDb');
            }
        },
        // async fillWalrus() {
        //     await toRaw(this.db).fillExpectedWalrus();
        // },
        // unsavedChangesCount() {
        //     const count = this.db.unsavedChangesCount();
        //     if (!count) {
        //         this.needSync = false;
        //     } else {
        //         this.needSync = true;
        //     }

        //     return count;
        // },
        selectItem(type, param) {
            this.selectedItemType = type;
            this.selectedItemParam = param;

            this.$emit('select', type, param);
        },
        async refreshTables() {
            const tables = await this.db.listTables();
            this.tables = tables;
        },
        // async sync() {
        //     this.isSyncing = true;
        //     try {
        //         await toRaw(this.db).sync();
        //         this.$refs.binaryViewer.flushCalculations();
        //     } catch(e) {
        //         console.error(e);
        //         this.$q.notify({
        //                 message: 'Error: '+e,
        //                 color: 'negative',
        //             });
        //     }
        //     this.isSyncing = false;

        //     this.$forceUpdate();
        //     this.$refs.binaryViewer.flushCalculations();
        // },
        // async syncForce() {
        //     this.isSyncing = true;
        //     try {
        //         await toRaw(this.db).sync({
        //                 forceWalrus: true,
        //             });
        //         this.$refs.binaryViewer.flushCalculations();
        //     } catch(e) {
        //         console.error(e);
        //         this.$q.notify({
        //                 message: 'Error: '+e,
        //                 color: 'negative',
        //             });
        //     }
        //     this.isSyncing = false;

        //     this.$forceUpdate();
        // },
	},
	unmounted: function() {
        // clearInterval(this.__timeout);
	},
	mounted: function(){
        this.refreshTables();

        // this.__timeout = setInterval(() => {
        //     this.unsavedChangesCount();
        // }, 500);
	}
}

</script>