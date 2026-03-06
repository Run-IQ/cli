import { Command } from 'commander';
import { registerEvaluateCommand } from './commands/evaluate.js';
import { registerValidateCommand } from './commands/validate.js';
import type { Writer } from './utils/loader.js';

export function createCli(writer: Writer): Command {
  const program = new Command();

  program.name('run-iq').description('CLI for the Parametric Policy Engine (PPE)').version('0.1.0');

  registerEvaluateCommand(program, writer);
  registerValidateCommand(program, writer);

  return program;
}
