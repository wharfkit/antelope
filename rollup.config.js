import dts from 'rollup-plugin-dts'
import esbuild from '@cush/rollup-plugin-esbuild' // https://github.com/egoist/rollup-plugin-esbuild/pull/138
import fs from 'fs'

const license = fs.readFileSync('LICENSE').toString('utf-8')

const banner = `
/**
 * EOSIO Core by Greymass
 * Library for working with EOSIO blockchains in JavaScript environments
 * https://github.com/greymass/eosio-core
 *
 * @license
 * ${license.replace(/\n/g, '\n * ')}
 */
`.trim()

const name = require('./package.json').main.replace(/\.js$/, '')
const ext = (format) => (format == 'dts' ? 'd.ts' : format == 'cjs' ? 'js' : 'mjs')
const bundle = (format) => ({
    input: 'src/index.ts',
    output: {
        file: `${name}.${ext(format)}`,
        format: format == 'cjs' ? 'cjs' : 'es',
        sourcemap: format != 'dts',
        banner,
    },
    plugins:
        format == 'dts'
            ? [dts()]
            : [
                  esbuild({
                      target: format == 'cjs' ? 'es2015' : 'esnext',
                  }),
              ],
    external: (id) => !/^[./]/.test(id),
    onwarn(warning, rollupWarn) {
        if (warning.code !== 'CIRCULAR_DEPENDENCY') {
            rollupWarn(warning)
        }
    },
})

export default [bundle('es'), bundle('cjs'), bundle('dts')]
