import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'
import esx from 'eslint-plugin-es-x'

export default tseslint.config(
    {
        ignores: ['lib/*', 'node_modules/**'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    eslintPluginPrettier,
    {
        plugins: {
            'es-x': esx,
        },
        rules: {
            'prettier/prettier': 'warn',
            'no-console': 'warn',
            'sort-imports': ['warn', {ignoreCase: true, ignoreDeclarationSort: true}],
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/no-empty-function': 'warn',
            '@typescript-eslint/no-this-alias': 'off',
            'no-inner-declarations': 'off',
            'es-x/no-optional-chaining': 'error',
            'es-x/no-class-fields': 'off',
            'es-x/no-export-ns-from': 'off',
            'preserve-caught-error': 'off',
        },
    }
)
