# HDR Status

A Bitfocus Companion connection module that reads the Windows HDR status of your
connected monitors and exposes it as Companion variables.

It works by running a small PowerShell script that uses the
[DisplayConfig](https://github.com/MartinGC94/DisplayConfig) PowerShell module
(which wraps the Windows CCD / advanced-color APIs). The script is embedded in
this module, so you do not need to install anything by hand — the DisplayConfig
module is installed automatically on first run if it is missing.

## Requirements

- Windows 10 1803+ / Windows 11 (the CCD advanced-color API).
- PowerShell 7 (`pwsh`) on the machine running Companion. The DisplayConfig
  module only works on PowerShell 7, so the module always invokes `pwsh`.

## Configuration

| Field | Description |
| --- | --- |
| Poll interval (seconds) | How often the HDR status is re-read. Minimum 1 second. |

## Variables

| Variable | Type | Description |
| --- | --- | --- |
| `hdr_monitor_count` | number | Number of HDR-capable monitors currently active. |
| `hdr_enabled_count` | number | Number of HDR-capable monitors with HDR currently enabled. |
| `hdr_any_enabled` | boolean | `true` if at least one HDR-capable monitor has HDR on, else `false`. |
| `hdr_all_enabled` | boolean | `true` if every HDR-capable monitor has HDR on (and there is at least one), else `false`. |
| `hdr_status` | text | Human-readable summary, e.g. `HDR ENABLED on all 1 monitor(s)`. |
| `hdr_json` | text | The full status as a JSON string, for advanced use. |

The boolean and number variables are real types, so they work directly in
feedbacks (e.g. "variable `hdr_any_enabled` is `true`", or
"`hdr_enabled_count` is greater than `0`").

## Notes

- Only **active** displays are considered (the CCD API reports active paths).
- The connection status shows `Ok` while polling succeeds and
  `Connection failure` if PowerShell or the DisplayConfig module fails.