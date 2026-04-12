import React from 'react'
import type { WorkflowStage } from '../../types/doe'

const STEPS: { key: WorkflowStage; label: string }[] = [
  { key: 'factor-setup',      label: '因子・応答' },
  { key: 'design-selection',  label: '計画選択' },
  { key: 'design-review',     label: '計画確認' },
  { key: 'response-entry',    label: '応答入力' },
  { key: 'model-fitting',     label: 'モデル解析' },
  { key: 'analysis',          label: '診断' },
  { key: 'optimization',      label: '最適化' },
]

interface Props {
  current: WorkflowStage
  completed: WorkflowStage[]
  onNavigate: (stage: WorkflowStage) => void
}

export function WorkflowStepper({ current, completed, onNavigate }: Props) {
  return (
    <div className="stepper">
      {STEPS.map((step, i) => {
        const isDone = completed.includes(step.key)
        const isActive = step.key === current
        const cls = `step-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''} ${!isDone && !isActive ? 'pending' : ''}`
        return (
          <React.Fragment key={step.key}>
            {i > 0 && <span className="step-arrow">›</span>}
            <div className={cls} onClick={() => isDone && onNavigate(step.key)}>
              <span className="step-num">{isDone && !isActive ? '✓' : i + 1}</span>
              {step.label}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
