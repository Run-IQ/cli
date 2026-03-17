export { createCli } from './cli.js';
export type { Writer } from './utils/loader.js';
export type { OutputFormat, ValidationEntry } from './utils/formatter.js';
export { formatResult, formatValidation, isOutputFormat } from './utils/formatter.js';
export { loadRules, loadInput, loadModule } from './utils/loader.js';

import { createCli } from './cli.js';

export function run(argv: string[]): void {
  const writer = {
    // eslint-disable-next-line no-console
    stdout: (msg: string) => console.log(msg),
    // eslint-disable-next-line no-console
    stderr: (msg: string) => console.error(msg),
  };
  const cli = createCli(writer);
  cli.parseAsync(argv).catch((err: unknown) => {
    // eslint-disable-next-line no-console
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
