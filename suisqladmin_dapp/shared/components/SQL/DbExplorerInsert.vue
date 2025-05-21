<template>

    <q-card  flat square class="q-pa-md">
        <q-card-section class="q-pa-none relative-position">
            <h6  class="text-primary">Insert into {{ tableName }}</h6>

            <template v-for="(field, index) in fields">
                <div class="row q-ma-md q-col-gutter-sm">
                    <q-checkbox v-model="nulls[field.name]" label="NULL" />
                    <q-input outlined v-model="add[field.name]" :disable="nulls[field.name]" :label="field.name" dense />
                </div>
            </template>

        </q-card-section>
        <q-card-section class="q-pa-none relative-position">

            <div>
                <pre>{{ previewSql }}</pre>
            </div>

            <q-btn label="Insert" outline  @click="execute" />

        </q-card-section>
    </q-card>

</template>
<style lang="css">


</style>
<script>
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
	name: 'DbExplorerInsert',
    emit: [],
    components: {
    },
	props: {
        db: Object,
        tableName: String,
	},
	data() {
		return {
            fields: [],
            add: {},
            nulls: {},
        }
	},
	computed: {
        previewSql() {
            let sql = `INSERT INTO ${this.tableName} (`;
            for (const field of this.fields) {
                sql += `${field.name}, `;
            }
            sql = sql.slice(0, -2);
            sql += ') VALUES (';
            for (const field of this.fields) {
                if (this.nulls[field.name]) {
                    sql += 'NULL, ';
                } else {
                    sql += `'${sqlEscape(this.add[field.name])}', `;
                }
            }
            sql = sql.slice(0, -2);
            sql += ')';  

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
                this.$emit('inserted');;
                this.$q.notify({
                        message: 'Row inserted',
                        color: 'positive',
                    });
            } catch (e) {
                this.$q.notify({
                        message: ''+e,
                        color: 'negative',
                    });
            }
        },
        async initialize() {
            this.fields = [];
            const fields = await this.db.describeTable(this.tableName);
            for (const field of fields) {
                this.fields.push({
                    name: field.name,
                });
                this.nulls[field.name] = false;
                this.add[field.name] = '';

                if (field.name == 'id') {
                    this.nulls[field.name] = true;
                }
            }
        },
	},
	unmounted: function() {
	},
	mounted: function(){
        this.initialize();
	}
}

</script>