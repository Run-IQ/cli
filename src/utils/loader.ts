import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { hydrateRules } from '@run-iq/core';
import type { Rule, EvaluationInput } from '@run-iq/core';

export interface Writer {
  stdout(message: string): void;
  stderr(message: string): void;
}

export async function loadRules(filePath: string): Promise<Rule[]> {
  const absolute = resolve(filePath);
  const content = await readFile(absolute, 'utf-8');
  const raw = JSON.parse(content) as Record<string, unknown>[];

  if (!Array.isArray(raw)) {
    throw new Error(`Rules file must contain a JSON array: ${filePath}`);
  }

  return hydrateRules(raw);
}

export async function loadInput(filePath: string): Promise<EvaluationInput> {
  const absolute = resolve(filePath);
  const content = await readFile(absolute, 'utf-8');
  const raw = JSON.parse(content) as Record<string, unknown>;

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`Input file must contain a JSON object: ${filePath}`);
  }

  const meta = raw['meta'] as Record<string, unknown> | undefined;

  const input: EvaluationInput = {
    requestId: raw['requestId'] as string,
    data: (raw['data'] as Record<string, unknown>) ?? {},
    meta: {
      tenantId: (meta?.['tenantId'] as string) ?? '',
      userId: meta?.['userId'] as string | undefined,
      tags: meta?.['tags'] as string[] | undefined,
      context: meta?.['context'] as Record<string, unknown> | undefined,
      effectiveDate: meta?.['effectiveDate']
        ? new Date(meta['effectiveDate'] as string)
        : undefined,
    },
  };

  return input;
}
