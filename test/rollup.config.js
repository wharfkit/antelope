/* eslint-disable no-undef */

import fs from 'fs'
import path from 'path'

import terser from '@rollup/plugin-terser'
import alias from '@rollup/plugin-alias'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import replace from '@rollup/plugin-replace'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import virtual from '@rollup/plugin-virtual'

const mockData = Object.fromEntries(
    fs
        .readdirSync(path.join(__dirname, 'data'))
        .map((f) => path.join(__dirname, 'data', f))
        .map((f) => [path.basename(f), JSON.parse(fs.readFileSync(f))])
)

const testFiles = fs
    .readdirSync(__dirname)
    .filter((f) => f.match(/\.ts$/))
    .map((f) => path.join(__dirname, f))
    .sort()

const template = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Tests</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="https://unpkg.com/mocha/mocha.css" />
  </head>
  <body>
    <div id="mocha"></div>
    <script src="https://unpkg.com/chai/chai.js"></script>
    <script src="https://unpkg.com/mocha/mocha.js"></script>
    <script class="mocha-init">
      mocha.setup('tdd');
      mocha.checkLeaks();
    </script>
    <script>%%tests%%</script>
    <script class="mocha-exec">
      mocha.run();
    </script>
  </body>
</html>
`

function inline() {
    return {
        name: 'Inliner',
        generateBundle(opts, bundle) {
            const file = path.basename(opts.file)
            const output = bundle[file]
            delete bundle[file]
            const code = `${output.code}`
            this.emitFile({
                type: 'asset',
                fileName: file,
                source: template.replace('%%tests%%', code),
            })
        },
    }
}

/** @type {import('rollup').RollupOptions} */
export default [
    {
        input: 'tests.ts',
        output: {
            file: 'test/browser.html',
            format: 'iife',
            sourcemap: true,
            globals: {
                chai: 'chai',
                mocha: 'mocha',
                util: 'undefined',
                crypto: 'undefined',
            },
        },
        external: ['chai', 'mocha', 'crypto', 'util'],
        plugins: [
            virtual({
                'tests.ts': testFiles.map((f) => `import '${f.slice(0, -3)}'`).join('\n'),
            }),
            alias({
                entries: [
                    {find: '$lib', replacement: path.join(__dirname, '..', 'lib/eosio-core.m.js')},
                    {find: './utils/mock-provider', replacement: './utils/browser-provider.ts'},
                ],
            }),
            typescript({target: 'es6', module: 'esnext', tsconfig: './test/tsconfig.json'}),
            replace({'global.MOCK_DATA': JSON.stringify(mockData), preventAssignment: true}),
            resolve({browser: true}),
            commonjs(),
            json(),
            terser({
                mangle: false,
                format: {
                    beautify: true,
                },
                compress: false,
            }),
            inline(),
        ],
    },
]
