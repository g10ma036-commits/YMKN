import React, { useState, lazy, Suspense, useCallback } from 'react'
import { useDOEContext } from '../../hooks/useDOEState'
import { predictAt } from '../../stats/fitting'

const Plot = lazy(() => import('react-plotly.js'))

export function OptimizationPage() {
  const { state, dispatch } = useDOEContext()

  if (state.fittedModels.length === 0) {
    return <div className="alert alert-warning">モデルがまだ解析されていません。Step 5を先に実行してください。</div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Step 7 ─ 予測・最適化</div>
          <div className="page-subtitle">因子を動かして応答を予測し、最適設定を探索します</div>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => dispatch({ type: 'NAVIGATE', stage: 'analysis' })}>
            ← 戻る
          </button>
          <button className="btn btn-success" onClick={() => dispatch({ type: 'RUN_OPTIMIZATION' })}>
            🔍 最適設定を探索
          </button>
        </div>
      </div>

      <PredictionProfiler />
      {state.optimizationResult && <OptimizationResult />}
      {state.fittedModels.length > 0 && state.factors.length >= 2 && <ContourPlotSection />}
    </div>
  )
}

function PredictionProfiler() {
  const { state } = useDOEContext()
  const [factorValues, setFactorValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    state.factors.forEach((f) => { init[f.id] = 0 })
    return init
  })

  function toNatural(f: typeof state.factors[0], coded: number) {
    const center = f.center ?? (f.low + f.high) / 2
    return center + coded * (f.high - f.low) / 2
  }

  return (
    <div className="card">
      <div className="card-title">予測プロファイラ</div>
      <div className="section-desc">スライダーで因子値を調整すると予測値がリアルタイムで更新されます</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Factor sliders */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>因子の設定値</div>
          {state.factors.map((f) => {
            const coded = factorValues[f.id] ?? 0
            const natural = toNatural(f, coded)
            return (
              <div key={f.id} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{f.name}</span>
                  <span style={{ fontSize: 13, color: '#1a56db', fontWeight: 600 }}>
                    {natural.toFixed(3)} {f.units}
                    <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>
                      (符号化: {coded >= 0 ? '+' : ''}{coded.toFixed(2)})
                    </span>
                  </span>
                </div>
                <div className="slider-wrap">
                  <span style={{ fontSize: 11, color: '#6b7280', minWidth: 40 }}>{f.low}</span>
                  <input
                    type="range" min={-1} max={1} step={0.01}
                    value={coded}
                    onChange={(e) => setFactorValues({ ...factorValues, [f.id]: parseFloat(e.target.value) })}
                  />
                  <span style={{ fontSize: 11, color: '#6b7280', minWidth: 40, textAlign: 'right' }}>{f.high}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Predictions */}
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>予測値</div>
          {state.fittedModels.map((model) => {
            const resp = state.responses.find((r) => r.id === model.spec.responseId)
            if (!resp) return null
            const { predicted } = predictAt(model, factorValues)
            return (
              <div key={resp.id} className="stat-box" style={{ marginBottom: 10 }}>
                <div className="stat-label">{resp.name}{resp.units ? ` (${resp.units})` : ''}</div>
                <div className="stat-value" style={{ fontSize: 24 }}>{predicted.toPrecision(5)}</div>
                <div className="stat-sub">
                  目標: {resp.goal === 'maximize' ? '最大化' : resp.goal === 'minimize' ? '最小化' : resp.goal === 'target' ? `目標値 ${resp.targetValue}` : '─'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function OptimizationResult() {
  const { state } = useDOEContext()
  const result = state.optimizationResult!

  return (
    <div className="card">
      <div className="card-title">最適解</div>
      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-box">
          <div className="stat-label">総合望ましさ D</div>
          <div className="stat-value"
            style={{ color: result.compositeDesirability > 0.7 ? '#057a55' : result.compositeDesirability > 0.4 ? '#b45309' : '#c81e1e' }}>
            {result.compositeDesirability.toFixed(4)}
          </div>
          <div className="stat-sub">{result.compositeDesirability > 0.7 ? '良好' : result.compositeDesirability > 0.4 ? '許容可' : '改善が必要'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>最適因子設定</div>
          <table className="data-table">
            <thead><tr><th>因子</th><th className="num">最適値</th><th className="num">符号化値</th></tr></thead>
            <tbody>
              {state.factors.map((f) => {
                const coded = result.optimalFactors[f.id] ?? 0
                const center = f.center ?? (f.low + f.high) / 2
                const natural = center + coded * (f.high - f.low) / 2
                return (
                  <tr key={f.id}>
                    <td>{f.name}</td>
                    <td className="num">{natural.toFixed(4)} {f.units}</td>
                    <td className="num">{coded.toFixed(4)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>予測応答値</div>
          <table className="data-table">
            <thead><tr><th>応答</th><th className="num">予測値</th><th className="num">望ましさ d</th></tr></thead>
            <tbody>
              {state.responses.map((r) => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td className="num">{(result.predictedResponses[r.id] ?? 0).toPrecision(5)}</td>
                  <td className="num">{(result.individualDesirability[r.id] ?? 0).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ContourPlotSection() {
  const { state } = useDOEContext()
  const [xFactor, setXFactor] = useState(state.factors[0]?.id ?? '')
  const [yFactor, setYFactor] = useState(state.factors[1]?.id ?? '')
  const [responseId, setResponseId] = useState(state.fittedModels[0]?.spec.responseId ?? '')

  const model = state.fittedModels.find((m) => m.spec.responseId === responseId)
  if (!model) return null

  const grid = 20
  const xs = Array.from({ length: grid }, (_, i) => -1 + (2 * i) / (grid - 1))
  const ys = Array.from({ length: grid }, (_, i) => -1 + (2 * i) / (grid - 1))

  const zData: number[][] = ys.map((yv) =>
    xs.map((xv) => {
      const fv: Record<string, number> = {}
      state.factors.forEach((f) => { fv[f.id] = 0 })
      fv[xFactor] = xv
      fv[yFactor] = yv
      return predictAt(model, fv).predicted
    })
  )

  const xf = state.factors.find(f => f.id === xFactor)
  const yf = state.factors.find(f => f.id === yFactor)
  const resp = state.responses.find(r => r.id === responseId)

  const xLabels = xs.map(v => {
    if (!xf) return v.toFixed(2)
    const c = xf.center ?? (xf.low + xf.high) / 2
    return (c + v * (xf.high - xf.low) / 2).toFixed(2)
  })
  const yLabels = ys.map(v => {
    if (!yf) return v.toFixed(2)
    const c = yf.center ?? (yf.low + yf.high) / 2
    return (c + v * (yf.high - yf.low) / 2).toFixed(2)
  })

  return (
    <div className="card">
      <div className="card-title">応答曲面（等高線プロット）</div>
      <div className="form-row" style={{ marginBottom: 12 }}>
        <div className="form-group">
          <label className="form-label">X軸 因子</label>
          <select className="form-select" value={xFactor} onChange={e => setXFactor(e.target.value)}>
            {state.factors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Y軸 因子</label>
          <select className="form-select" value={yFactor} onChange={e => setYFactor(e.target.value)}>
            {state.factors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">応答</label>
          <select className="form-select" value={responseId} onChange={e => setResponseId(e.target.value)}>
            {state.fittedModels.map(m => {
              const r = state.responses.find(r => r.id === m.spec.responseId)
              return r ? <option key={r.id} value={r.id}>{r.name}</option> : null
            })}
          </select>
        </div>
      </div>
      <Suspense fallback={<div>グラフ読み込み中...</div>}>
        <Plot
          data={[{
            type: 'contour',
            z: zData,
            x: xLabels,
            y: yLabels,
            colorscale: 'RdYlGn',
            contours: { showlabels: true },
            colorbar: { title: resp?.name ?? '応答' }
          }]}
          layout={{
            height: 420,
            margin: { l: 60, r: 20, t: 20, b: 60 },
            xaxis: { title: xf?.name ?? 'X' },
            yaxis: { title: yf?.name ?? 'Y' }
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: '100%' }}
        />
      </Suspense>
    </div>
  )
}
