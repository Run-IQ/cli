import type { Command } from 'commander';
import type { PPEPlugin, DSLEvaluator } from '@run-iq/core';
import { PPEEngine } from '@run-iq/core';
import { loadRules, loadInput, loadModule } from '../utils/loader.js';
import { formatResult, isOutputFormat } from '../utils/formatter.js';
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
    .option(
      '--plugin <paths...>',
      'Paths to plugin/DSL modules (must export a plugin or dsl instance as default)',
    )
    .action(
      async (options: {
        rules: string;
        input: string;
        format: string;
        dryRun: boolean;
        strict: boolean;
        plugin?: string[];
      }) => {
        try {
          const rules = await loadRules(options.rules);
          const input = await loadInput(options.input);

          const plugins: PPEPlugin[] = [];
          const dsls: DSLEvaluator[] = [];

          if (options.plugin) {
            for (const modulePath of options.plugin) {
              const loaded = await loadModule(modulePath);
              if (isPlugin(loaded)) {
                plugins.push(loaded);
              } else if (isDSLEvaluator(loaded)) {
                dsls.push(loaded);
              } else {
                writer.stderr(
                  `Warning: module at ${modulePath} does not export a valid plugin or DSL evaluator`,
                );
              }
            }
          }

          const engine = new PPEEngine({
            plugins,
            dsls,
            strict: options.strict,
            dryRun: options.dryRun,
          });

          const result = await engine.evaluate(rules, input);
          const format: OutputFormat = isOutputFormat(options.format) ? options.format : 'table';
          const output = formatResult(result, format);
          writer.stdout(output);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          writer.stderr(`Error: ${message}`);
          process.exitCode = isFileError(error) ? 2 : 1;
        }
      },
    );
}

function isPlugin(value: unknown): value is PPEPlugin {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj['name'] === 'string' && typeof obj['onInit'] === 'function';
}

function isDSLEvaluator(value: unknown): value is DSLEvaluator {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj['dsl'] === 'string' && typeof obj['evaluate'] === 'function';
}

function isFileError(error: unknown): boolean {
  if (error instanceof Error) {
    const errno = error as { code?: string };
    return errno.code === 'ENOENT' || errno.code === 'EACCES' || error.message.includes('JSON');
  }
  return false;
}
