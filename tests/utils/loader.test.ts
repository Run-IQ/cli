import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { loadRules, loadInput } from '../../src/utils/loader.js';

const TMP_DIR = join(import.meta.dirname, '__tmp_loader__');

beforeAll(async () => {
  await mkdir(TMP_DIR, { recursive: true });
});

afterAll(async () => {
  await rm(TMP_DIR, { recursive: true, force: true });
});

describe('loadRules', () => {
  it('loads and hydrates rules from a JSON file', async () => {
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
    const filePath = join(TMP_DIR, 'rules.json');
    await writeFile(filePath, JSON.stringify(rules));

    const loaded = await loadRules(filePath);

    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.id).toBe('r1');
    expect(loaded[0]!.effectiveFrom).toBeInstanceOf(Date);
  });

  it('hydrates effectiveUntil when present', async () => {
    const rules = [
      {
        id: 'r2',
        version: 1,
        model: 'STUB',
        params: {},
        priority: 1,
        effectiveFrom: '2020-01-01T00:00:00.000Z',
        effectiveUntil: '2025-12-31T23:59:59.999Z',
        tags: [],
        checksum: 'abc',
      },
    ];
    const filePath = join(TMP_DIR, 'rules-until.json');
    await writeFile(filePath, JSON.stringify(rules));

    const loaded = await loadRules(filePath);

    expect(loaded[0]!.effectiveUntil).toBeInstanceOf(Date);
  });

  it('throws for non-existent file', async () => {
    await expect(loadRules(join(TMP_DIR, 'nope.json'))).rejects.toThrow();
  });

  it('throws for invalid JSON', async () => {
    const filePath = join(TMP_DIR, 'bad.json');
    await writeFile(filePath, 'not json');
    await expect(loadRules(filePath)).rejects.toThrow();
  });

  it('throws when file contains an object instead of an array', async () => {
    const filePath = join(TMP_DIR, 'object-rules.json');
    await writeFile(filePath, JSON.stringify({ id: 'r1' }));
    await expect(loadRules(filePath)).rejects.toThrow(/array/i);
  });
});

describe('loadInput', () => {
  it('loads input from a JSON file', async () => {
    const input = {
      requestId: 'req-1',
      data: { salary: 1000 },
      meta: { tenantId: 'tenant-1' },
    };
    const filePath = join(TMP_DIR, 'input.json');
    await writeFile(filePath, JSON.stringify(input));

    const loaded = await loadInput(filePath);

    expect(loaded.requestId).toBe('req-1');
    expect(loaded.data).toEqual({ salary: 1000 });
    expect(loaded.meta.tenantId).toBe('tenant-1');
  });

  it('hydrates effectiveDate in meta', async () => {
    const input = {
      requestId: 'req-2',
      data: {},
      meta: { tenantId: 't1', effectiveDate: '2024-06-15T00:00:00.000Z' },
    };
    const filePath = join(TMP_DIR, 'input-date.json');
    await writeFile(filePath, JSON.stringify(input));

    const loaded = await loadInput(filePath);

    expect(loaded.meta.effectiveDate).toBeInstanceOf(Date);
  });

  it('throws for non-existent file', async () => {
    await expect(loadInput(join(TMP_DIR, 'nope.json'))).rejects.toThrow();
  });

  it('throws when file contains an array instead of an object', async () => {
    const filePath = join(TMP_DIR, 'array-input.json');
    await writeFile(filePath, JSON.stringify([1, 2, 3]));
    await expect(loadInput(filePath)).rejects.toThrow(/object/i);
  });

  it('defaults tenantId to empty string when meta is missing', async () => {
    const filePath = join(TMP_DIR, 'no-meta.json');
    await writeFile(filePath, JSON.stringify({ requestId: 'req-3', data: {} }));

    const loaded = await loadInput(filePath);
    expect(loaded.meta.tenantId).toBe('');
  });
});
