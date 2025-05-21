<template>

    <q-btn-group push outline square>
        <q-btn :href="url" outline  :color="color"  :size="size" target="_blank"  :label="displayId" color="white" icon="open_in_new" />
        <q-btn outline  :color="color"  :size="size" color="white" icon="content_copy" @click="copy" />
    </q-btn-group> 

</template>
<script>
import { copyToClipboard } from 'quasar';

export default {
    name: 'SuiObjectLink',
    components:{
        // DateHuman,
    },
    props: {
        id: String,
        size: {
            type: String,
            default: 'sm',
        },
        color: {
            type: String,
            default: 'primary',
        },
        type: {
            type: String,
            default: 'object',
        },
    },
    data() {
        return {
        }
    },
    watch: {
        connectionId: function() {
        },
    },
    methods: {
        async loadMore() {
        },
        copy() {
            copyToClipboard(this.id);
            this.$q.notify({
                    message: ''+this.id+' copied to clipboard',
                    color: 'positive',
                });
        }
    },
    computed: {
        url() {
            return this.$store.sui.urlToExplorer({
                id: this.id,
                type: this.type,
            });
        },
        displayId() {
			return (''+this.id).substr(0,6)+'...'+(''+this.id).substr(-4);
        },
    },
    unmounted: function() {
    },
    mounted: function(){
    }
}

    
</script>
<style lang="css">


</style>