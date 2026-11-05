import type { SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	pollInterval: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'number',
			id: 'pollInterval',
			label: 'Poll interval (seconds)',
			width: 6,
			min: 1,
			max: 3600,
			default: 10,
			tooltip: 'How often the HDR status is re-read from the displays.',
		},
	]
}