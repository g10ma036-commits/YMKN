import React, { useRef } from 'react'
import { useDOEContext } from '../../hooks/useDOEState'
import { parseCSV } from '../../utils/csvImport'

export function ResponseEntryPage() {
  const { state, dispatch } = useDOEContext()
  const { designRuns, factors, responses } = state
  const fileRef = useRef<HTMLInputElement>(null)

  if (designRuns.length === 0) {
    return <div className="alert alert-warning">計画がまだ生成されていません。</div>
  }

  const sortedByRun = [...designRuns].sort((a, b) => a.runOrder - b.runOrder)

  const filledCount = designRuns.filter((r) =>
    responses.some((resp) => r.responses[resp.id] !== null && r.responses[resp.id] !== undefined)
  ).length

  function handleCSVImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const nameToId: Record<string, string> = {}
      responses.forEach((r) => { nameToId[r.name] = r.id })
      const data = parseCSV(text, nameToId)
      dispatch({ type: 'IMPORT_RESPONSES', data })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const canFit = filledCount >= 2

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Step 4 ─ 応答値の入力</div>
          <div className="page-subtitle">
            実験を実施し、測定した応答値をセルに直接入力してください
            （入力済み: {filledCount}/{designRuns.length}）
          </div>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => dispatch({ type: 'NAVIGATE', stage: 'design-review' })}>
            ← 戻る
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCSVImport} />
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            📂 CSVから読込
          </button>
          <button
            className="btn btn-primary"
            disabled={!canFit}
            onClick={() => {
              responses.forEach((r) => dispatch({ type: 'FIT_MODEL', responseId: r.id }))
              dispatch({ type: 'NAVIGATE', stage: 'model-fitting' })
            }}
          >
            解析実行 →
          </button>
        </div>
      </div>

      <div className="alert alert-info">
        💡 実行順序に従って実験を行い、測定値を入力してください。値がない場合はセルを空白のままにしてください。
        CSVファイルのヘッダー行は「標準順序, 応答名1, 応答名2, ...」の形式に対応しています。
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="center">実行順</th>
              <th className="center">標準順</th>
              {factors.map((f) => (
                <th key={f.id} className="num">{f.name}</th>
              ))}
              {responses.map((r) => (
                <th key={r.id} className="num" style={{ color: '#1a56db', minWidth: 110 }}>
                  {r.name}{r.units ? ` (${r.units})` : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedByRun.map((run) => {
              const allFilled = responses.every(
                (r) => run.responses[r.id] !== null && run.responses[r.id] !== undefined
              )
              return (
                <tr key={run.stdOrder} style={allFilled ? { background: '#f0fdf4' } : {}}>
                  <td className="center" style={{ fontWeight: 700 }}>{run.runOrder}</td>
                  <td className="center" style={{ color: '#6b7280' }}>{run.stdOrder}</td>
                  {factors.map((f) => {
                    const coded = run.factors[f.id]
                    const center = f.center ?? (f.low + f.high) / 2
                    const half = (f.high - f.low) / 2
                    return (
                      <td key={f.id} className="num" style={{ color: '#6b7280' }}>
                        {(center + coded * half).toFixed(3)}
                      </td>
                    )
                  })}
                  {responses.map((r) => (
                    <td key={r.id} className="editable-cell">
                      <input
                        type="number"
                        step="any"
                        value={run.responses[r.id] ?? ''}
                        placeholder="─"
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : parseFloat(e.target.value)
                          dispatch({ type: 'UPDATE_RUN_RESPONSE', stdOrder: run.stdOrder, responseId: r.id, value: val })
                        }}
                      />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
