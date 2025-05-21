<template>

    <q-card  flat square bordered class="q-pa-md">
        <q-card-section class="q-pa-none relative-position">
            <h6 class="text-primary">database: {{ dbName }}</h6>

            <div class="row q-col-gutter-sm" >
                <div class="col-4">
                    <DbExplorerBlockchainInfo :db="db" />
                </div>
                <div class="col-4">
                    <DbExplorerDbPagesViewer :db="db" />
                </div>
                <div class="col-4">
                    <DbExplorerSampler :db="db"  @refresh="$emit('refresh')" />
                </div>
            </div>

        </q-card-section>
    </q-card>

</template>
<style lang="css">


</style>
<script>
import DbExplorerDbPagesViewer from './DbExplorerDbPagesViewer.vue';
import DbExplorerBlockchainInfo from './DbExplorerBlockchainInfo.vue';
import DbExplorerSampler from './DbExplorerSampler.vue';

export default {
	name: 'DbWelcome',
    emit: [],
    components: {
        DbExplorerDbPagesViewer,
        DbExplorerBlockchainInfo,
        DbExplorerSampler,
    },
	props: {
        db: Object,
	},
	data() {
		return {
        }
	},
	computed: {
        dbName() {
            if (this.db && this.db.name) {
                return this.db.name;
            }
            return null;
        },
	},
	watch: {
	},
	methods: {
	},
	unmounted: function() {
	},
	mounted: function(){
	}
}

</script>