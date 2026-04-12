import React from 'react'
import { useDOEContext, newFactor, newResponse } from '../../hooks/useDOEState'
import type { Factor, Response } from '../../types/doe'

export function FactorSetupPage() {
  const { state, dispatch } = useDOEContext()

  const canProceed = state.factors.length >= 2 && state.responses.length >= 1

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Step 1 ─ 因子と応答の設定</div>
          <div className="page-subtitle">実験で変化させる因子と測定する応答を定義します</div>
        </div>
        <button
          className="btn btn-primary"
          disabled={!canProceed}
          onClick={() => dispatch({ type: 'NAVIGATE', stage: 'design-selection' })}
        >
          次へ：計画選択 →
        </button>
      </div>

      {!canProceed && (
        <div className="alert alert-info">
          因子を2つ以上、応答を1つ以上追加してください。
        </div>
      )}

      {/* Factors */}
      <div className="card">
        <div className="card-title">因子（制御変数）</div>
        <div className="section-desc">実験で変化させる入力変数です。連続変数の場合は低・高の値を入力してください。</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>名前</th><th>記号</th><th>タイプ</th>
              <th>低値</th><th>高値</th><th>単位</th><th></th>
            </tr>
          </thead>
          <tbody>
            {state.factors.map((f) => (
              <FactorRow key={f.id} factor={f} />
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12 }}>
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'ADD_FACTOR', factor: newFactor(state.factors.length) })}
          >
            + 因子を追加
          </button>
        </div>
      </div>

      {/* Responses */}
      <div className="card">
        <div className="card-title">応答（測定値）</div>
        <div className="section-desc">実験で測定する出力変数です。最適化の目標（最大化・最小化・目標値）を指定できます。</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>名前</th><th>単位</th><th>目標</th>
              <th>下限</th><th>上限</th><th>目標値</th><th></th>
            </tr>
          </thead>
          <tbody>
            {state.responses.map((r) => (
              <ResponseRow key={r.id} response={r} />
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12 }}>
          <button
            className="btn btn-secondary"
            onClick={() => dispatch({ type: 'ADD_RESPONSE', response: newResponse(state.responses.length) })}
          >
            + 応答を追加
          </button>
        </div>
      </div>
    </div>
  )
}

function FactorRow({ factor }: { factor: Factor }) {
  const { dispatch } = useDOEContext()
  const upd = (updates: Partial<Factor>) => dispatch({ type: 'UPDATE_FACTOR', id: factor.id, updates })

  return (
    <tr>
      <td>
        <input className="form-input form-input-wide" value={factor.name}
          onChange={(e) => upd({ name: e.target.value })} />
      </td>
      <td>
        <input className="form-input form-input-sm" value={factor.symbol}
          onChange={(e) => upd({ symbol: e.target.value })} />
      </td>
      <td>
        <select className="form-select" value={factor.type}
          onChange={(e) => upd({ type: e.target.value as Factor['type'] })}>
          <option value="continuous">連続</option>
          <option value="categorical">カテゴリ</option>
          <option value="blocking">ブロック</option>
        </select>
      </td>
      <td>
        <input className="form-input form-input-num" type="number" value={factor.low}
          onChange={(e) => upd({ low: parseFloat(e.target.value) || 0 })} />
      </td>
      <td>
        <input className="form-input form-input-num" type="number" value={factor.high}
          onChange={(e) => upd({ high: parseFloat(e.target.value) || 0 })} />
      </td>
      <td>
        <input className="form-input form-input-sm" value={factor.units ?? ''}
          onChange={(e) => upd({ units: e.target.value })} />
      </td>
      <td>
        <button className="btn btn-danger btn-sm btn-icon"
          onClick={() => dispatch({ type: 'REMOVE_FACTOR', id: factor.id })}>✕</button>
      </td>
    </tr>
  )
}

function ResponseRow({ response }: { response: Response }) {
  const { dispatch } = useDOEContext()
  const upd = (updates: Partial<Response>) => dispatch({ type: 'UPDATE_RESPONSE', id: response.id, updates })

  return (
    <tr>
      <td>
        <input className="form-input form-input-wide" value={response.name}
          onChange={(e) => upd({ name: e.target.value })} />
      </td>
      <td>
        <input className="form-input form-input-sm" value={response.units ?? ''}
          onChange={(e) => upd({ units: e.target.value })} />
      </td>
      <td>
        <select className="form-select" value={response.goal}
          onChange={(e) => upd({ goal: e.target.value as Response['goal'] })}>
          <option value="maximize">最大化</option>
          <option value="minimize">最小化</option>
          <option value="target">目標値</option>
          <option value="none">なし</option>
        </select>
      </td>
      <td>
        <input className="form-input form-input-num" type="number"
          value={response.lowerBound ?? ''}
          placeholder="下限"
          onChange={(e) => upd({ lowerBound: e.target.value ? parseFloat(e.target.value) : undefined })} />
      </td>
      <td>
        <input className="form-input form-input-num" type="number"
          value={response.upperBound ?? ''}
          placeholder="上限"
          onChange={(e) => upd({ upperBound: e.target.value ? parseFloat(e.target.value) : undefined })} />
      </td>
      <td>
        <input className="form-input form-input-num" type="number"
          value={response.targetValue ?? ''}
          placeholder="目標"
          onChange={(e) => upd({ targetValue: e.target.value ? parseFloat(e.target.value) : undefined })} />
      </td>
      <td>
        <button className="btn btn-danger btn-sm btn-icon"
          onClick={() => dispatch({ type: 'REMOVE_RESPONSE', id: response.id })}>✕</button>
      </td>
    </tr>
  )
}
