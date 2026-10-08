import { createTsupConfig } from '../../tooling/tsup.base';

// The d3 modules are ESM-only. Bundling the few functions used (they are devDependencies) keeps the
// CommonJS build working for every consumer, instead of failing on `require('d3-scale')`.
export default createTsupConfig({ noExternal: [/^d3-/, 'internmap'] });
