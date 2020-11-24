import dts from 'rollup-plugin-dts'
import esbuild from '@cush/rollup-plugin-esbuild' // https://github.com/egoist/rollup-plugin-esbuild/pull/138

const name = require('./package.json').main.replace(/\.js$/, '')
const ext = (format) => (format == 'dts' ? 'd.ts' : format == 'cjs' ? 'js' : 'mjs')
const bundle = (format) => ({
    input: 'src/index.ts',
    output: {
        file: `${name}.${ext(format)}`,
        format: format == 'cjs' ? 'cjs' : 'es',
        sourcemap: format != 'dts',
    },

    plugins: format == 'dts' ? [dts()] : [esbuild()],
    external: (id) => !/^[./]/.test(id),
    onwarn(warning, rollupWarn) {
        if (warning.code !== 'CIRCULAR_DEPENDENCY') {
            rollupWarn(warning)
        }
    },
})

export default [bundle('es'), bundle('cjs'), bundle('dts')]
