<template>

    <q-avatar>
        <q-icon color="primary" name="toll" v-if="!iconURL || imageFailed" />
        <img :src="iconURL" v-if="iconURL && !imageFailed" @error="imageError" style="width: 100%;" />
    </q-avatar>

</template>
<script>
/**
 * @typedef {import("suidouble").SuiCoin} SuiCoin
 */

export default {
    name: 'CoinIcon',
    components:{
    },
    props: {
        /** @type {SuiCoin} */
        suiCoin: Object,
    },
    watch: {
        suiCoin() {
            this.imageFailed = false;
        }
    },
    data() {
        return {
            imageFailed: false,
        }
    },
    computed: {
        iconURL() {
            let iconUrl = this.suiCoin?.metadata?.iconUrl;
            if (!iconUrl) {
                if (this.suiCoin && this.suiCoin.isSUI && this.suiCoin.isSUI()) {
                    return 'https://imagedelivery.net/cBNDGgkrsEA-b_ixIp9SkQ/sui-coin.svg/public';
                }

                return null;
            }
            return iconUrl;
        },
    },
    methods: {
        imageError() {
            this.imageFailed = true;
        },
    },
}

    
</script>
<style lang="css">


</style>