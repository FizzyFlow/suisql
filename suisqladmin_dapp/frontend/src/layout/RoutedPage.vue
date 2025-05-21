<template>

	<div class="page_content_container">

		<router-view v-slot="{ Component }" ref="routerView">
			<transition name="fade" mode="out-in" appear >
				<component ref="view" :is="Component" v-if="isComponentVisible" />
			</transition>
		</router-view>


		<transition name="fade" mode="out-in" appear>
			<div class="cursor-pointer fixed-center" v-if="!isComponentVisible && contentViewEnabled">
				You don't have rights to view this page :(
			</div>
		</transition>

		<transition name="fade" mode="out-in" appear>
			<div class="cursor-pointer fixed-center" v-if="!isComponentVisible && !contentViewEnabled" @click="signIn">
				<div class="q-pa-xl relative-position">

					<q-inner-loading
						showing
						label="Sign In Required"
						label-class="text-primary"
						color="primary"
						size="50px"
					/>

				</div>
			</div>
		</transition>
	</div>

</template>

<script>
// import routes from './routes';

	// <div class="page_content">
export default {
	name: 'RoutedPage',
	data() {
		return {
			title: '',
			pageTitle: '',
			currentRoute: window.location.pathname,
			authRequired: false,

			requiredAuthLevel: null,
			isComponentVisible: false,
			contentViewEnabled: false,
		}
	},
	computed: {
	},
	components: {
	},
	watch:{
		'$route' (){
			// this.authRequired = false;

			const component = this.$route?.matched[0]?.components?.default;
			if (component) {

				this.authRequired = component.authRequired;
				this.requiredAuthLevel = component.requiredAuthLevel || null;
				this.pageTitle = component.title || '';
				this.checkAccess();
			}
		},
		// '$store.sessionUser.me' () {
		// 	this.checkAccess();
		// 	// this.checkIfCompnentVisible();
		// },
	},
	mounted() {
		this.title = this.$q.config.brand.title;
		// window.q = this.$q;,
		//
		// this.$store.sessionUser.$onAction(({name}) => {
		// 	if (name == 'signInHidden' && this.authRequired && !this.$store.sessionUser.me) {
		// 		this.$store.sessionUser.doSignIn();
		// 	}
		// 	if (name == 'doLogOut' && this.authRequired) {
		// 		this.$store.sessionUser.doSignIn();
		// 	}
		// });
	},
	methods: {
		checkAccess: function() {
			this.isComponentVisible = this.enoughAccessLevel();

			this.contentViewEnabled = (!this.authRequired || this.$store.sessionUser.me);

			const title = (this.pageTitle ? ('' + this.pageTitle + ' @ ') : '') + this.title;
			document.title = title;

			// if (this.authRequired) {
			// 	this.$store.sessionUser.requireAuth();
			// } else {
			// 	this.$store.sessionUser.dontRequireAuth();
			// }
		},
		enoughAccessLevel: function() {
			if (!this.authRequired) {
				return true;
			}
			// if (this.$store.sessionUser.me && !this.requiredAuthLevel) {
			// 	return true;
			// }
			// if (this.$store.sessionUser.me && this.$store.sessionUser.hasLevelOf(this.requiredAuthLevel)) {
			// 	return true;
			// }

			return false;
		},
		signIn() {
			// this.$store.sessionUser.doSignIn();
		},
	},
	beforeCreate() {
	}
}
</script>

<style scoped>


.page_content {
	position: relative;
}

.page_content .ps {
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	right: 0;
}

.page_content_container {
		position: relative;
}


.page_transition {
	position: relative;
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.05s ease;
}
/*
.fade-enter-to,
.fade-leave-e {
	opacity: 0;
}*/

.fade-enter-to,
.fade-leave-from {
	opacity: 0.7;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}



</style>