<template>

    <div  class="relative-position" style="min-height: 50vh;">

        <q-inner-loading
            showing
            color="primary"
            label="Connecting to Sui..."
            label-class="text-primary"
            label-style="font-size: 1.1em"
            v-if="!readyForDb" 
            />

        <DbExplorer v-if="readyForDb" />

    </div>

</template>

<script>
import DbExplorer from 'shared/components/SQL/DbExplorer.vue';

export default {
	name: 'Home',
    path: '/',
	props: {
	},
    components: {
        DbExplorer,
    },
	data() {
		return {
            chain: 'sui:mainnet',
            siteId: null,
		}
	},
	methods: {
	},
    watch: {
    },
    computed: {
        connectionId() {
            if ( this.$store.sui && this.$store.sui.connectionId ) {
                return this.$store.sui.connectionId;
            }
            return null;
        },
        readyForDb() {
            if (this.$store.sui && this.$store.sui.connectedChain) {
                return true;
            }
            return false;
        },
    },
    beforeMount() {
    },
    mounted() {
    },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>

    .fileInput {
        display: none;
    }

</style>

