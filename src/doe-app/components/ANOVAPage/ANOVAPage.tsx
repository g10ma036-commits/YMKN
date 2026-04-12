import React, { useState, lazy, Suspense } from 'react'
import { useDOEContext } from '../../hooks/useDOEState'
import { sigStars } from '../shared/SignificanceBadge'
import { computeResidualDiagnostics } from '../../stats/residuals'

const Plot = lazy(() => import('react-plotly.js'))

export function ANOVAPage() {
  const { state, dispatch } = useDOEContext()
  const [activeTab, setActiveTab] = useState(state.responses[0]?.id ?? '')
  const [showResiduals, setShowResiduals] = useState(false)

  if (state.fittedModels.length === 0) {
    return <div className="alert alert-warning">モデルがまだ解析されていません。Step 5を先に実行してください。</div>
  }

  const currentId = activeTab || state.responses[0]?.id
  const model = state.fittedModels.find((m) => m.spec.responseId === currentId)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Step 6 ─ 分散分析・残差診断</div>
          <div className="page-subtitle">効果の有意性確認とモデルの妥当性検証</div>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => dispatch({ type: 'NAVIGATE', stage: 'model-fitting' })}>
            ← 戻る
          </button>
          <button className="btn btn-primary" onClick={() => dispatch({ type: 'NAVIGATE', stage: 'optimization' })}>
            次へ：最適化 →
          </button>
        </div>
      </div>

      {state.responses.length > 1 && (
        <div className="tab-bar">
          {state.responses.map((r) => (
            <div key={r.id} className={`tab ${currentId === r.id ? 'active' : ''}`}
              onClick={() => setActiveTab(r.id)}>{r.name}</div>
          ))}
        </div>
      )}

      <div className="tab-bar" style={{ marginTop: 0 }}>
        <div className={`tab ${!showResiduals ? 'active' : ''}`} onClick={() => setShowResiduals(false)}>分散分析表</div>
        <div className={`tab ${showResiduals ? 'active' : ''}`} onClick={() => setShowResiduals(true)}>残差診断</div>
      </div>

      {model && (
        <Suspense fallback={<div style={{ padding: 20 }}>グラフ読み込み中...</div>}>
          {!showResiduals ? <ANOVAPanel model={model} /> : <ResidualPanel model={model} />}
        </Suspense>
      )}
    </div>
  )
}

