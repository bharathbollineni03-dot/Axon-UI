/** Marks top-level React calls in a package's ESM output as pure; resolves to how many it marked. */
export function annotatePure(distDir: string): Promise<number>;
