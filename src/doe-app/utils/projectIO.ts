import type { DOEState } from '../types/doe'

export function exportProject(state: DOEState): void {
  const json = JSON.stringify(state, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${state.projectName.replace(/\s+/g, '_')}.doe.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importProject(json: string): DOEState | null {
  try {
    const state = JSON.parse(json) as DOEState
    if (!state.factors || !state.responses || !state.stage) return null
    return state
  } catch {
    return null
  }
}

export function exportDesignCSV(state: DOEState): void {
  if (state.designRuns.length === 0) return
  const factorNames = state.factors.map((f) => f.name)
  const responseNames = state.responses.map((r) => r.name)
  const headers = ['標準順序', '実行順序', ...factorNames, ...responseNames]
  const rows = state.designRuns
    .slice()
    .sort((a, b) => a.runOrder - b.runOrder)
    .map((run) => {
      const fVals = state.factors.map((f) => {
        const coded = run.factors[f.id]
        const natural = f.center !== undefined
          ? f.center + coded * (f.high - f.low) / 2
          : (f.low + f.high) / 2 + coded * (f.high - f.low) / 2
        return natural.toFixed(4)
      })
      const rVals = state.responses.map((r) => {
        const v = run.responses[r.id]
        return v === null || v === undefined ? '' : String(v)
      })
      return [run.stdOrder, run.runOrder, ...fVals, ...rVals].join(',')
    })
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${state.projectName.replace(/\s+/g, '_')}_design.csv`
  a.click()
  URL.revokeObjectURL(url)
}
