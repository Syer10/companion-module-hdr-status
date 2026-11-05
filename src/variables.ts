import type ModuleInstance from './main.js'

// Real types (not strings) so they work in Companion feedbacks
export type VariablesSchema = {
	hdr_monitor_count: number
	hdr_enabled_count: number
	hdr_any_enabled: boolean
	hdr_all_enabled: boolean
	hdr_status: string
	hdr_json: string
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions({
		hdr_monitor_count: { name: 'HDR monitor count' },
		hdr_enabled_count: { name: 'HDR enabled count' },
		hdr_any_enabled: { name: 'Any HDR enabled (true/false)' },
		hdr_all_enabled: { name: 'All HDR enabled (true/false)' },
		hdr_status: { name: 'HDR status summary' },
		hdr_json: { name: 'HDR status (JSON)' },
	})
}