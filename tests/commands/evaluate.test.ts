import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createCli } from '../../src/cli.js';
import type { Writer } from '../../src/utils/loader.js';

const TMP_DIR = join(import.meta.dirname, '__tmp_eval__');

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

const validRules = [
  {
    id: 'rule-1',
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

const validInput = {
  requestId: 'req-test-1',
  data: { amount: 100 },
  meta: { tenantId: 'tenant-1' },
};

beforeAll(async () => {
  await mkdir(TMP_DIR, { recursive: true });
  await writeFile(join(TMP_DIR, 'rules.json'), JSON.stringify(validRules));
  await writeFile(join(TMP_DIR, 'input.json'), JSON.stringify(validInput));
});

afterAll(async () => {
  await rm(TMP_DIR, { recursive: true, force: true });
});

describe('evaluate command', () => {
  it('evaluates rules and prints result in table format', async () => {
    const capture = createCapture();
    const cli = createCli(capture);
    await cli.parseAsync([
      'node',
      'run-iq',
      'evaluate',
      '--rules',
      join(TMP_DIR, 'rules.json'),
      '--input',
      join(TMP_DIR, 'input.json'),
    ]);

    expect(capture.out.length).toBeGreaterThan(0);
    expect(capture.out[0]).toContain('=== Evaluation Result ===');
  });

  it('evaluates rules and prints result in json format', async () => {
    const capture = createCapture();
    const cli = createCli(capture);
    await cli.parseAsync([
      'node',
      'run-iq',
      'evaluate',
      '--rules',
      join(TMP_DIR, 'rules.json'),
      '--input',
      join(TMP_DIR, 'input.json'),
      '--format',
      'json',
    ]);

    expect(capture.out.length).toBeGreaterThan(0);
    const parsed = JSON.parse(capture.out[0]!);
    expect(parsed).toHaveProperty('requestId');
  });

  it('evaluates rules and prints result in compact format', async () => {
    const capture = createCapture();
    const cli = createCli(capture);
    await cli.parseAsync([
      'node',
      'run-iq',
      'evaluate',
      '--rules',
      join(TMP_DIR, 'rules.json'),
      '--input',
      join(TMP_DIR, 'input.json'),
      '--format',
      'compact',
    ]);

    expect(capture.out.length).toBeGreaterThan(0);
    expect(capture.out[0]).toContain('|');
  });

  it('reports error for missing rules file', async () => {
    const capture = createCapture();
    const cli = createCli(capture);
    await cli.parseAsync([
      'node',
      'run-iq',
      'evaluate',
      '--rules',
      join(TMP_DIR, 'nonexistent.json'),
      '--input',
      join(TMP_DIR, 'input.json'),
    ]);

    expect(capture.err.length).toBeGreaterThan(0);
    expect(capture.err[0]).toContain('Error:');
  });

  it('reports error for missing input file', async () => {
    const capture = createCapture();
    const cli = createCli(capture);
    await cli.parseAsync([
      'node',
      'run-iq',
      'evaluate',
      '--rules',
      join(TMP_DIR, 'rules.json'),
      '--input',
      join(TMP_DIR, 'nonexistent-input.json'),
    ]);

    expect(capture.err.length).toBeGreaterThan(0);
    expect(capture.err[0]).toContain('Error:');
  });
});
