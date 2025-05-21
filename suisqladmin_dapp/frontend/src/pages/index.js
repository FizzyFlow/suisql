const files = import.meta.glob('./*.vue', { eager: true });

const modules = {};

for (const key in files) {
	modules[key.replace(/(\.\/|\.vue)/g, '')] = files[key];
}

const routes = [];
for (let key in modules) {
	console.log(modules[key]);

	routes.push({
		path: modules[key].default.path,
		component: modules[key].default,
		meta: {
			authRequired: modules[key].default.authRequired,
			requiredAuthLevel: modules[key].default.requiredAuthLevel,
		},
	});
}

export default routes;