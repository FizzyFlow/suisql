<template>

<div>
    <div v-if="!enabled">

        <q-btn outline label="Enable Patch Debugger" @click="enable" color="primary" />

    </div>
    <div v-if="enabled">
        
            
        <div class="q-pa-md row items-start q-gutter-xs">

            <template v-for="(dbPage, index) in pages" :key="dbPage.index">


                <q-card flat bordered class="db_page_item" :class="{highlight: dbPage.highlight}">
                <q-card-section class="q-pa-xs">
                <div style="font-size: 8px;">{{ dbPage.sha256Readable }}</div>
                </q-card-section>
                </q-card>

            </template>


        </div>
            <q-banner inline-actions :dark="false" style="background-color: transparent;">
                <span>Patch methods comparison:</span>

                <template v-slot:action>
                </template>
            </q-banner>
            <q-banner inline-actions :dark="false" style="background-color: transparent;">
                <span>GZ Binary patch

                    <q-spinner color="primary" size="1em" v-if="binaryPatchVefified === null" />
                    <q-icon name="verified" color="positive" v-if="binaryPatchVefified === true" />
                    <q-icon name="dangerous" color="negative" v-if="binaryPatchVefified === false" />
                </span>

                <template v-slot:action>
                    {{ sizeAsBinaryPatch }}
                </template>
            </q-banner>
            <q-banner inline-actions :dark="false" style="background-color: transparent;">
                <span>GZ SQL patch


                    <q-spinner color="primary" size="1em" v-if="sqlPatchVerified === null" />
                    <q-icon name="verified" color="positive" v-if="sqlPatchVerified === true" />
                    <q-icon name="dangerous" color="negative" v-if="sqlPatchVerified === false" />
                </span>

                <template v-slot:action>
                    <div>
                        <q-btn round icon="search" @click="showSqlPatchDialog" size="sm"  color="primary" /> {{ sizeAsSQLPatch }}
                    </div>
                </template>
            </q-banner>
            <q-banner inline-actions :dark="false" style="background-color: transparent;">
                <span>Full Blob</span>

                <template v-slot:action>
                    {{ fullBlobSize }}
                </template>
            </q-banner>

            <q-dialog square v-model="showingSQLPatchDialog" @hide="showingSQLPatchDialog = false">
                <q-card  square flat style="overflow-x: hidden; width: 550px; max-width: 80vw; max-height: 85vh" class="moome_card" >
                    <q-card-section class="q-pa-md relative-position text-center">
                        SQL Patch:

                        <q-input
                            filled
                            v-model="sqlPatch"
                            type="textarea"
                            rows="10"
                            style="width: 100%; max-width: 100%;"
                            class="q-mt-md" />

                    </q-card-section>
                </q-card>
            </q-dialog>

    </div>


</div>

</template>
<style lang="css" scoped>

    .db_page_item {
        background-color: rgba(0, 0, 0, 0) !important;
        transition: background-color 1s;
    }

    .db_page_item.highlight {
        background-color: rgba(30, 126, 236, 0.568) !important;
    }

