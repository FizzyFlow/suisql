<template>

	<q-btn flat @click="onClick">
		<q-icon :name="icon" size="sm" :title="title" />
	</q-btn>

</template>
<script>

const DarkChanger = {
	name: 'DarkChanger',
	props: {
	},
	components: {
	},
	data() {
		return {
		}
	},
	methods: {
		onClick: function() {
			this.$q.dark.toggle();
			this.$q.localStorage.set('isInDarkMode', this.$q.dark.isActive);
		},
	},
	computed: {
		icon: function() {
			if (this.$q.dark.mode) {
				return 'light_mode';
			} else {
				return 'dark_mode';
			}
		},
		title: function() {
			if (this.$q.dark.mode) {
				return 'Switch to Light Mode';
			} else {
				return 'Switch to Dark Mode';
			}
		},
	},
	beforeMount: function() {
		const storageSet = this.$q.localStorage.getItem('isInDarkMode');
		if (storageSet === false || storageSet === true) {
			this.$q.dark.set(storageSet);
		}
	},
};


export default DarkChanger;
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>