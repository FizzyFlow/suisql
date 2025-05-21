<template>

    <q-card  flat square class="q-pa-md">
        <q-card-section class="q-pa-none relative-position">
            <h6  class="text-primary">Make Table</h6>

            <q-input outlined v-model="tableName" label="Table Name" />

            <template v-for="(field, index) in fields">
                <div class="row q-ma-md q-col-gutter-sm">
                    <q-input outlined v-model="field.name" label="Field Name" dense />
                    <q-select outlined v-model="field.type" :options="possibleTypes" dense label="Outlined" />

                    <q-checkbox v-model="field.pk" label="Primary Key" />
                    <q-checkbox v-model="field.unique" label="Unique" />

                    <q-input outlined v-model="field.default" label="Default" dense />

                    <q-checkbox v-model="field.notNull" label="Not NULL" />
                </div>
            </template>

            <q-btn label="Add Field" outline  @click="addField" color="primary" />

        </q-card-section>
        <q-card-section class="q-pa-none relative-position">

            <div>
                <pre>{{ previewSql }}</pre>
            </div>

            <q-btn label="Execute" outline  @click="execute" color="primary" />

        </q-card-section>
    </q-card>

</template>
<style lang="css">


</style>
<script>

export default {
	name: 'DbExplorerMakeTable',
    emit: [],
    components: {
    },
	props: {
        db: Object,
	},
	data() {
		return {
            tableName: '',
            fields: [
                {name: 'id', type: 'INTEGER', pk: true, unique: false, notNull: false, },
            ],
            checked: true,

            possibleTypes: ['INTEGER', 'TEXT', 'NUMERIC', 'REAL', 'BLOB'],
        }
	},
	computed: {
        previewSql() {
            let sql = `CREATE TABLE ${this.tableName} (\n`;
            sql += this.fields.map(field => {
                let fieldSql = `    ${field.name} ${field.type}`;
                
                if (field.unique) {
                    fieldSql += ' UNIQUE';
                }
                if (field.pk) {
                    fieldSql += ' PRIMARY KEY';
                }
                if (field.default) {
                    fieldSql += ` DEFAULT '${field.default}' `;
                }
                if (field.notNull) {
                    fieldSql += ' NOT NULL';
                }

                return fieldSql;
            }).join(',\n');
            sql += '\n);';
            return sql;
        },
	},
	watch: {
	},
	methods: {
        async execute() {
            const sql = this.previewSql;

            try {
                const result = await this.db.run(sql);
                this.$emit('created');
                this.$q.notify({
                        message: 'Table created',
                        color: 'positive',
                    });
            } catch (e) {
                this.$q.notify({
                        message: ''+e,
                        color: 'negative',
                    });
            }
        },
        addField() {
            this.fields.push({name: '', type: 'INTEGER', pk: false, unique: false, notNull: false, });
        },
	},
	unmounted: function() {
	},
	mounted: function(){
	}
}

</script>