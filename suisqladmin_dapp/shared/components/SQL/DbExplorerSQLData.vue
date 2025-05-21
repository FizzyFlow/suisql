<template>

    <div>

            <q-table
                :rows="rows"
                :columns="columns"
                binary-state-sort
                color="primary"
                v-model:pagination="pagination"
                :rows-per-page-options="[2, 10,20,50,100,500]"
                @request="onRequest"
                flat
                >

                <template v-slot:body-cell="props">
                    <q-td :props="props">
                        <q-input
                        v-if="rowToEdit && rowToEdit === props.row"
                        v-model.number="props.row[ props.col.name ]"
                        @change="updatedFields[ props.col.name ] = true"
                        color="primary"
                        outline
                        dense
                        />
                        <template v-if="!rowToEdit || rowToEdit !== props.row">
                            {{ props.row[ props.col.name ] }}
                        </template>
                    </q-td>
                </template>
                <template v-slot:body-cell-action="props">
				<q-td :props="props">
					<q-btn
                    v-if="rowToEdit && rowToEdit === props.row"
					color="primary"
					icon-right="save"
					no-caps
					flat
                    @click="saveRow"
					dense
					/>
					<q-btn
					color="primary"
					icon-right="edit"
					no-caps
					flat
                    @click="editRow( props.row )"
					dense
					/>
					<q-btn
					color="negative"
					icon-right="delete"
					no-caps
					flat
					dense
                    @click="clickRemove(props.row)"
					/>
				</q-td>
			</template>
            </q-table>

    </div>

</template>
<style lang="css">


</style>
<script>
// import { set } from 'lscache';


function sqlEscape(value) {
  if (typeof value === 'string') {
    return value
      .replace(/\\/g, '\\\\')   // backslashes
      .replace(/\u0008/g, '\\b')
      .replace(/\t/g, '\\t')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\u0000/g, '\\0')
      .replace(/'/g, "''")      // single quotes
      .replace(/"/g, '\\"');    // double quotes
  }
  return value;
}

export default {
	name: 'DbExplorerSQLData',
    emit: [],
    components: {
    },
	props: {
        db: Object,
        sql: String,
        disableActions: {
            type: Boolean,
            default: false,
        },
	},
	data() {
		return {
            sqlNormalized: null,
            columns: [],
            rows: [],

            totalCount: 0,
			pagination: {
				sortBy: null,
				descending: false,
				page: 1,
				rowsPerPage: 50,
				rowsNumber: 10000
			},

            rowToEdit: null,
            rowToEditBackup: {},
            updatedFields: {},
        }
	},
	computed: {
	},
	watch: {
        sql() {
            this.initialize();
        },
	},
	methods: {
        editRow(row) {
            if (this.rowToEdit) {
                for (const key in this.rowToEditBackup) {
                    this.rowToEdit[key] = this.rowToEditBackup[key];
                }
            }
            this.rowToEdit = row;
            this.updatedFields = {};
            this.rowToEditBackup = JSON.parse(JSON.stringify(row));
        },
        async saveRow() {
            const tableName = this.sql.match(/FROM\s+(\w+)/)[1];
            const wheres = [];
            const sets = [];
            for (const key in this.rowToEdit) {
                if (!this.updatedFields[key]) {
                    wheres.push(`${key} = '${sqlEscape(this.rowToEdit[key])}'`);
                } else {
                    sets.push(`${key} = '${sqlEscape(this.rowToEdit[key])}'`);
                }
            }

            const sql = `UPDATE ${tableName} SET ${sets.join(', ')} WHERE ${wheres.join(' AND ')}`;

            await this.db.run(sql);

            await this.getData();

            this.rowToEdit = null;
        },
        async clickRemove(row) {
            this.$q.dialog({
                    title: 'Confirm',
                    message: 'Are you sure that you want to delete this row?',
                    cancel: true,
                    persistent: true
                }).onOk(() => {
                    this.doRemove(row);
                });
        },
        async doRemove(row) {
            const tableName = this.sql.match(/FROM\s+(\w+)/)[1];
            const wheres = [];
            for (const key in row) {
                wheres.push(`${key} = '${sqlEscape(row[key])}'`);
            }
            const sql = `DELETE FROM ${tableName} WHERE ${wheres.join(' AND ')}`;
            await this.db.run(sql);

            await this.getData();

            this.$q.notify({
                        message: 'Row removed',
                        color: 'positive',
                    });
        },
        async onRequest(props) {
            console.log('data requested');
			const { page, rowsPerPage, sortBy, descending } = props.pagination;


            // this.pagination.rowsNumber = resp.total;
            this.pagination.page = page;
            this.pagination.rowsPerPage = rowsPerPage;
            this.pagination.sortBy = sortBy;
            this.pagination.descending = descending;


            this.getData();
        },
        async getData() {
            this.columns = [];

            let sql = ''+this.sql;

            if (this.pagination.sortBy) {
                sql += ` ORDER BY ${this.pagination.sortBy} ${this.pagination.descending ? 'DESC' : 'ASC'}`;
            }

            sql += ` LIMIT ${this.pagination.rowsPerPage} OFFSET ${(this.pagination.page - 1) * this.pagination.rowsPerPage}`;

            this.rows = [];
            const results = await this.db.query(sql);

            for (const result of results) {
                for (const key in result) {
                    if (!this.columns.find(c => c.name == key)) {
                        this.columns.push({
                            name: key,
                            label: key,
                            align: 'left',
                            field: key,
                            sortable: true,
                        });
                    }
                }

                this.rows.push(result);
            }

            if (!this.disableActions) {

                if (!this.columns.find(c => c.name == 'action')) {
                    this.columns.push({
                        name: 'action',
                        label: 'Action',
                        field: 'action',
                    });
                }

            }

        },
        async getTotalCountFromSql() {
            let countSql = (''+this.sql);
            countSql = countSql.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as count FROM');

            const results = await this.db.query(countSql);
            const count = results[0].count;
            this.totalCount = count;
            this.pagination.rowsNumber = count;

            await this.getData();
        },
        async initialize() {
            this.pagination.sortBy = null;
            this.columns = [];
            this.pagination.page = 1;
            this.getTotalCountFromSql();
        },
	},
	unmounted: function() {
	},
	mounted: function(){
        this.initialize();
	}
}

</script>