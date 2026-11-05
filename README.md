# companion-module-hdr-status

A [Bitfocus Companion](https://bitfocus.com/companion/) connection module that reads the Windows HDR status of connected monitors into Companion variables.

Uses the [DisplayConfig](https://github.com/MartinGC94/DisplayConfig) PowerShell module (wraps the Windows CCD advanced-color APIs) via an embedded script run through `pwsh`.

## Variables

| Variable | Type | Description |
| --- | --- | --- |
| `hdr_monitor_count` | number | HDR-capable monitors currently active |
| `hdr_enabled_count` | number | Monitors with HDR enabled |
| `hdr_any_enabled` | boolean | At least one monitor has HDR on |
| `hdr_all_enabled` | boolean | Every monitor has HDR on |
| `hdr_status` | text | Human-readable summary |
| `hdr_json` | text | Full status as JSON |

## Requirements

- Windows 10 1803+ / Windows 11
- PowerShell 7 (`pwsh`)

## Install

Download the latest `.tgz` from [releases](https://github.com/Syer10/companion-module-hdr-status/releases), then in Companion: **Modules → ⋮ → Install from file**.

## Build

```bash
npm install
npx tsc -p tsconfig.build.json
npx companion-module-build
```

Output: `hdr-status-<version>.tgz` in the project root.

## License

[MIT](LICENSE)