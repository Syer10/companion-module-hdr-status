import { spawn } from 'node:child_process'

export interface HdrMonitor {
	displayId: number
	name: string
	primary: boolean | null
	hdrEnabled: boolean
	sdrWhiteLevelNits: number
}

export interface HdrStatus {
	monitorCount: number
	enabledCount: number
	monitors: HdrMonitor[]
}

// Passed inline via -Command (no temp file) because Companion's Node
// permission model blocks fs writes. The pwsh child process is not sandboxed.
const PS_SCRIPT = `
$ErrorActionPreference = 'Stop'
if (-not (Get-Module -ListAvailable -Name DisplayConfig)) {
    try {
        # PowerShellGet does not always autoload reliably; import it explicitly.
        Import-Module PowerShellGet -Force
        Install-Module -Name DisplayConfig -Force -Scope CurrentUser -AllowClobber
    } catch {
        throw "Could not auto-install the DisplayConfig module ($($_.Exception.Message)). Install it manually in a PowerShell prompt: Install-Module DisplayConfig -Scope CurrentUser"
    }
}
Import-Module DisplayConfig

$colorInfo   = Get-DisplayColorInfo
$displayInfo = Get-DisplayInfo

$monitors = foreach ($ci in ($colorInfo | Where-Object { $_.HDRSupported })) {
    $di = $displayInfo | Where-Object { $_.DisplayId -eq $ci.DisplayId }
    [PSCustomObject]@{
        displayId         = $ci.DisplayId
        name              = if ($di) { $di.DisplayName } else { 'Unknown' }
        primary           = if ($di) { $di.Primary } else { $null }
        hdrEnabled        = $ci.HDREnabled
        sdrWhiteLevelNits = $ci.SdrWhiteLevelInNits
    }
}

$result = [PSCustomObject]@{
    monitorCount = @($monitors).Count
    enabledCount = @(@($monitors) | Where-Object { $_.hdrEnabled }).Count
    monitors     = @($monitors)
}
$result | ConvertTo-Json -Depth 5 -Compress
`.trim()

// DisplayConfig only works on PowerShell 7
const POWERSHELL = 'pwsh'

export function queryHdrStatus(): Promise<HdrStatus> {
	return new Promise((resolve, reject) => {
		const child = spawn(POWERSHELL, [
			'-NoProfile',
			'-NonInteractive',
			'-ExecutionPolicy',
			'Bypass',
			'-Command',
			PS_SCRIPT,
		])

		let stdout = ''
		let stderr = ''

		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString()
		})
		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString()
		})

		child.on('error', (err) => {
			reject(err)
		})

		child.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`PowerShell exited with code ${code}: ${stderr.trim() || 'no output'}`))
				return
			}
			try {
				const raw = stdout.trim()
				const parsed = JSON.parse(raw) as Record<string, unknown>
				resolve(normalize(parsed))
			} catch (err) {
				reject(
					new Error(
						`Failed to parse HDR status JSON: ${err instanceof Error ? err.message : String(err)}` +
							` (output: ${stdout.trim().slice(0, 200)})`,
					),
				)
			}
		})
	})
}

function normalize(raw: Record<string, unknown>): HdrStatus {
	const rawMonitors = Array.isArray(raw.monitors) ? (raw.monitors as Record<string, unknown>[]) : []
	const monitors: HdrMonitor[] = rawMonitors.map((m) => ({
		displayId: toNumber(m.displayId),
		name: typeof m.name === 'string' ? m.name : 'Unknown',
		primary: typeof m.primary === 'boolean' ? m.primary : null,
		hdrEnabled: m.hdrEnabled === true,
		sdrWhiteLevelNits: toNumber(m.sdrWhiteLevelNits),
	}))

	return {
		monitorCount: toNumber(raw.monitorCount),
		enabledCount: toNumber(raw.enabledCount),
		monitors,
	}
}

function toNumber(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0
}