<template>

    <q-card  flat square class="q-pa-md">
        <q-card-section class="q-pa-none relative-position">
            <h6  class="text-primary">Run SQL</h6>

            <div v-if="isPreparing">

                <q-input v-model="sql" filled type="textarea" />
                <q-btn
                color="primary"
                label="Run"
                no-caps
                outline
                @click="run"
                />

            </div>

            <DbExplorerSQLData disableActions :db="db" :sql="sql" v-if="!isPreparing" />

        </q-card-section>
    </q-card>

</template>
<style lang="css">


</style>
<script>
import DbExplorerSQLData from './DbExplorerSQLData.vue';

export default {
	name: 'DbExplorerRunSQL',
    emit: [],
    components: {
        DbExplorerSQLData,
    },
	props: {
        db: Object,
        tableName: String,
	},
	data() {
		return {
            columns: [],
            rows: [],

            sql: 'SELECT * FROM ',
            isPreparing: true,
        }
	},
	computed: {
	},
	watch: {
	},
	methods: {
        async run() {
            this.isPreparing = false;
        },
	},
	unmounted: function() {
	},
	mounted: function(){
	}
}

</script>