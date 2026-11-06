import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Each context file exports its hook (and the session its initial state) beside its provider.
      // Editing one reloads the page rather than hot-swapping it, which is the trade for keeping them together.
      'react-refresh/only-export-components': [
        'error',
        {
          allowConstantExport: true,
          allowExportNames: ['useMatchSession', 'useStyleConfig', 'createInitialMatchSessionState'],
        },
      ],
    },
  },
])
