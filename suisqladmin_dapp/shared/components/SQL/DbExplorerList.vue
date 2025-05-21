<template>

    <q-card  flat square class="q-pa-md">
        <q-card-section class="q-pa-none relative-position">
            <h6  class="text-primary">{{ tableName }} rows</h6>

            <DbExplorerSQLData :db="db" :sql="sql" />

        </q-card-section>
    </q-card>

</template>
<style lang="css">


</style>
<script>
import DbExplorerSQLData from './DbExplorerSQLData.vue';

export default {
	name: 'DbExplorerList',
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
        }
	},
	computed: {
        sql() {
            return `SELECT * FROM ${this.tableName}`;
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