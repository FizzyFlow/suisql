import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import './styles/common.css';

import App from './App.vue'
import routes from './pages/';
import store from 'shared/stores/';
import { createPinia } from 'pinia';

import { Quasar } from 'quasar';
import settings from './settings/settings';

const router = createRouter({
	history: createWebHistory(settings.quasar?.config?.basePath),
	routes: routes,
});

const app = createApp(App).use(Quasar, settings.quasar);
app.use(createPinia());
app.use(router);

app.config.globalProperties.$store = store();

app.mount('#app');

try {
	document.querySelector('.preloader').classList.add('ready');
} catch(e) {
	console.error(e);
}