<template>

	<q-item
		:disable="item.disabled"
		clickable
		v-ripple
		:to="(!item.subItems || !item.subItems.length) ? (item.name ? {name: item.name} : item.path) : null"
		class="row menuItem"
		@click="onClick"
		>
		<!-- :to="menuItem.path" -->
		<q-item-section avatar><q-icon :name="item.icon" /></q-item-section>
		<q-item-section class="row">{{ item.title }}</q-item-section>

		<q-item-section side v-if="item.subItems && item.subItems.length">
			<q-icon :name="subMenuVisible ? 'keyboard_arrow_up' : 'keyboard_arrow_down'" />
		</q-item-section>

	</q-item>

	<q-slide-transition v-if="item.subItems && item.subItems.length">
		<div v-show="subMenuVisible" ref="subItemsDiv" class="menuSubSlider">
			<template v-for="(item, index) in item.subItems" v-bind:key="index">
				<MenuItem :item="item" />
			</template>
			<q-separator />
			<q-separator />
		</div>
	</q-slide-transition>


</template>
<script>

const MenuItem = {
	name: 'MenuItem',
	props: {
		item: Object
	},
	components: {
		// MenuItem,
	},
	data() {
		return {
			subMenuVisible: false,
		}
	},
	methods: {
		onClick: function() {
			this.subMenuVisible = !this.subMenuVisible;
		},
	},
	computed: {
	},
	mounted: function() {
		setTimeout(()=>{
			if (this.$refs.subItemsDiv && this.$refs.subItemsDiv.querySelector('.q-router-link--active')) {
				this.subMenuVisible = true;
			}
		}, 200);
	},
};


export default MenuItem;
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>