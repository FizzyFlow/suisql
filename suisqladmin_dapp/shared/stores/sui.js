import { defineStore } from 'pinia';
import Log from 'shared/classes/Log.js';

export const useSuiStore = defineStore('sui', {
	// convert to a function
	state: () => ({
		address: null,
        connectedChain: null,
        suiMaster: null,
	}),
	getters: {
		connectionId: function(){ // using this to watch
			return ''+this.address+'_'+this.connectedChain;
		},
	},
	actions: {
		urlToExplorer(params = {}) {
			const id = params.id;
			const type = params.type || 'object';

			let chainString = 'mainnet';
			if (this.connectedChain) {
				chainString = (''+this.connectedChain).split('sui:').join('');
			}

			if (type == 'account') {
				if (chainString == 'localnet') {
					return 'https://explorer.polymedia.app/address/'+id+'?network=local';
				} else  if (chainString == 'testnet') {
					return 'https://testnet.suivision.xyz/account/'+id;
				} else if (chainString == 'devnet') {
					return 'https://devnet.suivision.xyz/account/'+id;
				} 
				return 'https://suivision.xyz/account/'+id;
			}
			
			if (chainString == 'localnet') {
				return 'https://explorer.polymedia.app/object/'+id+'?network=local'
			}
			if (type == 'coin') {
				return 'https://suivision.xyz/coin/'+id;
			}

			return 'https://suiscan.xyz/'+chainString+'/'+type+'/'+id;
		},
		async request() {
			Log.tag('$store.sui').info('sui connection requested');

			if (this.suiMaster && this.suiMaster.address) {
				return true;
			}

			if (!this.__requestConnectionPromise) {
				this.__requestConnectionPromiseResolver = null;
				this.__requestConnectionPromise = new Promise((res)=>{
					this.__requestConnectionPromiseResolver = res;
				});
			}

			await this.__requestConnectionPromise;
			this.__requestConnectionPromise = null;
			this.__requestConnectionPromiseResolver = null;

			return true;
		},
		setSuiMaster(suiMaster) {
			clearTimeout(this.__setSuiMasterTimeout);

			let thisTimeoutMs = 800;
			if (suiMaster.address) {
				thisTimeoutMs = 100;
			}

			this.__setSuiMasterTimeout = setTimeout(()=>{
				this.suiMaster = suiMaster;
				if (suiMaster.address) {
					Log.tag('$store.sui').info('your address', suiMaster.address);
					this.address = suiMaster.address;
				} else {
					this.address = null;
				}
				if (suiMaster.connectedChain) {
					Log.tag('$store.sui').info('got suiMaster connected to ', suiMaster.connectedChain);
					this.connectedChain = suiMaster.connectedChain;
				} else {
					Log.tag('$store.sui').info('suiMaster unset');
					this.connectedChain = null;
				}
			}, thisTimeoutMs);
		},
		async amountToString(amount) {
			const suiCoin = this.suiMaster.suiCoins.get('sui');
			await suiCoin.getMetadata();
			return suiCoin.amountToString(amount);
		}
	},
});