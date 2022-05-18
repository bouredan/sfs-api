import {defineConfig} from 'rollup';
import typescript from '@rollup/plugin-typescript';
import commonjs from "@rollup/plugin-commonjs";

import pkg from './package.json';

const dependencies = Object.keys(require('./package.json').dependencies)

export default defineConfig ([
  // CommonJS
  {
    input: 'src/index.ts',
    plugins: [
      typescript(), // so Rollup can convert TypeScript to JavaScript
      commonjs(),
    ],
    external: dependencies,
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ]
  }
]);