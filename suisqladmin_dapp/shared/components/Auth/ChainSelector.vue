<template>

    <div>
        <q-btn stretch flat label="connect" @click="request()" v-if="!displayAddress && defaultChain" />
        <q-btn-dropdown stretch flat :label="selectedLabel">
            <q-list>
                <q-item @click="selectChain(availableChain)" clickable v-close-popup tabindex="1" v-for="availableChain in availableChains" :key="availableChain">
                    <q-item-section>
                        <q-item-label>{{availableChain}}</q-item-label>
                    </q-item-section>
                </q-item>
                <q-separator/>
                <q-item @click="doLogout" clickable v-close-popup tabindex="999">
                    <q-item-section>
                        <q-item-label>Disconnect</q-item-label>
                    </q-item-section>
                </q-item>
            </q-list>

        </q-btn-dropdown>
        <SignInWithSui v-if="defaultChain" @disconnected="onDisconnected" :persist="true" @displayAddress="onDisplayAddress" :defaultChain="defaultChain" @wrongchain="onWrongChain" @suiMaster="onSuiMaster" ref="sui" :visible="false" />
    </div>

</template>
<script>
import { SignInWithSui } from 'vue-sui';

export default {
	name: 'ChainSelector',
    components:{
        SignInWithSui,
    },
	props: {
	},
	data() {
		return {
            defaultChain: '',
            availableChains: ['sui:mainnet', 'sui:testnet', 'sui:devnet'],
            selectedLabel: '...',
            
            displayAddress: '',
            connectedChain: '',
		}
	},
	watch: {
        connectionId: function() {
            const connectedChain = this.$store.sui.connectedChain;
        },
	},
	methods: {
        async doLogout() {
            await this.$refs.sui.disconnect();
        },
        onDisplayAddress(displayAddress) {
            this.displayAddress = displayAddress;
            this.selectedLabel = (this.displayAddress ? (''+this.displayAddress+' at ') : '')+(''+this.connectedChain).split('sui:').join('');
        },
        onWrongChain(wrongChainName) {
            this.$q.notify({
                progress: true,
                color: "warning",
                multiLine: true,
                textColor: "dark",
                message: 'Different chain is selected in wallet extension settings: '+wrongChainName+' You may switch it in extension, but for now we are redirecting you to it.',
                // color: 'primary',
            });

            setTimeout(()=>{
                this.$q.localStorage.set('preferredChain', wrongChainName);
                location.reload();
            }, 2000);
        },
        selectChain(chain) {
            this.$q.localStorage.set('preferredChain', chain);            
            this.selectedLabel = chain;
            location.reload();
        },
        pickTheChain() {
            const asInStorage = this.$q.localStorage.getItem('preferredChain');
            if (asInStorage) {
                this.defaultChain = asInStorage;
            } else {
                this.defaultChain = 'sui:mainnet';
            }
        },
        onDisconnected() {
            window.location.reload();
        },  
        onSuiMaster(suiMaster) {
            this.$store.sui.setSuiMaster(suiMaster);
            this.connectedChain = suiMaster.connectedChain;
        },
        async request() {
            await this.$refs.sui.connect();
        }
	},
	computed: {
        connectionId: function() {
            return this.$store.sui.connectionId;
        },
	},
	unmounted: function() {
	},
	mounted: function(){
        if ((''+location.host).indexOf('localhost') != -1) {
            this.availableChains.push('sui:localnet');
        }

        this.$store.sui.$onAction((params)=>{
            if (params.name == 'request') {
                this.request();
            }
        });
        
        setTimeout(()=>{
            this.pickTheChain();
        }, 500);
	}
}
</script>
<style lang="css">



</style>