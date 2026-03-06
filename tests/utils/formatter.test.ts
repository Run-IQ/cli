import { describe, it, expect } from 'vitest';
import type { EvaluationResult } from '@run-iq/core';
import { formatResult, formatValidation } from '../../src/utils/formatter.js';
import type { ValidationEntry } from '../../src/utils/formatter.js';

function makeResult(overrides?: Partial<EvaluationResult>): EvaluationResult {
  return {
    requestId: 'req-1',
    value: 42,
    breakdown: [{ ruleId: 'r1', contribution: 42, modelUsed: 'STUB' }],
    appliedRules: [],
    skippedRules: [],
    trace: { steps: [], totalDurationMs: 5 },
    snapshotId: 'snap-1',
    engineVersion: '0.1.2',
    pluginVersions: {},
    dslVersions: {},
    timestamp: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('formatResult', () => {
  it('formats as JSON', () => {
    const output = formatResult(makeResult(), 'json');
    const parsed = JSON.parse(output);
    expect(parsed.requestId).toBe('req-1');
    expect(parsed.value).toBe(42);
  });

  it('formats as compact', () => {
    const output = formatResult(makeResult(), 'compact');
    expect(output).toContain('requestId: req-1');
    expect(output).toContain('value: 42');
    expect(output).toContain('|');
  });

  it('formats as table', () => {
    const output = formatResult(makeResult(), 'table');
    expect(output).toContain('=== Evaluation Result ===');
    expect(output).toContain('Request ID : req-1');
    expect(output).toContain('Value      : 42');
    expect(output).toContain('--- Breakdown ---');
  });

  it('shows trace steps with DSL in table', () => {
    const result = makeResult({
      trace: {
        steps: [
          {
            ruleId: 'r1',
            conditionResult: true,
            conditionDetail: null,
            modelUsed: 'FLAT_RATE',
            inputSnapshot: {},
            contribution: 42,
            durationMs: 1.5,
            dslUsed: 'jsonlogic',
          },
        ],
        totalDurationMs: 5,
      },
    });
    const output = formatResult(result, 'table');
    expect(output).toContain('--- Trace ---');
    expect(output).toContain('(dsl: jsonlogic)');
    expect(output).toContain('model=FLAT_RATE');
  });

  it('handles empty breakdown and no skipped rules', () => {
    const result = makeResult({
      breakdown: [],
      skippedRules: [],
      trace: { steps: [], totalDurationMs: 0 },
    });
    const output = formatResult(result, 'table');
    expect(output).toContain('=== Evaluation Result ===');
    expect(output).not.toContain('--- Breakdown ---');
    expect(output).not.toContain('--- Skipped ---');
    expect(output).not.toContain('--- Trace ---');
  });

  it('shows breakdown label when present', () => {
    const result = makeResult({
      breakdown: [{ ruleId: 'r1', contribution: 100, modelUsed: 'FLAT_RATE', label: 'TVA 18%' }],
    });
    const output = formatResult(result, 'table');
    expect(output).toContain('(TVA 18%)');
  });

  it('shows skipped rules in table', () => {
    const result = makeResult({
      skippedRules: [
        {
          rule: {
            id: 'r2',
            version: 1,
            model: 'X',
            params: {},
            priority: 1,
            effectiveFrom: new Date(),
            effectiveUntil: null,
            tags: [],
            checksum: 'abc',
          },
          reason: 'INACTIVE_DATE',
        },
      ],
    });
    const output = formatResult(result, 'table');
    expect(output).toContain('--- Skipped ---');
    expect(output).toContain('[r2] INACTIVE_DATE');
  });
});

describe('formatValidation', () => {
  const entries: ValidationEntry[] = [
    { ruleId: 'r1', status: 'OK' },
    { ruleId: 'r2', status: 'FAIL', errors: ['missing field: checksum'] },
  ];

  it('formats as JSON', () => {
    const output = formatValidation(entries, 'json');
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(2);
  });

  it('formats as compact', () => {
    const output = formatValidation(entries, 'compact');
    expect(output).toContain('r1: OK');
    expect(output).toContain('r2: FAIL');
  });

  it('formats as table', () => {
    const output = formatValidation(entries, 'table');
    expect(output).toContain('=== Rule Validation ===');
    expect(output).toContain('[OK  ] r1');
    expect(output).toContain('[FAIL] r2');
    expect(output).toContain('missing field: checksum');
    expect(output).toContain('1/2 rules valid');
  });
});
