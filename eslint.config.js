import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const sharedTypeScriptRules = {
  'no-undef': 'off',
  'prefer-const': 'warn',
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  '@typescript-eslint/ban-ts-comment': 'warn',
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-empty-object-type': 'off',
  'import/no-unresolved': 'error',
  'import/extensions': [
    'error',
    'ignorePackages',
    {
      js: 'never',
      ts: 'never',
      vue: 'never',
    },
  ],
}

const importResolverSettings = {
  'import/resolver': {
    typescript: {
      alwaysTryTypes: true,
      project: [
        './.nuxt/tsconfig.app.json',
        './.nuxt/tsconfig.shared.json',
        './.nuxt/tsconfig.server.json',
        './.nuxt/tsconfig.node.json',
      ],
    },
  },
}

export default tseslint.config(
  {
    ignores: [
      'node_modules',
      '.nuxt',
      '.output',
      'dist',
      'coverage',
      'storybook-static',
      '.turbo',
      '.cache',
      '.idea',
      '.vscode',
      'public/**/*.js',
    ],
  },
  {
    files: ['app/**/*.{js,ts,mjs,cjs}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2024,
      },
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
    },
    settings: importResolverSettings,
    rules: sharedTypeScriptRules,
  },
  {
    files: ['composables/**/*.{js,ts,mjs,cjs}', 'lib/**/*.{js,ts,mjs,cjs}', 'types/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024,
      },
      parser: tseslint.parser,
    },
    plugins: {
      import: importPlugin,
    },
    settings: importResolverSettings,
    rules: sharedTypeScriptRules,
  },
  {
    files: ['app/**/*.vue'],
    extends: [...vuePlugin.configs['flat/recommended'], ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2024,
        defineProps: 'readonly',
        defineEmits: 'readonly',
        defineExpose: 'readonly',
        defineSlots: 'readonly',
        withDefaults: 'readonly',
        definePageMeta: 'readonly',
        defineNuxtComponent: 'readonly',
        defineNuxtPlugin: 'readonly',
        defineNuxtRouteMiddleware: 'readonly',
        defineAppConfig: 'readonly',
        updateAppConfig: 'readonly',
      },
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      import: importPlugin,
    },
    settings: importResolverSettings,
    rules: {
      ...sharedTypeScriptRules,
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: [
      'server/**/*.{js,ts,mjs,cjs,d.ts}',
      'modules/**/*.{js,ts,mjs,cjs,d.ts}',
      'scripts/**/*.{js,ts,mjs,cjs,d.ts}',
      'types/**/*.d.ts',
      'nuxt.config.{js,ts,mjs,cjs}',
    ],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2024,
        defineNuxtConfig: 'readonly',
      },
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
    },
    settings: importResolverSettings,
    rules: sharedTypeScriptRules,
  },
  {
    files: ['eslint.config.js', 'stylelint.config.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2024,
      },
    },
  },
  eslintConfigPrettier,
)
