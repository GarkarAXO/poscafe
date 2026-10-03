export interface TerminalDeviceConfig {
  branchId: string
  branchName: string
  terminalName: string
  autoLockOnIdle?: boolean
  idleTimeoutMinutes?: number
  isFixedTerminal: boolean
  configuredAt: string
}

const STORAGE_KEY = 'pos_terminal_device'

export function getTerminalDeviceConfig(): TerminalDeviceConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TerminalDeviceConfig
  } catch {
    return null
  }
}

export function saveTerminalDeviceConfig(config: TerminalDeviceConfig): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Ignore storage quota errors
  }
}

export function clearTerminalDeviceConfig(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore errors
  }
}
