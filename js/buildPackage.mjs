// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { execSync } from 'child_process';
import { existsSync, promises as fs } from 'fs';
import * as path from 'path';
import { build } from 'esbuild';

// import { esbuildPluginFilePathExtensions } from 'esbuild-plugin-file-path-extensions';

const ignorePatterns = [/\.test.ts$/, /\.graphql$/];

export async function buildPackage(buildOptions) {
    const allFiles = await findAllFiles(path.join(process.cwd(), 'src'));
    const packageJson = await readPackageJson();
    await clean();
    await buildCJS(allFiles, packageJson, buildOptions);
    await buildESM(allFiles, packageJson, buildOptions);
    await buildImportDirectories(packageJson);
}

async function findAllFiles(dir, files) {
    if (!files) {
        files = [];
    }

    const dirFiles = await fs.readdir(dir);
    for (const file of dirFiles) {
        const filePath = path.join(dir, file);
        const fileStat = await fs.stat(filePath);
        if (fileStat.isDirectory()) {
            await findAllFiles(filePath, files);
        } else if (!ignorePatterns.some((pattern) => pattern.test(filePath))) {
            files.push(filePath);
        }
    }
    return files;
}

async function clean() {
    await createEmptyDir(path.join(process.cwd(), 'dist'));
}

async function buildCJS(
    entryPoints,
    { sideEffects },
    buildOptions,
) {
    await build({
        format: 'cjs',
        logLevel: 'error',
        target: 'es2020',
        entryPoints,
        outdir: 'dist/cjs',
        sourcemap: true,
        outbase: 'src',
        // bundle: true,
        // plugins: [esbuildPluginFilePathExtensions({ cjsExtension: 'js' })],
        // platform: 'node',

        ...buildOptions,
    });
    await buildTypes('tsconfig.cjs.json');

    const pkg = {
        private: true,
        type: 'commonjs',
    };

    if (sideEffects === false) {
        pkg.sideEffects = false;
    }

    await fs.writeFile(
        path.join(process.cwd(), 'dist/cjs/package.json'),
        JSON.stringify(pkg, null, 2),
    );
}

async function buildESM(
    entryPoints,
    { sideEffects },
    buildOptions,
) {
    await build({
        format: 'esm',
        logLevel: 'error',
        target: 'es2020',
        entryPoints,
        outdir: 'dist/esm',
        outbase: 'src',
        sourcemap: true,
        // bundle: true,
        // plugins: [esbuildPluginFilePathExtensions({ esmExtension: 'js' })],
        // platform: 'node',

        ...buildOptions,
    });
    await buildTypes('tsconfig.esm.json');

    const pkg = {
        private: true,
        type: 'module',
    };

    if (sideEffects === false) {
        pkg.sideEffects = false;
    }

    await fs.writeFile(
        path.join(process.cwd(), 'dist/esm/package.json'),
        JSON.stringify(pkg, null, 2),
    );
}

async function buildTypes(config) {
    execSync(`pnpm tsc --build ${config}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
    });
}

async function buildImportDirectories({ exports, sideEffects }) {
    if (!exports) {
        return;
    }

    const exportDirs = new Set();
    const ignoredWorkspaces = [];

    for (const [exportName, exportMap] of Object.entries(exports)) {
        if (typeof exportMap !== 'object' || !exportName.match(/^\.\/[\w\-_/]+/)) {
            continue;
        }

        const exportDir = path.join(process.cwd(), exportName);
        const parts = exportName.split('/');
        exportDirs.add(parts[1]);

        if (parts.length >= 2 && !exportDir.endsWith('.css')) {
            ignoredWorkspaces.push(path.relative(path.resolve(process.cwd(), '../..'), exportDir));
        }

        await createEmptyDir(exportDir);

        const pkg = {
            private: true,
            types:
                exportMap.types && path.relative(exportDir, path.resolve(process.cwd(), exportMap.types)),
            import:
                exportMap.import && path.relative(exportDir, path.resolve(process.cwd(), exportMap.import)),
            main: path.relative(
                exportDir,
                path.resolve(process.cwd(), exportMap.require ?? exportMap.default),
            ),
        };

        if (sideEffects === false) {
            pkg.sideEffects = false;
        }

        await fs.writeFile(
            path.join(exportDir, 'package.json'),
            `${JSON.stringify(pkg, null, '\t')}\n`,
        );
    }

    await addPackageFiles([...exportDirs]);
}

async function createEmptyDir(path) {
    if (existsSync(path)) {
        await fs.rm(path, { recursive: true, force: true, maxRetries: 5 });
    }

    await fs.mkdir(path, { recursive: true });
}

async function readPackageJson() {
    return JSON.parse(
        await fs.readFile(path.join(process.cwd(), 'package.json'), 'utf-8'),
    );
}

async function addPackageFiles(paths) {
    const json = await readPackageJson();

    if (!json.files) {
        return;
    }

    for (const path of paths) {
        if (!json.files.includes(path)) {
            json.files.push(path);
        }
    }

    json.files.sort();

    await fs.writeFile(
        path.join(process.cwd(), 'package.json'),
        `${JSON.stringify(json, null, '\t')}\n`,
    );
}


buildPackage().
    then(() => {
        console.log('Build complete');
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });