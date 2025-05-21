<template>
	<span>{{ human }}</span>
</template>
<script>

		// popup-content-class="bg-dark"
export default {
	name: 'DateHuman',
	props: {
		value: {
			type: [String, Object, Number],
			default: null,
		},
	},
	computed: {
		human() {
			let normalizedDate = null;
			if (this.value && this.value.getMonth) {
				// istance of Date
				normalizedDate = this.value;
			} else if (this.value) {
				normalizedDate = new Date(this.value);
			} else {
				normalizedDate = new Date();
			}

			let timezone = undefined;
			if (this.$store?.sessionUser?.profileSettings?.timezone) {
				timezone = this.$store?.sessionUser?.profileSettings?.timezone;
			}

			if (isNaN(normalizedDate)) {
				// invalid date
				return '';
			} else {
				// @todo: timeZone: 'UTC',
				return normalizedDate.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone  });
			}
		}
	},
	components: {
	},
	methods: {
	},
}
</script>
