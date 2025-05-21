<template>
	<q-layout view="hHh lpR fFf">
		<Header @menu="onMenu" />

		<q-page-container>
			<q-page padding>
				<RoutedPage />
			</q-page>
		</q-page-container>

		<Footer />
	</q-layout>
</template>

<script>
import Header from './Header.vue';
import Footer from './Footer.vue';
import RoutedPage from './RoutedPage.vue';

export default {
	name: 'LayoutDefault',

	components: {
		RoutedPage,
		Header,
		Footer,
	},

	methods: {
		onMenu: function() {
			this.$refs.sidebar.showMenu();
		},
	},
}
</script>
