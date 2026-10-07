import path from 'node:path';
import { createVitestConfig } from '../../tooling/vitest.base';

export default createVitestConfig({
  test: { setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')] },
});
