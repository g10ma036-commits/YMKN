import React, { useState } from 'react'
import { useDOEContext } from '../../hooks/useDOEState'
import type { DesignType, DesignOptions } from '../../types/doe'

interface DesignCard {
  type: DesignType
  title: string
  desc: string
  recommend?: string
  minFactors: number
  maxFactors: number
  runCount: (k: number, opts: DesignOptions) => number
}

const DESIGNS: DesignCard[] = [
  {
    type: 'full-factorial-2k',
    title: '完全実施計画 2ᵏ',
    desc: '全ての因子の組み合わせを実験。最も情報量が多い。',
    recommend: '因子数2〜4、初心者向け',
    minFactors: 2, maxFactors: 6,
    runCount: (k) => Math.pow(2, k)
  },
  {
    type: 'fractional-factorial-2kp',
    title: '一部実施計画 2ᵏ⁻ᵖ',
    desc: '完全実施の一部のみ実施。ラン数を削減できる。',
    recommend: '因子数5以上のスクリーニング',
    minFactors: 3, maxFactors: 8,
    runCount: (k) => {
      const p = k <= 5 ? 1 : 2
      return Math.pow(2, k - p)
    }
  },
  {
    type: 'central-composite',
    title: '中心合成計画 (CCD)',
    desc: '因子点・軸点・中心点で2次モデルを推定。RSMに最適。',
    recommend: '最適化・2次モデルが必要な場合',
    minFactors: 2, maxFactors: 6,
    runCount: (k, opts) => Math.pow(2, k) + 2 * k + (opts.centerRuns ?? 3)
  },
  {
    type: 'box-behnken',
    title: 'Box-Behnken計画',
    desc: '辺の中点のみ使用。極端な因子値の組み合わせを避けられる。',
    recommend: '因子3〜5の2次モデル推定',
    minFactors: 3, maxFactors: 5,
    runCount: (k, opts) => {
      const base = k === 3 ? 12 : k === 4 ? 24 : 40
      return base + (opts.centerRuns ?? 3)
    }
  },
  {
    type: 'd-optimal',
    title: 'D最適計画',
    desc: 'D効率を最大化するコンピュータ生成の計画。制約がある場合に有効。',
    recommend: '不規則な実験条件・制約あり',
    minFactors: 2, maxFactors: 12,
    runCount: (_, opts) => opts.dOptimalRuns ?? 12
  },
  {
    type: 'definitive-screening',
    title: '確定的スクリーニング計画',
    desc: '少ないランで主効果・2次効果が推定可能。多因子のスクリーニングに最適。',
    recommend: '因子数3〜7の効率的スクリーニング',
    minFactors: 3, maxFactors: 7,
    runCount: (k) => 2 * (k + 1) + 1
  },
]

export function DesignSelectionPage() {
  const { state, dispatch } = useDOEContext()
  const k = state.factors.length
  const [opts, setOpts] = useState<DesignOptions>(
    state.designOptions ?? { type: 'full-factorial-2k', centerRuns: 3, randomize: true }
  )

  const selected = DESIGNS.find((d) => d.type === opts.type)
  const runCount = selected ? selected.runCount(k, opts) : 0
  const canGenerate = selected && k >= selected.minFactors && k <= selected.maxFactors

  function handleGenerate() {
    dispatch({ type: 'SET_DESIGN_OPTIONS', options: opts })
    dispatch({ type: 'GENERATE_DESIGN' })
    dispatch({ type: 'NAVIGATE', stage: 'design-review' })
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Step 2 ─ 実験計画の選択</div>
          <div className="page-subtitle">実験の目的に合った計画タイプを選んでください（因子数: {k}）</div>
        </div>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={() => dispatch({ type: 'NAVIGATE', stage: 'factor-setup' })}>
            ← 戻る
          </button>
          <button className="btn btn-primary" disabled={!canGenerate} onClick={handleGenerate}>
            計画を生成 →
          </button>
        </div>
      </div>

      <div className="design-grid">
        {DESIGNS.map((d) => {
          const disabled = k < d.minFactors || k > d.maxFactors
          return (
            <div
              key={d.type}
              className={`design-card ${opts.type === d.type ? 'selected' : ''} ${disabled ? 'pending' : ''}`}
              style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
              onClick={() => !disabled && setOpts({ ...opts, type: d.type })}
            >
              <div className="design-card-title">{d.title}</div>
              <div className="design-card-desc">{d.desc}</div>
              {d.recommend && (
                <div className="design-card-desc" style={{ marginTop: 4, color: '#1a56db' }}>
                  💡 {d.recommend}
                </div>
              )}
              <div className="design-card-runs">
                予定ラン数: {d.runCount(k, opts)}
              </div>
              {disabled && (
                <div style={{ fontSize: 11, color: '#c81e1e', marginTop: 4 }}>
                  {k < d.minFactors ? `${d.minFactors}因子以上必要` : `${d.maxFactors}因子以下必要`}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Options panel */}
      {selected && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title">計画オプション</div>
          <div className="form-row">
            {(opts.type === 'central-composite' || opts.type === 'box-behnken') && (
              <div className="form-group">
                <label className="form-label">中心点の繰り返し数</label>
                <input
                  className="form-input form-input-sm" type="number" min={1} max={10}
                  value={opts.centerRuns ?? 3}
                  onChange={(e) => setOpts({ ...opts, centerRuns: parseInt(e.target.value) || 3 })}
                />
              </div>
            )}
            {opts.type === 'central-composite' && (
              <div className="form-group">
                <label className="form-label">CCD タイプ</label>
                <select className="form-select"
                  value={opts.ccdVariant ?? 'circumscribed'}
                  onChange={(e) => setOpts({ ...opts, ccdVariant: e.target.value as DesignOptions['ccdVariant'] })}>
                  <option value="circumscribed">外接型 (CCC) – 回転可能</option>
                  <option value="faced">面中心型 (CCF)</option>
                  <option value="inscribed">内接型 (CCI)</option>
                </select>
              </div>
            )}
            {opts.type === 'd-optimal' && (
              <div className="form-group">
                <label className="form-label">ラン数</label>
                <input
                  className="form-input form-input-sm" type="number" min={k + 2} max={200}
                  value={opts.dOptimalRuns ?? Math.max(10, 2 * k + 3)}
                  onChange={(e) => setOpts({ ...opts, dOptimalRuns: parseInt(e.target.value) || 10 })}
                />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">実行順序のランダム化</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, height: 32 }}>
                <input type="checkbox" checked={opts.randomize !== false}
                  onChange={(e) => setOpts({ ...opts, randomize: e.target.checked })} />
                <span style={{ fontSize: 13 }}>ランダム化する（推奨）</span>
              </div>
            </div>
          </div>

          <div className="stats-grid" style={{ marginTop: 12 }}>
            <div className="stat-box">
              <div className="stat-label">総ラン数</div>
              <div className="stat-value">{runCount}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">因子数</div>
              <div className="stat-value">{k}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">応答数</div>
              <div className="stat-value">{state.responses.length}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
