import React from 'react'
import { useDOEContext } from '../../hooks/useDOEState'

export function DesignMatrixPage() {
  const { state, dispatch } = useDOEContext()
  const { designRuns, factors, responses } = state

  if (designRuns.length === 0) {
    return (
      <div className="alert alert-warning">
        計画がまだ生成されていません。前のステップで計画を生成してください。
      </div>
    )
  }

  const sortedByRun = [...designRuns].sort((a, b) => a.runOrder - b.runOrder)

  function toNatural(factorId: string, coded: number): string {
    const f = factors.find(f => f.id === factorId)
    if (!f) return coded.toFixed(2)
    const center = f.center ?? (f.low + f.high) / 2
    const half = (f.high - f.low) / 2
    return (center + coded * half).toFixed(3)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Step 3 ─ 計画行列の確認</div>
          <div className="page-subtitle">
            {designRuns.length} ラン ／ {factors.length} 因子
          </div>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => dispatch({ type: 'NAVIGATE', stage: 'design-selection' })}>
            ← 戻る
          </button>
          <button className="btn btn-secondary" onClick={() => dispatch({ type: 'RANDOMIZE_RUNS' })}>
            🔀 再ランダム化
          </button>
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'NAVIGATE', stage: 'response-entry' })}>
            次へ：応答入力 →
          </button>
        </div>
      </div>

      <div className="alert alert-info">
        💡 実行順序に従って実験を行い、次のステップで応答値を入力してください。この表を印刷して使用できます。
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th className="center">実行順</th>
              <th className="center">標準順</th>
              {factors.map((f) => (
                <th key={f.id} className="num">
                  {f.name}
                  {f.units ? ` (${f.units})` : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedByRun.map((run) => (
              <tr key={run.stdOrder}>
                <td className="center" style={{ fontWeight: 700 }}>{run.runOrder}</td>
                <td className="center" style={{ color: '#6b7280' }}>{run.stdOrder}</td>
                {factors.map((f) => {
                  const coded = run.factors[f.id]
                  return (
                    <td key={f.id} className="num">
                      {toNatural(f.id, coded)}
                      <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 4 }}>
                        ({coded >= 0 ? '+' : ''}{coded.toFixed(2)})
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alias structure hint for fractional designs */}
      {state.designOptions?.type === 'fractional-factorial-2kp' && (
        <div className="card">
          <div className="card-title">エイリアス構造（交絡関係）</div>
          <div className="section-desc">
            一部実施計画では、主効果と高次の交互作用が交絡（混同）しています。
            主効果は2因子交互作用と区別できない場合があります。
            重要な因子の同定後、確認実験を追加することを推奨します。
          </div>
        </div>
      )}
    </div>
  )
}
