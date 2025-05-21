<template>

	<q-chip size="20px" class="non-selectable cursor-pointer text-capitalize" square clickable @click="onClick">
		<q-avatar size="38px" icon="grid_view" font-size="38px"></q-avatar>
		<span class="gt-xs">{{ title }}</span>
	</q-chip>

</template>

<script>
export default {
	name: 'Logo',
	components: {
	},
	data() {
		return {
			title: '',
		}
	},
	methods: {
		onClick: function() {
			this.$router.push('/');
		},
	},
	mounted() {
		this.title = this.$q.config.brand.title;
		// window.q = this.$q;
	},
	computed: {
	}
}
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
	.q-chip {
		margin-left: -6px;
		background-color: transparent;
		color: var(--on-brand-text-color);
		text-transform: lowercase;
	}
	.body--dark .q-chip {
		color: var(--on-brand-text-color);
	}
	.q-chip span {
		margin-left: 8px;
	}
	@media (max-width: 1024px) {
		.q-chip span {
			margin-left: 0px;
		}
		.q-chip {
			margin-left: 0px;
		}
	}
/*	.q-avatar {
		background-image: url('../assets/logo.png');
		background-repeat: no-repeat;
		background-size: contain;
		background-position: left center;
		border-radius: 50%;
	}

	.q-chip .q-avatar {
		border-radius: 50%;
	}*/
</style>