</style>
<script>
import { toRaw } from 'vue';
import pako from 'pako';

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;

  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const value = bytes / Math.pow(k, i);

  return `${parseFloat(value.toFixed(dm))} ${sizes[i]}`;
}
const areEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export default {
	name: 'DbExplorerDbPagesViewer',
    emit: [],
    components: {
    },
	props: {
        db: Object,
	},
	data() {
		return {
            enabled: false,

            pages: [],
            pagesCount: 0,

            originalBinary: null,

            sizeAsBinaryPatch: 0,
            binaryPatchVefified: null,

            sizeAsSQLPatch: 0,
            sqlPatchVerified: null,
            
            fullBlobSize: 0,

            showingSQLPatchDialog: false,
            sqlPatch: '',

            dbCopy: null,
            dbCopySyncedAt: null,
        }
	},
	computed: {
        mostRecentWriteChangeTime() {
            return this.db.mostRecentWriteChangeTime;
        }
	},
	watch: {
        mostRecentWriteChangeTime() {
            this.rebuildList();
        },
	},
	methods: {
        enable() {
            this.enabled = true;
            this.rebuildList();
        },
        async showSqlPatchDialog() {
            const sqlPatch = await this.db.suiSqlSync.getPatchJSON();
            this.sqlPatch = sqlPatch;
            this.showingSQLPatchDialog = true;
        },
        flushCalculations() {
            this.originalBinary = null;
            this.pages = [];
            this.pagesCount = 0;
            this.rebuildList();
        },
        async rebuildList() {
            if (!this.enabled) {
                return false;
            }

            try {
                const binaryView = this.db.getBinaryView();
                this.pagesCount = binaryView.getPagesCount();
                
                if (!this.originalBinary) {
                    this.originalBinary = binaryView;
                }

                console.log('binaryView', binaryView);
                console.log('this.originalBinary', this.originalBinary);
                console.log(' this.db.initialBinaryView',  this.db.initialBinaryView);

                if (this.db.initialBinaryView) {
                    this.originalBinary = this.db.initialBinaryView;
                }

                if (this.pagesCount) {
                    if (!this.originalBinary) {
                        this.originalBinary = binaryView;
                    } else {
                        const binaryPatch = await binaryView.getBinaryPatch(this.originalBinary);
                            console.log(this.originalBinary.binary.length);
                            console.log(binaryView.binary.length);
                            console.log('----');
                        this.sizeAsBinaryPatch = formatBytes(binaryPatch.length);

                        this.binaryPatchVefified = null;
                        setTimeout(async ()=>{
                            const patched = await this.originalBinary.getPatched(binaryPatch);
                            console.log(patched.length);
                            console.log(binaryView.binary.length);

                            if (areEqual(patched, binaryView.binary)) {
                                this.binaryPatchVefified = true;
                            } else {
                                this.binaryPatchVefified = false;
                            }
                        }, 500);


                        const sqlPatch = await this.db.suiSqlSync.getPatch();
                        this.sizeAsSQLPatch = formatBytes(sqlPatch.length);

                        this.sqlPatchVerified = null;
                        setTimeout(async ()=>{
                            let dbCopy = null;
                            dbCopy = await toRaw(this.db).database('compare');
                            // if (this.dbCopy) {
                            //     dbCopy = toRaw(this.dbCopy);
                            // } else {
                            //     dbCopy = await toRaw(this.db).database('compare');
                            //     this.dbCopy = dbCopy;
                            //     this.dbCopySyncedAt = dbCopy.suiSqlSync.syncedAt;
                            // }

                            dbCopy.suiSqlSync.syncedAt = this.dbCopySyncedAt;
                            await dbCopy.replace(this.originalBinary.binary);

                            await new Promise((res)=>setTimeout(res, 100));

                            dbCopy.suiSqlSync.applySqlPatch(sqlPatch);

                            console.log('sqlPatch', sqlPatch);
                            console.log(dbCopy.export());
                            console.log(binaryView.binary);

                            await new Promise((res)=>setTimeout(res, 100));
                            
                            if (areEqual(dbCopy.export(), binaryView.binary)) {
                                this.sqlPatchVerified = true;
                            } else {
                                this.sqlPatchVerified = false;
                            }
                        }, 600);



                        this.fullBlobSize = formatBytes(binaryView.binary.length);
                    }
                }



                for (let i = 0; i < this.pagesCount; i++) {
                    const sha256 = await binaryView.getPageSha256(i);
                    if (!this.pages[i]) {
                        this.pages.push({
                            index: i,
                            sha256: sha256,
                            sha256Readable: `${sha256.slice(0, 5)}...${sha256.slice(-5)}`,
                            highlight: true,
                        });

                        setTimeout(() => {
                            this.pages[i].highlight = false;
                        }, 1000);
                    }

                    if (this.pages[i].sha256 !== sha256) {
                        this.pages[i].highlight = true;
                        this.pages[i].sha256 = sha256;
                        this.pages[i].sha256Readable = `${sha256.slice(0, 5)}...${sha256.slice(-5)}`;

                        setTimeout(() => {
                            this.pages[i].highlight = false;
                        }, 1000);
                    }
                }


            } catch(e) {
                console.error(e);
            }
        },
	},
	unmounted: function() {
	},
	mounted: function(){
        this.rebuildList();
	}
}

</script>