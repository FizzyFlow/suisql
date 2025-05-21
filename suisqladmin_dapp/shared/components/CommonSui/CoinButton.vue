<template>

    <q-btn :size="size" @click="$emit('click')">
        <CoinIcon :size="size" :suiCoin="normalizedSuiCoin" v-if="normalizedSuiCoin" />
        &nbsp;{{ symbol }}
    </q-btn>

</template>
<script>
/**
 * @typedef {import("suidouble").SuiCoin} SuiCoin
 */
import CoinIcon from "./CoinIcon.vue";

export default {
    name: 'CoinButton',
    emits: ['click'],
    components: {
        CoinIcon,
    },
    props: {
        suiCoin: {
            type: [Object, String],
            default() {
                return '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI';
            },
        },
        size: {
            type: String,
            default: 'sm',
        },       
    },
    watch: {
    },
    data() {
        return {
            normalizedSuiCoin: null,
        }
    },
    computed: {
        symbol() {
            if (this.normalizedSuiCoin && this.normalizedSuiCoin.symbol) {
                return this.normalizedSuiCoin.symbol;
            }
            if (typeof this.suiCoin === 'string' && this.suiCoin.indexOf('::') !== -1) {
                return this.suiCoin.split('::').pop();
            }
        },
    },
    methods: {
        async normalize() {
            if (!this.normalizedSuiCoin && (typeof this.suiCoin === 'string' && this.suiCoin.indexOf('::') !== -1)) {
                const suiMaster = this.$store.sui.suiMaster;
                this.normalizedSuiCoin = suiMaster.suiCoins.get(this.suiCoin);
            }
            if (this.normalizedSuiCoin && this.normalizedSuiCoin.symbol) {
                // already ok
                return this.normalizedSuiCoin;
            }
            await this.normalizedSuiCoin.getMetadata();
            return this.normalizedSuiCoin;
        }
    },
    mounted() {
        this.normalize();
    },
}

    
</script>
<style lang="css">


</style>