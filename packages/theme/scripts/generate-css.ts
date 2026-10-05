import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateTokensCss } from '../src/generate';

const target = fileURLToPath(new URL('../src/tokens.generated.css', import.meta.url));
writeFileSync(target, generateTokensCss());
console.log('Wrote', target);