function ANOVAPanel({ model }: { model: import('../../types/doe').FittedModel }) {
  const { anovaTable } = model
  const effectsForPareto = model.parameterEstimates
    .filter((p) => p.term.type !== 'intercept')
    .map((p) => ({ label: p.term.label, abs: Math.abs(p.tStat), pValue: p.pValue }))
    .sort((a, b) => b.abs - a.abs)

  return (
    <div>
      <div className="card">
        <div className="card-title">分散分析表 (ANOVA)</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>変動要因</th>
              <th className="num">平方和 (SS)</th>
              <th className="num">自由度 (df)</th>
              <th className="num">平均平方 (MS)</th>
              <th className="num">F値</th>
              <th className="num">p値</th>
              <th className="center">有意性</th>
            </tr>
          </thead>
          <tbody>
            {anovaTable.rows.map((row) => (
              <tr key={row.source}
                className={row.pValue !== null && row.pValue < 0.01 ? 'highly-sig' : row.pValue !== null && row.pValue < 0.05 ? 'sig' : ''}>
                <td style={{ fontWeight: row.source === '合計' ? 700 : 400 }}>{row.source}</td>
                <td className="num">{row.sumOfSquares.toFixed(4)}</td>
                <td className="num">{row.df}</td>
                <td className="num">{row.meanSquare.toFixed(4)}</td>
                <td className="num">{row.fStat !== null ? row.fStat.toFixed(3) : '─'}</td>
                <td className="num" style={{ color: row.pValue !== null && row.pValue < 0.05 ? '#c81e1e' : undefined }}>
                  {row.pValue !== null ? (row.pValue < 0.0001 ? '<0.0001' : row.pValue.toFixed(4)) : '─'}
                </td>
                <td className="center"><span className="sig-star">{sigStars(row.pValue)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {effectsForPareto.length > 0 && (
        <div className="card">
          <div className="card-title">効果のパレート図（|t値|）</div>
          <Suspense fallback={<div>読み込み中...</div>}>
            <Plot
              data={[{
                type: 'bar',
                orientation: 'h',
                y: effectsForPareto.map((e) => e.label),
                x: effectsForPareto.map((e) => e.abs),
                marker: { color: effectsForPareto.map((e) => e.pValue < 0.05 ? '#c81e1e' : '#93c5fd') }
              }]}
              layout={{
                height: Math.max(200, effectsForPareto.length * 32 + 60),
                margin: { l: 100, r: 20, t: 20, b: 40 },
                xaxis: { title: '|t値|', zeroline: true },
                shapes: [{ type: 'line', x0: 2, x1: 2, y0: -0.5, y1: effectsForPareto.length - 0.5, line: { color: 'red', dash: 'dot', width: 1 } }],
                annotations: [{ x: 2, y: effectsForPareto.length - 1, text: 't=2', showarrow: false, font: { color: 'red', size: 11 } }]
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: '100%' }}
            />
          </Suspense>
        </div>
      )}
    </div>
  )
}

function ResidualPanel({ model }: { model: import('../../types/doe').FittedModel }) {
  const { state } = useDOEContext()
  const runOrders = state.designRuns
    .filter((r) => {
      const respId = model.spec.responseId
      return r.responses[respId] !== null && r.responses[respId] !== undefined
    })
    .sort((a, b) => a.runOrder - b.runOrder)
    .map((r) => r.runOrder)

  const diag = computeResidualDiagnostics(model, runOrders)
  const n = diag.residuals.length
  const threshold4n = 4 / n

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Residuals vs Fitted */}
      <div className="card">
        <div className="card-title">残差 vs 予測値</div>
        <Suspense fallback={<div>読み込み中...</div>}>
          <Plot
            data={[{
              type: 'scatter', mode: 'markers',
              x: diag.fittedValues, y: diag.studentizedResiduals,
              marker: { color: diag.studentizedResiduals.map(r => Math.abs(r) > 3 ? '#c81e1e' : '#1a56db'), size: 7 },
              text: runOrders.map(r => `Run ${r}`)
            }]}
            layout={{
              height: 280, margin: { l: 50, r: 20, t: 10, b: 50 },
              xaxis: { title: '予測値' }, yaxis: { title: 'スチューデント化残差', zeroline: true },
              shapes: [
                { type: 'line', x0: Math.min(...diag.fittedValues), x1: Math.max(...diag.fittedValues), y0: 3, y1: 3, line: { color: 'red', dash: 'dot', width: 1 } },
                { type: 'line', x0: Math.min(...diag.fittedValues), x1: Math.max(...diag.fittedValues), y0: -3, y1: -3, line: { color: 'red', dash: 'dot', width: 1 } }
              ]
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        </Suspense>
      </div>

      {/* Normal QQ */}
      <div className="card">
        <div className="card-title">正規確率プロット</div>
        <Suspense fallback={<div>読み込み中...</div>}>
          <Plot
            data={[
              {
                type: 'scatter', mode: 'markers',
                x: diag.normalQuantiles,
                y: [...diag.studentizedResiduals].sort((a, b) => a - b),
                marker: { color: '#1a56db', size: 7 }
              },
              {
                type: 'scatter', mode: 'lines',
                x: [-3, 3], y: [-3, 3],
                line: { color: 'red', dash: 'dot', width: 1 },
                showlegend: false
              }
            ]}
            layout={{
              height: 280, margin: { l: 50, r: 20, t: 10, b: 50 },
              xaxis: { title: '理論正規分位点' },
              yaxis: { title: 'スチューデント化残差' }
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        </Suspense>
      </div>

      {/* Residuals vs Run Order */}
      <div className="card">
        <div className="card-title">残差 vs 実行順序</div>
        <Suspense fallback={<div>読み込み中...</div>}>
          <Plot
            data={[{
              type: 'scatter', mode: 'lines+markers',
              x: runOrders, y: diag.residuals,
              marker: { color: '#1a56db', size: 6 }, line: { color: '#93c5fd', width: 1 }
            }]}
            layout={{
              height: 280, margin: { l: 50, r: 20, t: 10, b: 50 },
              xaxis: { title: '実行順序' }, yaxis: { title: '残差', zeroline: true }
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        </Suspense>
      </div>

      {/* Cook's Distance */}
      <div className="card">
        <div className="card-title">Cook距離</div>
        <Suspense fallback={<div>読み込み中...</div>}>
          <Plot
            data={[{
              type: 'bar',
              x: runOrders,
              y: diag.cookDistances,
              marker: { color: diag.cookDistances.map(d => d > threshold4n ? '#c81e1e' : '#93c5fd') }
            }]}
            layout={{
              height: 280, margin: { l: 50, r: 20, t: 10, b: 50 },
              xaxis: { title: '標準順序' }, yaxis: { title: "Cook's D" },
              shapes: [{ type: 'line', x0: Math.min(...runOrders) - 0.5, x1: Math.max(...runOrders) + 0.5, y0: threshold4n, y1: threshold4n, line: { color: 'red', dash: 'dot', width: 1 } }]
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: '100%' }}
          />
        </Suspense>
      </div>
    </div>
  )
}
