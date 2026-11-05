import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { queryHdrStatus, type HdrStatus } from './hdr.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: Record<string, never>
	feedbacks: Record<string, never>
	variables: VariablesSchema
}

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig

	#pollTimer?: NodeJS.Timeout
	#querying = false

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateVariableDefinitions()
		this.updateStatus(InstanceStatus.Connecting, 'Starting HDR status polling')

		await this.startPolling()
	}

	async destroy(): Promise<void> {
		this.stopPolling()
		this.log('debug', 'destroy')
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		const oldInterval = this.config?.pollInterval
		this.config = config

		if (oldInterval !== undefined && oldInterval !== config.pollInterval) {
			await this.startPolling()
		}
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	async startPolling(): Promise<void> {
		this.stopPolling()

		const intervalMs = Math.max(1, this.config.pollInterval) * 1000

		await this.refresh()

		this.#pollTimer = setInterval(() => {
			void this.refresh()
		}, intervalMs)
	}

	stopPolling(): void {
		if (this.#pollTimer) {
			clearInterval(this.#pollTimer)
			this.#pollTimer = undefined
		}
	}

	// #querying prevents overlapping polls when pwsh is slow
	async refresh(): Promise<void> {
		if (this.#querying) return
		this.#querying = true

		try {
			const status = await queryHdrStatus()
			this.applyStatus(status)
			this.updateStatus(InstanceStatus.Ok, this.summaryLine(status))
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err)
			this.log('error', `Failed to read HDR status: ${message}`)
			this.updateStatus(InstanceStatus.ConnectionFailure, message)
		} finally {
			this.#querying = false
		}
	}

	applyStatus(status: HdrStatus): void {
		const anyEnabled = status.enabledCount > 0
		const allEnabled = status.monitorCount > 0 && status.enabledCount === status.monitorCount

		this.setVariableValues({
			hdr_monitor_count: status.monitorCount,
			hdr_enabled_count: status.enabledCount,
			hdr_any_enabled: anyEnabled,
			hdr_all_enabled: allEnabled,
			hdr_status: this.summaryLine(status),
			hdr_json: JSON.stringify(status),
		})
	}

	summaryLine(status: HdrStatus): string {
		if (status.monitorCount === 0) return 'No HDR-capable monitors'
		if (status.enabledCount === status.monitorCount)
			return `HDR ENABLED on all ${status.monitorCount} monitor(s)`
		if (status.enabledCount === 0) return `HDR DISABLED on all ${status.monitorCount} monitor(s)`
		return `HDR enabled on ${status.enabledCount} of ${status.monitorCount} monitor(s)`
	}
}