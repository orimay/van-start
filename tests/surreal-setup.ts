import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initSync } from '@surrealdb/wasm-native';

// Node cannot fetch the engine's wasm by URL; hand it the bytes once.
const wasm = resolve(process.cwd(), 'node_modules/@surrealdb/wasm-native/dist/index_bg.wasm');
initSync({ module: readFileSync(wasm) });
