import type { Command } from 'commander';
import { loadRules } from '../utils/loader.js';
import { formatValidation, isOutputFormat } from '../utils/formatter.js';
import type { OutputFormat, ValidationEntry } from '../utils/formatter.js';
import type { Writer } from '../utils/loader.js';

const REQUIRED_FIELDS = [
  'id',
  'version',
  'model',
  'params',
  'priority',
  'effectiveFrom',
  'tags',
  'checksum',
] as const;

export function registerValidateCommand(program: Command, writer: Writer): void {
  program
    .command('validate')
    .description('Validate rule structure and checksum')
    .requiredOption('--rules <path>', 'Path to rules JSON file')
    .option('--format <format>', 'Output format: json, table, compact', 'table')
    .action(async (options: { rules: string; format: string }) => {
      try {
        const rules = await loadRules(options.rules);
        const entries: ValidationEntry[] = [];

        for (const rule of rules) {
          const errors: string[] = [];

          for (const field of REQUIRED_FIELDS) {
            if (rule[field] === undefined || rule[field] === null) {
              errors.push(`missing required field: ${field}`);
            }
          }

          if (typeof rule.id !== 'string' || rule.id.length === 0) {
            errors.push('id must be a non-empty string');
          }

          if (typeof rule.version !== 'number') {
            errors.push('version must be a number');
          }

          if (typeof rule.priority !== 'number') {
            errors.push('priority must be a number');
          }

          if (!(rule.effectiveFrom instanceof Date) || isNaN(rule.effectiveFrom.getTime())) {
            errors.push('effectiveFrom must be a valid date');
          }

          if (typeof rule.checksum !== 'string' || rule.checksum.length === 0) {
            errors.push('checksum must be a non-empty string');
          }

          if (!Array.isArray(rule.tags)) {
            errors.push('tags must be an array');
          }

          entries.push({
            ruleId: rule.id,
            status: errors.length === 0 ? 'OK' : 'FAIL',
            errors: errors.length > 0 ? errors : undefined,
          });
        }

        const format: OutputFormat = isOutputFormat(options.format) ? options.format : 'table';
        const output = formatValidation(entries, format);
        writer.stdout(output);

        const hasFailures = entries.some((e) => e.status === 'FAIL');
        if (hasFailures) {
          process.exitCode = 1;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writer.stderr(`Error: ${message}`);
        process.exitCode = 2;
      }
    });
}
