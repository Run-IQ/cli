import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createCli } from '../../src/cli.js';
import type { Writer } from '../../src/utils/loader.js';

const TMP_DIR = join(import.meta.dirname, '__tmp_validate__');

function createCapture(): Writer & { out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    stdout: (msg: string) => out.push(msg),
    stderr: (msg: string) => err.push(msg),
  };
}

beforeAll(async () => {
  await mkdir(TMP_DIR, { recursive: true });
});

afterAll(async () => {
  await rm(TMP_DIR, { recursive: true, force: true });
});

describe('validate command', () => {
  it('validates correct rules as OK', async () => {
    const rules = [
      {
        id: 'r1',
        version: 1,
        model: 'STUB',
        params: {},
        priority: 1,
        effectiveFrom: '2020-01-01T00:00:00.000Z',
        effectiveUntil: null,
        tags: [],
        checksum: 'abc123',
      },
    ];
    await writeFile(join(TMP_DIR, 'valid.json'), JSON.stringify(rules));

    const capture = createCapture();
    const cli = createCli(capture);
    await cli.parseAsync(['node', 'run-iq', 'validate', '--rules', join(TMP_DIR, 'valid.json')]);

    expect(capture.out.length).toBeGreaterThan(0);
    expect(capture.out[0]).toContain('[OK  ] r1');
    expect(capture.out[0]).toContain('1/1 rules valid');
  });

  it('detects invalid rules', async () => {
    const rules = [
      {
        id: '',
        version: 'not-a-number',
        model: 'STUB',
        params: {},
        priority: 1,
        effectiveFrom: 'invalid-date',
        effectiveUntil: null,
        tags: [],
        checksum: '',
      },
    ];
    await writeFile(join(TMP_DIR, 'invalid.json'), JSON.stringify(rules));

    const capture = createCapture();
    const cli = createCli(capture);
    await cli.parseAsync(['node', 'run-iq', 'validate', '--rules', join(TMP_DIR, 'invalid.json')]);

    expect(capture.out.length).toBeGreaterThan(0);
    expect(capture.out[0]).toContain('[FAIL]');
  });

  it('outputs in json format', async () => {
    const rules = [
      {
        id: 'r1',
        version: 1,
        model: 'STUB',
        params: {},
        priority: 1,
        effectiveFrom: '2020-01-01T00:00:00.000Z',
        effectiveUntil: null,
        tags: [],
        checksum: 'abc',
      },
    ];
    await writeFile(join(TMP_DIR, 'json-out.json'), JSON.stringify(rules));

    const capture = createCapture();
    const cli = createCli(capture);
    await cli.parseAsync([
      'node',
      'run-iq',
      'validate',
      '--rules',
      join(TMP_DIR, 'json-out.json'),
      '--format',
      'json',
    ]);

    expect(capture.out.length).toBeGreaterThan(0);
    const parsed = JSON.parse(capture.out[0]!);
    expect(parsed[0]).toHaveProperty('ruleId', 'r1');
    expect(parsed[0]).toHaveProperty('status', 'OK');
  });

  it('reports multiple errors per rule in table format', async () => {
    const rules = [
      {
        id: '',
        version: 'not-a-number',
        model: 'STUB',
        params: {},
        priority: 'wrong',
        effectiveFrom: 'invalid-date',
        effectiveUntil: null,
        tags: 'not-an-array',
        checksum: '',
      },
    ];
    await writeFile(join(TMP_DIR, 'multi-error.json'), JSON.stringify(rules));

    const capture = createCapture();
    const cli = createCli(capture);
    await cli.parseAsync([
      'node',
      'run-iq',
      'validate',
      '--rules',
      join(TMP_DIR, 'multi-error.json'),
    ]);

    expect(capture.out[0]).toContain('[FAIL]');
    expect(capture.out[0]).toContain('id must be a non-empty string');
    expect(capture.out[0]).toContain('version must be a number');
    expect(capture.out[0]).toContain('priority must be a number');
    expect(capture.out[0]).toContain('effectiveFrom must be a valid date');
    expect(capture.out[0]).toContain('checksum must be a non-empty string');
    expect(capture.out[0]).toContain('tags must be an array');
    expect(capture.out[0]).toContain('0/1 rules valid');
  });

  it('validates mix of OK and FAIL rules', async () => {
    const rules = [
      {
        id: 'good-rule',
        version: 1,
        model: 'STUB',
        params: {},
        priority: 1,
        effectiveFrom: '2020-01-01T00:00:00.000Z',
        effectiveUntil: null,
        tags: [],
        checksum: 'abc',
      },
      {
        id: '',
        version: 1,
        model: 'STUB',
        params: {},
        priority: 1,
        effectiveFrom: '2020-01-01T00:00:00.000Z',
        effectiveUntil: null,
        tags: [],
        checksum: '',
      },
    ];
    await writeFile(join(TMP_DIR, 'mixed.json'), JSON.stringify(rules));

    const capture = createCapture();
    const cli = createCli(capture);
    await cli.parseAsync(['node', 'run-iq', 'validate', '--rules', join(TMP_DIR, 'mixed.json')]);

    expect(capture.out[0]).toContain('[OK  ] good-rule');
    expect(capture.out[0]).toContain('[FAIL]');
    expect(capture.out[0]).toContain('1/2 rules valid');
  });

  it('reports error for missing rules file', async () => {
    const capture = createCapture();
    const cli = createCli(capture);
    await cli.parseAsync([
      'node',
      'run-iq',
      'validate',
      '--rules',
      join(TMP_DIR, 'nonexistent.json'),
    ]);

    expect(capture.err.length).toBeGreaterThan(0);
    expect(capture.err[0]).toContain('Error:');
  });
});
