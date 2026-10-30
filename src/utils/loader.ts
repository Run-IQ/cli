import { readFile } from 'node:fs/promises';
import { resolve, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { hydrateRule, hydrateRules } from '@run-iq/core';
import type { Rule, EvaluationInput } from '@run-iq/core';

export interface Writer {
  stdout(message: string): void;
  stderr(message: string): void;
}

export async function loadRules(filePath: string): Promise<Rule[]> {
  const absolute = resolve(filePath);
  const content = await readFile(absolute, 'utf-8');
  const parsed: unknown = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new Error(`Rules file must contain a JSON array: ${filePath}`);
  }

  // justification: JSON.parse returns unknown, hydrateRules expects Record<string, unknown>[]
  // and will validate structure internally
  const raw = parsed as Record<string, unknown>[];
  return hydrateRules(raw);
}

export type RuleEntry = { raw: Record<string, unknown>; rule?: Rule; error?: string };

/**
 * Like loadRules, but hydrates each rule on its own so one malformed rule
 * does not hide the others: a rule that fails hydration carries its error message.
 */
export async function loadRuleEntries(filePath: string): Promise<RuleEntry[]> {
  const absolute = resolve(filePath);
  const content = await readFile(absolute, 'utf-8');
  const parsed: unknown = JSON.parse(content);

  if (!Array.isArray(parsed)) {
    throw new Error(`Rules file must contain a JSON array: ${filePath}`);
  }

  // justification: JSON.parse returns unknown, hydrateRule validates structure internally
  const raws = parsed as Record<string, unknown>[];
  return raws.map((raw) => {
    try {
      return { raw, rule: hydrateRule(raw) };
    } catch (error) {
      return { raw, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

export async function loadInput(filePath: string): Promise<EvaluationInput> {
  const absolute = resolve(filePath);
  const content = await readFile(absolute, 'utf-8');
  const parsed: unknown = JSON.parse(content);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Input file must contain a JSON object: ${filePath}`);
  }

  // justification: validated as non-null object above
  const raw = parsed as Record<string, unknown>;
  const meta = (raw['meta'] ?? undefined) as Record<string, unknown> | undefined;

  const input: EvaluationInput = {
    requestId: String(raw['requestId'] ?? ''),
    data: (typeof raw['data'] === 'object' && raw['data'] !== null && !Array.isArray(raw['data'])
      ? raw['data']
      : {}) as Record<string, unknown>,
    meta: {
      tenantId: typeof meta?.['tenantId'] === 'string' ? meta['tenantId'] : '',
      userId: typeof meta?.['userId'] === 'string' ? meta['userId'] : undefined,
      tags: Array.isArray(meta?.['tags']) ? (meta['tags'] as string[]) : undefined,
      context:
        typeof meta?.['context'] === 'object' &&
        meta['context'] !== null &&
        !Array.isArray(meta['context'])
          ? (meta['context'] as Record<string, unknown>)
          : undefined,
      effectiveDate:
        typeof meta?.['effectiveDate'] === 'string' ? new Date(meta['effectiveDate']) : undefined,
    },
  };

  return input;
}

/**
 * Dynamically load a module from a file path.
 * Expects the module to have a default export.
 */
export async function loadModule(modulePath: string): Promise<unknown> {
  const absolute = isAbsolute(modulePath) ? modulePath : resolve(modulePath);
  const fileUrl = pathToFileURL(absolute).href;
  const mod = (await import(fileUrl)) as Record<string, unknown>;
  return mod['default'] ?? mod;
}
