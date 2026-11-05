# AGENTS.md

A Bitfocus Companion **connection module** that reads Windows HDR status into
Companion variables. It polls an embedded PowerShell script (run via `pwsh`,
using the [DisplayConfig](https://github.com/MartinGC94/DisplayConfig) module)
on an interval and pushes the result into variables.

Read this before touching `src/` or `companion/manifest.json`. The gotchas below
are the parts that are not obvious from the code.

## The sandbox (read first)

Companion runs each module in a Node process under the **Node.js permission
model**, which by default blocks filesystem writes and child-process spawning.

- Declare what you need in `companion/manifest.json` → `runtime.permissions`
  (`child-process`, `filesystem`, `worker-threads`, `native-addons`). Companion
  maps these to the `--allow-*` Node flags. This module needs only
  `child-process: true`.
- Consequence for module code: **no temp files, no fs writes.** The PowerShell
  script is passed inline as `pwsh -Command "<script>"`, never written to disk
  (see `src/hdr.ts`).
- The spawned `pwsh` is a separate OS process and is **not** subject to Node's
  sandbox, so it can install/load PowerShell modules freely.

## PowerShell 7 + DisplayConfig

- DisplayConfig only works on **PowerShell 7 (`pwsh`)**, not Windows PowerShell
  5.1. The module hardcodes `pwsh` (the `POWERSHELL` constant in `src/hdr.ts`).
  There is deliberately no config option to pick the binary.
- HDR data source: `Get-DisplayColorInfo` (→ `HDRSupported`, `HDREnabled`,
  `SdrWhiteLevelInNits`) joined with `Get-DisplayInfo` (→ `DisplayName`,
  `Primary`) by `DisplayId`. Only **active** displays are reported.
- The script auto-installs DisplayConfig on first run (`Import-Module
  PowerShellGet` then `Install-Module`), guarded so it is skipped when the
  module is already present. PowerShellGet does not always autoload, hence the
  explicit `Import-Module`.

## Companion module architecture

- Plugin API is `@companion-module/base`; the entry class extends
  `InstanceBase<ModuleSchema>` (`src/main.ts`).
- `ModuleSchema` **must** include the keys `config`, `secrets`, `actions`,
  `feedbacks`, `variables`. `actions`/`feedbacks` are required by the
  `InstanceTypes` constraint even when empty — use `Record<string, never>`.
  Omitting them is a compile error (TS2344).
- Lifecycle: `init(config)` starts work (kick off polling), `destroy()` stops
  timers, `configUpdated(config)` reacts to config changes, `getConfigFields()`
  returns the web-config fields.
- Variables: declare with `setVariableDefinitions({ id: { name } })`, update with
  `setVariableValues({ id: value })`. Values are strings (or JSON); this is the
  current API, not the legacy `setValue`.
- Connection health: `updateStatus(InstanceStatus.Ok | InstanceStatus.ConnectionFailure, message)`.
- Guard overlapping polls: a slow `pwsh` call must not stack up — `src/main.ts`
  uses a `#querying` re-entrancy flag.

## Build & package

No `yarn` in this environment, and `package.json`'s `package` script uses yarn's
`run`, which fails under npm. Build manually:

```
npx tsc -p tsconfig.build.json     # compile src/ → dist/
npx companion-module-build         # bundle + write hdr-status-<version>.tgz
```

- `companion-module-build` bundles all of `src/` into a single `dist/main.js`,
  rewrites `runtime.entrypoint` → `../main.js`, and sets `runtime.apiVersion`
  from the installed `@companion-module/base`.
- The `.tgz` is the installable artifact (Companion → Modules → Install from
  file, or drop into `data/modules/`).
- **Definition of done:** `tsc` exits 0 **and** `companion-module-build` writes
  the `.tgz` with no manifest-validation error.

## Manifest validation gotcha

`companion-module-build` rejects template placeholder strings in the manifest and
fails the build: `Your name`, `Your email`, `Your company`, `Your product`,
`module-shortname`, `companion-module-your-module-name`, and the default
description. Use real (or neutral) values in `maintainers`, `manufacturer`,
`products`, `repository`, `bugs`.

## Testing the PowerShell in isolation

There is no test suite. To check the embedded script without Companion, run it
through `pwsh` directly (it prints one compact JSON object to stdout):

```
pwsh -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "<the PS_SCRIPT from src/hdr.ts>"
```

Expected shape: `{"monitorCount":N,"enabledCount":M,"monitors":[{...}]}`.

## Files

- `src/main.ts` — `InstanceBase` subclass: polling loop, variable updates, status.
- `src/hdr.ts` — spawns `pwsh`, holds the embedded `PS_SCRIPT`, parses JSON.
- `src/config.ts` — `ModuleConfig` type + `GetConfigFields()`.
- `src/variables.ts` — variable definitions.
- `companion/manifest.json` — module metadata, `runtime`, `permissions`.
- `companion/HELP.md` — user-facing docs.