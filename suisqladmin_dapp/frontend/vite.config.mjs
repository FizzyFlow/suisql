import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin';

// https://vitejs.dev/config/
export default defineConfig(async ({ command, mode }) => {
    console.log(command);
    console.log(mode);
    
    return {
            root: '',
            resolve: {
                alias: {
                    components: path.join(__dirname, 'src/components'),
                    forms: path.join(__dirname, 'src/forms'),
                    classes: path.join(__dirname, 'src/classes'),
                    shared: path.join(__dirname, '../shared'),
                },
            },
            plugins: [
                    vue({
                        template: { transformAssetUrls }
                    }),
                    quasar({}),
                ],
            optimizeDeps: {
                forece: true,
            },
        };
});