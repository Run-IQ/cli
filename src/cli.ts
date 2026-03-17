import { createRequire } from 'node:module';
import { Command } from 'commander';
import { registerEvaluateCommand } from './commands/evaluate.js';
import { registerValidateCommand } from './commands/validate.js';
import type { Writer } from './utils/loader.js';

function readPackageVersion(): string {
  const require = createRequire(import.meta.url);
  const pkg = require('../package.json') as { version: string };
  return pkg.version;
}

export function createCli(writer: Writer): Command {
  const program = new Command();

  program
    .name('run-iq')
    .description('CLI for the Parametric Policy Engine (PPE)')
    .version(readPackageVersion());

  registerEvaluateCommand(program, writer);
  registerValidateCommand(program, writer);

  return program;
}
