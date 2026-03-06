import type { Command } from 'commander';
import { PPEEngine } from '@run-iq/core';
import { loadRules, loadInput } from '../utils/loader.js';
import { formatResult } from '../utils/formatter.js';
import type { OutputFormat } from '../utils/formatter.js';
import type { Writer } from '../utils/loader.js';

export function registerEvaluateCommand(program: Command, writer: Writer): void {
  program
    .command('evaluate')
    .description('Evaluate rules against input data')
    .requiredOption('--rules <path>', 'Path to rules JSON file')
    .requiredOption('--input <path>', 'Path to input JSON file')
    .option('--format <format>', 'Output format: json, table, compact', 'table')
    .option('--dry-run', 'Run without snapshot persistence', true)
    .option('--strict', 'Enable strict mode', false)
    .action(
      async (options: {
        rules: string;
        input: string;
        format: string;
        dryRun: boolean;
        strict: boolean;
      }) => {
        try {
          const rules = await loadRules(options.rules);
          const input = await loadInput(options.input);

          const engine = new PPEEngine({
            plugins: [],
            dsls: [],
            strict: options.strict,
            dryRun: options.dryRun,
          });

          const result = await engine.evaluate(rules, input);
          const output = formatResult(result, options.format as OutputFormat);
          writer.stdout(output);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          writer.stderr(`Error: ${message}`);
          process.exitCode = isFileError(error) ? 2 : 1;
        }
      },
    );
}

function isFileError(error: unknown): boolean {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code === 'ENOENT' || code === 'EACCES' || error.message.includes('JSON');
  }
  return false;
}
