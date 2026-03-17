import type { EvaluationResult } from '@run-iq/core';

export type OutputFormat = 'json' | 'table' | 'compact';

const OUTPUT_FORMATS: ReadonlySet<string> = new Set(['json', 'table', 'compact']);

export function isOutputFormat(value: string): value is OutputFormat {
  return OUTPUT_FORMATS.has(value);
}

export function formatResult(result: EvaluationResult, format: OutputFormat): string {
  switch (format) {
    case 'json':
      return formatJson(result);
    case 'compact':
      return formatCompact(result);
    case 'table':
    default:
      return formatTable(result);
  }
}

function formatJson(result: EvaluationResult): string {
  return JSON.stringify(result, null, 2);
}

function formatCompact(result: EvaluationResult): string {
  const parts: string[] = [
    `requestId: ${result.requestId}`,
    `value: ${String(result.value)}`,
    `applied: ${result.appliedRules.length}`,
    `skipped: ${result.skippedRules.length}`,
    `duration: ${result.trace.totalDurationMs}ms`,
  ];
  return parts.join(' | ');
}

function formatTable(result: EvaluationResult): string {
  const lines: string[] = [];

  lines.push('=== Evaluation Result ===');
  lines.push(`Request ID : ${result.requestId}`);
  lines.push(`Value      : ${String(result.value)}`);
  lines.push(`Engine     : ${result.engineVersion}`);
  lines.push(`Duration   : ${result.trace.totalDurationMs}ms`);
  lines.push('');

  if (result.breakdown.length > 0) {
    lines.push('--- Breakdown ---');
    for (const item of result.breakdown) {
      const label = item.label ? ` (${item.label})` : '';
      lines.push(`  [${item.ruleId}] ${item.modelUsed}${label} => ${String(item.contribution)}`);
    }
    lines.push('');
  }

  if (result.skippedRules.length > 0) {
    lines.push('--- Skipped ---');
    for (const skip of result.skippedRules) {
      lines.push(`  [${skip.rule.id}] ${skip.reason}`);
    }
    lines.push('');
  }

  if (result.trace.steps.length > 0) {
    lines.push('--- Trace ---');
    for (const step of result.trace.steps) {
      const dsl = step.dslUsed ? ` (dsl: ${step.dslUsed})` : '';
      lines.push(
        `  [${step.ruleId}] condition=${String(step.conditionResult)} model=${step.modelUsed} => ${String(step.contribution)} (${step.durationMs}ms)${dsl}`,
      );
    }
  }

  return lines.join('\n');
}

export interface ValidationEntry {
  ruleId: string;
  status: 'OK' | 'FAIL';
  errors?: readonly string[] | undefined;
}

export function formatValidation(entries: ValidationEntry[], format: OutputFormat): string {
  switch (format) {
    case 'json':
      return JSON.stringify(entries, null, 2);
    case 'compact':
      return entries.map((e) => `${e.ruleId}: ${e.status}`).join(' | ');
    case 'table':
    default:
      return formatValidationTable(entries);
  }
}

function formatValidationTable(entries: ValidationEntry[]): string {
  const lines: string[] = ['=== Rule Validation ==='];

  for (const entry of entries) {
    const mark = entry.status === 'OK' ? 'OK  ' : 'FAIL';
    lines.push(`  [${mark}] ${entry.ruleId}`);
    if (entry.errors && entry.errors.length > 0) {
      for (const err of entry.errors) {
        lines.push(`         - ${err}`);
      }
    }
  }

  const passed = entries.filter((e) => e.status === 'OK').length;
  lines.push('');
  lines.push(`${passed}/${entries.length} rules valid`);

  return lines.join('\n');
}
