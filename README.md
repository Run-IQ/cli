# @run-iq/cli

Command-line tool to evaluate and validate [Run-IQ](https://github.com/Run-IQ/core) rules from JSON files. Useful for testing a rule set locally before shipping it.

## Install

The package is published to GitHub Packages. Point the `@run-iq` scope at it in your `.npmrc` (GitHub requires a token with `read:packages`):

```
@run-iq:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
```

```bash
npm install -g @run-iq/cli @run-iq/core
```

`@run-iq/core` is a peer dependency. Requires Node.js 20 or later.

## Commands

### `run-iq evaluate`

```bash
run-iq evaluate --rules rules.json --input input.json --plugin ./my-plugin.mjs
```

| Option | Default | |
|---|---|---|
| `--rules <path>` | required | JSON array of rules |
| `--input <path>` | required | JSON object with `requestId`, `data` and `meta` |
| `--plugin <paths...>` | none | Plugin or DSL modules to load (see below) |
| `--format <format>` | `table` | `table`, `json` or `compact` |
| `--strict` | off | Strict mode: `meta.effectiveDate` becomes required |

Evaluations always run in dry-run mode: nothing is persisted.

### `run-iq validate`

```bash
run-iq validate --rules rules.json
```

Checks that every rule has the required fields (`id`, `version`, `model`, `params`, `priority`, `effectiveFrom`, `tags`, `checksum`) with the right types. It does not recompute the checksum: a rule with a wrong checksum passes `validate` but is skipped by `evaluate` with `CHECKSUM_MISMATCH`.

Takes `--format` like `evaluate`.

## Plugins

The CLI ships without any calculation model, so `evaluate` needs at least one plugin. Each `--plugin` path is imported and its default export must be either a plugin instance (`name` + `onInit`) or a DSL evaluator (`dsl` + `evaluate`).

To use published packages, re-export an instance:

```js
// fiscal.mjs
import { FiscalPlugin } from '@run-iq/plugin-fiscal';
export default new FiscalPlugin();
```

```js
// jsonlogic.mjs
import { JsonLogicEvaluator } from '@run-iq/dsl-jsonlogic';
export default new JsonLogicEvaluator();
```

```bash
run-iq evaluate --rules rules.json --input input.json --plugin ./fiscal.mjs ./jsonlogic.mjs
```

## Example

A minimal plugin with one model:

```js
// plugin.mjs
const percentage = {
  name: 'PERCENTAGE',
  version: '1.0.0',
  validateParams: (p) => ({ valid: typeof p?.rate === 'number' }),
  calculate: (input, _rule, p) => input[p.base] * p.rate,
};
export default { name: 'demo', version: '1.0.0', onInit: (ctx) => ctx.modelRegistry.register(percentage) };
```

`rules.json`. The `checksum` must be computed with `computeRuleChecksum` from `@run-iq/core`, otherwise the rule is skipped:

```json
[
  {
    "id": "shipping-fee",
    "version": 1,
    "model": "PERCENTAGE",
    "params": { "base": "orderTotal", "rate": 0.05 },
    "priority": 1,
    "effectiveFrom": "2025-01-01T00:00:00.000Z",
    "effectiveUntil": null,
    "tags": [],
    "checksum": "a83ed3469a0a3856ffdce60de7d9327cd5e0b849a90c0e0ea317c2c826e4ea6a"
  }
]
```

`input.json`:

```json
{
  "requestId": "order-42",
  "data": { "orderTotal": 200 },
  "meta": { "tenantId": "acme", "effectiveDate": "2025-06-01" }
}
```

```
$ run-iq evaluate --rules rules.json --input input.json --plugin ./plugin.mjs
=== Evaluation Result ===
Request ID : order-42
Value      : 10
Engine     : 0.2.7
Duration   : 1.81ms

--- Breakdown ---
  [shipping-fee] PERCENTAGE => 10

--- Trace ---
  [shipping-fee] condition=true model=PERCENTAGE => 10 (0.03ms)
```

## Exit codes

`0` success, `1` evaluation error or invalid rules, `2` file not found or invalid JSON.

## Programmatic use

```ts
import { createCli } from '@run-iq/cli';

const cli = createCli({ stdout: console.log, stderr: console.error });
await cli.parseAsync(['node', 'run-iq', 'validate', '--rules', 'rules.json']);
```

## License

MIT
