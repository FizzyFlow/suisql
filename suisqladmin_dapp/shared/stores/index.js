
// import { useSessionUserStore } from './sessionUser.js';
// import { useApiStore } from './api.js';
import { useColorStore } from './color.js';
import { useSuiStore } from './sui.js';

export default () => {
	return {
		color: useColorStore(),
		sui: useSuiStore(),
		// sessionUser: useSessionUserStore(),
		// settings: useSettingsStore(),
	}
};