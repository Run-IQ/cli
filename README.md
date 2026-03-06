# @run-iq/cli

CLI tool for testing and debugging **Parametric Policy Engine (PPE)** rules locally.

## Installation

```bash
npm install -g @run-iq/cli
```

## Commands

### `run-iq evaluate`

Evaluate rules against input data.

```bash
run-iq evaluate --rules rules.json --input input.json [--format json|table|compact] [--dry-run] [--strict]
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `--rules <path>` | required | Path to rules JSON file |
| `--input <path>` | required | Path to input JSON file |
| `--format <fmt>` | `table` | Output format: `json`, `table`, `compact` |
| `--dry-run` | `true` | Run without snapshot persistence |
| `--strict` | `false` | Enable strict mode |

**Example:**

```bash
run-iq evaluate --rules ./rules.json --input ./input.json --format json
```

### `run-iq validate`

Validate rule structure (required fields, checksum, types).

```bash
run-iq validate --rules rules.json [--format json|table|compact]
```

**Example:**

```bash
run-iq validate --rules ./rules.json
```

Output:
```
=== Rule Validation ===
  [OK  ] rule-irpp-2024
  [OK  ] rule-tva-2024
  [FAIL] rule-bad
         - checksum must be a non-empty string
2/3 rules valid
```

## File formats

### rules.json

```json
[
  {
    "id": "rule-1",
    "version": 1,
    "model": "FLAT_RATE",
    "params": { "rate": 0.18, "base": "grossSalary" },
    "priority": 1,
    "effectiveFrom": "2024-01-01T00:00:00.000Z",
    "effectiveUntil": null,
    "tags": ["togo"],
    "checksum": "abc123"
  }
]
```

### input.json

```json
{
  "requestId": "req-001",
  "data": { "grossSalary": 2500000 },
  "meta": { "tenantId": "tenant-1" }
}
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Evaluation or validation error |
| 2 | File not found or parse error |

## Programmatic usage

```typescript
import { createCli } from '@run-iq/cli';

const cli = createCli({
  stdout: (msg) => console.log(msg),
  stderr: (msg) => console.error(msg),
});

await cli.parseAsync(['node', 'run-iq', 'evaluate', '--rules', 'r.json', '--input', 'i.json']);
```

## License

MIT — Abdou-Raouf ATARMLA
