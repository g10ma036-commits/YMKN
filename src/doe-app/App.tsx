import React, { lazy, Suspense } from 'react'
import { useDOEContext } from './hooks/useDOEState'
import { WorkflowStepper } from './components/shared/WorkflowStepper'
import { FactorSetupPage } from './components/FactorSetupPage/FactorSetupPage'
import { DesignSelectionPage } from './components/DesignSelectionPage/DesignSelectionPage'
import { DesignMatrixPage } from './components/DesignMatrixPage/DesignMatrixPage'
import { ResponseEntryPage } from './components/ResponseEntryPage/ResponseEntryPage'
import { ModelFittingPage } from './components/ModelFittingPage/ModelFittingPage'
import { exportProject, importProject, exportDesignCSV } from './utils/projectIO'
import type { WorkflowStage } from './types/doe'

const ANOVAPage = lazy(() => import('./components/ANOVAPage/ANOVAPage').then(m => ({ default: m.ANOVAPage })))
const OptimizationPage = lazy(() => import('./components/OptimizationPage/OptimizationPage').then(m => ({ default: m.OptimizationPage })))

const STAGE_ORDER: WorkflowStage[] = [
  'factor-setup', 'design-selection', 'design-review',
  'response-entry', 'model-fitting', 'analysis', 'optimization'
]

function getCompleted(current: WorkflowStage): WorkflowStage[] {
  const idx = STAGE_ORDER.indexOf(current)
  return STAGE_ORDER.slice(0, idx) as WorkflowStage[]
}

export function App() {
  const { state, dispatch } = useDOEContext()

  function handleLoad() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,.doe.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const result = importProject(ev.target?.result as string)
        if (result) dispatch({ type: 'LOAD_PROJECT', state: result })
        else alert('プロジェクトファイルの読み込みに失敗しました。')
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const completed = getCompleted(state.stage)

  return (
    <div className="app-shell">
      <div className="top-bar">
        <h1>⚗ DOE アナリスト</h1>
        <input
          className="form-input"
          style={{ width: 200, background: 'rgba(255,255,255,.15)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}
          value={state.projectName}
          onChange={(e) => dispatch({ type: 'SET_PROJECT_NAME', name: e.target.value })}
          placeholder="プロジェクト名"
        />
        <span className="spacer" />
        <button className="btn btn-secondary btn-sm" onClick={() => exportDesignCSV(state)}>
          CSV出力
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => exportProject(state)}>
          保存
        </button>
        <button className="btn btn-secondary btn-sm" onClick={handleLoad}>
          読込
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => {
          if (confirm('新しいプロジェクトを開始しますか？現在の内容は上書きされます。')) {
            dispatch({ type: 'NEW_PROJECT' })
          }
        }}>
          新規
        </button>
      </div>

      <WorkflowStepper
        current={state.stage}
        completed={completed}
        onNavigate={(s) => dispatch({ type: 'NAVIGATE', stage: s })}
      />

      <div className="main-content">
        <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>読み込み中...</div>}>
          {state.stage === 'factor-setup'     && <FactorSetupPage />}
          {state.stage === 'design-selection' && <DesignSelectionPage />}
          {state.stage === 'design-review'    && <DesignMatrixPage />}
          {state.stage === 'response-entry'   && <ResponseEntryPage />}
          {state.stage === 'model-fitting'    && <ModelFittingPage />}
          {state.stage === 'analysis'         && <ANOVAPage />}
          {state.stage === 'optimization'     && <OptimizationPage />}
        </Suspense>
      </div>
    </div>
  )
}
