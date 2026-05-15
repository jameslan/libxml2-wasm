/**
 * THIS FILE WAS AUTO-GENERATED.
 * PLEASE DO NOT EDIT IT MANUALLY.
 * ===============================
 * IF YOU COPY THIS INTO AN ESLINT CONFIG, REMOVE THIS COMMENT BLOCK.
 */

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import { configs, plugins, rules } from 'eslint-config-airbnb-extended';
import chaiFriendly from 'eslint-plugin-chai-friendly';

const jsConfig = defineConfig([
    // ESLint recommended config
    {
        name: 'js/config',
        ...js.configs.recommended,
    },
    // Stylistic plugin
    plugins.stylistic,
    // Import X plugin
    plugins.importX,
    // Airbnb base recommended config
    ...configs.base.recommended,
    // Strict import rules
    rules.base.importsStrict,
]);

const nodeConfig = defineConfig([
    // Node plugin
    plugins.node,
    // Airbnb Node recommended config
    ...configs.node.recommended,
]);

const typescriptConfig = defineConfig([
    // TypeScript ESLint plugin
    plugins.typescriptEslint,
    // Airbnb base TypeScript config
    ...configs.base.typescript,
    // Strict TypeScript rules
    rules.typescript.typescriptEslintStrict,
]);

export default defineConfig([
    // JavaScript config
    ...jsConfig,
    // Node config
    ...nodeConfig,
    // TypeScript config
    ...typescriptConfig,
    // Chai friendly plugin
    chaiFriendly.configs.recommendedFlat,
    // Custom overrides
    {
        rules: {
            '@stylistic/indent': ['error', 4],
            'no-underscore-dangle': 'off',
            'no-bitwise': ['error', { allow: ['<<', '&', '|=', '|'] }],
            'max-classes-per-file': 'off',
            'n/no-sync': 'off',
            '@typescript-eslint/no-use-before-define': 'off',
            'eol-last': ['error', 'always'],
            'import-x/prefer-default-export': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'import-x/no-cycle': 'warn',
            '@typescript-eslint/unified-signatures': 'off',
            // We use empty inherited interface and decorator to merge implementation of mixin
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-unsafe-declaration-merging': 'off',
        },
    },
    {
        files: ['test/**'],
        rules: {
            '@typescript-eslint/no-non-null-assertion': 'off',
        },
    },
]);
