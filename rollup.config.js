import fs from 'fs'
import dts from 'rollup-plugin-dts'
import ts from '@wessberg/rollup-plugin-ts'

import pkg from './package.json'

const license = fs.readFileSync('LICENSE').toString('utf-8').trim()
const banner = `
/**
 * EOSIO Core v${pkg.version}
 * https://github.com/greymass/eosio-core
 *
 * @license
 * ${license.replace(/\n/g, '\n * ')}
 */
`.trim()

const external = Object.keys(pkg.dependencies)

export default [
    {
        input: 'src/index.ts',
        output: {banner, file: pkg.main, format: 'cjs', sourcemap: true},
        plugins: [
            ts({
                tsconfig: (conf) => ({
                    ...conf,
                    declaration: false,
                    target: 'es6',
                    module: 'commonjs',
                }),
            }),
        ],
        external,
        onwarn,
    },
    {
        input: 'src/index.ts',
        output: {banner, file: pkg.module, format: 'esm', sourcemap: true},
        plugins: [
            ts({
                tsconfig: (conf) => ({
                    ...conf,
                    declaration: false,
                    target: 'esnext',
                    module: 'esnext',
                }),
            }),
        ],
        external,
        onwarn,
    },
    {
        input: 'src/index.ts',
        output: {banner, file: pkg.types, format: 'esm'},
        onwarn,
        plugins: [dts()],
    },
]

function onwarn(warning, rollupWarn) {
    if (warning.code !== 'CIRCULAR_DEPENDENCY') {
        rollupWarn(warning)
    }
}
