import React, { useState } from 'react'
import { useDOEContext } from '../../hooks/useDOEState'
import { sigStars } from '../shared/SignificanceBadge'
import type { FittedModel, ModelSpec, ModelTerm } from '../../types/doe'
import { defaultModelTerms } from '../../stats/designs'

export function ModelFittingPage() {
  const { state, dispatch } = useDOEContext()
  const [activeTab, setActiveTab] = useState(state.responses[0]?.id ?? '')

  if (state.fittedModels.length === 0 && state.responses.length > 0) {
    return (
      <div>
        <div className="alert alert-warning">
          モデルがまだ解析されていません。前のステップで「解析実行」を押してください。
        </div>
        <button className="btn btn-primary" onClick={() => {
          state.responses.forEach((r) => dispatch({ type: 'FIT_MODEL', responseId: r.id }))
        }}>
          今すぐ解析
        </button>
      </div>
    )
  }

  const currentId = activeTab || state.responses[0]?.id
  const model = state.fittedModels.find((m) => m.spec.responseId === currentId)
  const response = state.responses.find((r) => r.id === currentId)

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Step 5 ─ モデルあてはめ結果</div>
          <div className="page-subtitle">最小二乗法による回帰モデルの係数推定</div>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => dispatch({ type: 'NAVIGATE', stage: 'response-entry' })}>
            ← 戻る
          </button>
          <button
            className="btn btn-primary"
            disabled={state.fittedModels.length === 0}
            onClick={() => dispatch({ type: 'NAVIGATE', stage: 'analysis' })}
          >
            次へ：診断 →
          </button>
        </div>
      </div>

      {state.responses.length > 1 && (
        <div className="tab-bar">
          {state.responses.map((r) => (
            <div
              key={r.id}
              className={`tab ${(activeTab || state.responses[0]?.id) === r.id ? 'active' : ''}`}
              onClick={() => setActiveTab(r.id)}
            >
              {r.name}
            </div>
          ))}
        </div>
      )}

      {model && response ? (
        <ModelPanel model={model} responseId={currentId} />
      ) : (
        <div className="alert alert-warning">この応答のモデルがまだ解析されていません。</div>
      )}
    </div>
  )
}

function ModelPanel({ model, responseId }: { model: FittedModel; responseId: string }) {
  const { state, dispatch } = useDOEContext()
  const response = state.responses.find((r) => r.id === responseId)!

  // Term selection state based on current spec
  const spec = state.modelSpecs.find((s) => s.responseId === responseId)
  const allTerms = defaultModelTerms(state.factors, state.designOptions?.type ?? 'full-factorial-2k')

  function toggleTerm(term: ModelTerm) {
    if (!spec) return
    const exists = spec.terms.some((t) => t.label === term.label)
    let newTerms: ModelTerm[]
    if (term.type === 'intercept') return // always included
    if (exists) {
      newTerms = spec.terms.filter((t) => t.label !== term.label)
    } else {
      newTerms = [...spec.terms, term]
    }
    const newSpec: ModelSpec = { ...spec, terms: newTerms }
    dispatch({ type: 'SET_MODEL_SPEC', spec: newSpec })
    dispatch({ type: 'FIT_MODEL', responseId })
  }

  return (
    <div>
      {/* Model summary */}
      <div className="stats-grid">
        <div className="stat-box">
          <div className="stat-label">R²</div>
          <div className="stat-value">{(model.rSquared * 100).toFixed(1)}%</div>
          <div className="stat-sub">決定係数</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">調整済み R²</div>
          <div className="stat-value">{(model.adjRSquared * 100).toFixed(1)}%</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">RMSE</div>
          <div className="stat-value">{model.rmse.toPrecision(4)}</div>
          <div className="stat-sub">残差の標準偏差</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">観測数</div>
          <div className="stat-value">{model.nObs}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">条件数</div>
          <div className="stat-value" style={{ color: model.conditionNumber > 30 ? '#c81e1e' : undefined }}>
            {model.conditionNumber > 1000 ? '>1000' : model.conditionNumber.toFixed(1)}
          </div>
          <div className="stat-sub">{model.conditionNumber > 30 ? '⚠ 多重共線性の恐れ' : '良好'}</div>
        </div>
      </div>

      {/* Term selection */}
      <div className="card">
        <div className="card-title">モデル項の選択</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {allTerms.filter((t) => t.type !== 'intercept').map((term) => {
            const active = spec?.terms.some((t) => t.label === term.label)
            return (
              <button
                key={term.label}
                className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => toggleTerm(term)}
              >
                {term.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Parameter estimates */}
      <div className="card">
        <div className="card-title">係数推定値</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>項</th>
              <th className="num">係数推定値</th>
              <th className="num">標準誤差</th>
              <th className="num">t値</th>
              <th className="num">p値</th>
              <th className="num">95%CI 下限</th>
              <th className="num">95%CI 上限</th>
              <th className="center">有意性</th>
            </tr>
          </thead>
          <tbody>
            {model.parameterEstimates.map((pe) => {
              const sig = pe.pValue < 0.05
              return (
                <tr key={pe.term.label} className={pe.pValue < 0.01 ? 'highly-sig' : pe.pValue < 0.05 ? 'sig' : ''}>
                  <td style={{ fontWeight: pe.term.type === 'intercept' ? 600 : 400 }}>
                    {pe.term.label}
                    {pe.aliased && <span style={{ color: '#c81e1e', marginLeft: 6 }}>⚠交絡</span>}
                  </td>
                  <td className="num" style={{ fontWeight: sig ? 600 : 400 }}>
                    {pe.estimate.toPrecision(5)}
                  </td>
                  <td className="num">{pe.stdError.toPrecision(4)}</td>
                  <td className="num">{pe.tStat.toFixed(3)}</td>
                  <td className="num" style={{ color: pe.pValue < 0.05 ? '#c81e1e' : undefined }}>
                    {pe.pValue < 0.0001 ? '<0.0001' : pe.pValue.toFixed(4)}
                  </td>
                  <td className="num">{pe.lowerCI95.toPrecision(4)}</td>
                  <td className="num">{pe.upperCI95.toPrecision(4)}</td>
                  <td className="center">
                    <span className="sig-star">{sigStars(pe.pValue)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
          有意水準: ★★★ p&lt;0.001  ★★ p&lt;0.01  ★ p&lt;0.05  . p&lt;0.1
        </div>
      </div>
    </div>
  )
}
