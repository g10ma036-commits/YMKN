import { createContext, useContext, useReducer, type Dispatch } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { DOEState, DOEAction, Factor, Response } from '../types/doe'
import { generateDesign, defaultModelTerms } from '../stats/designs'
import { fitModel } from '../stats/fitting'
import { computeResidualDiagnostics } from '../stats/residuals'
import { optimizeDesirability } from '../stats/optimizer'

// ─── Initial state ────────────────────────────────────────────────────────────

export const initialState: DOEState = {
  stage: 'factor-setup',
  projectName: '新しいDOEプロジェクト',
  factors: [],
  responses: [],
  designOptions: null,
  designRuns: [],
  modelSpecs: [],
  fittedModels: [],
  optimizationResult: null,
  savedAt: null
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

export function doeReducer(state: DOEState, action: DOEAction): DOEState {
  switch (action.type) {
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.name }

    case 'ADD_FACTOR':
      return { ...state, factors: [...state.factors, action.factor] }

    case 'UPDATE_FACTOR':
      return {
        ...state,
        factors: state.factors.map((f) =>
          f.id === action.id ? { ...f, ...action.updates } : f
        )
      }

    case 'REMOVE_FACTOR':
      return { ...state, factors: state.factors.filter((f) => f.id !== action.id) }

    case 'ADD_RESPONSE':
      return { ...state, responses: [...state.responses, action.response] }

    case 'UPDATE_RESPONSE':
      return {
        ...state,
        responses: state.responses.map((r) =>
          r.id === action.id ? { ...r, ...action.updates } : r
        )
      }

    case 'REMOVE_RESPONSE':
      return { ...state, responses: state.responses.filter((r) => r.id !== action.id) }

    case 'SET_DESIGN_OPTIONS':
      return { ...state, designOptions: action.options }

    case 'GENERATE_DESIGN': {
      if (!state.designOptions || state.factors.length === 0) return state
      try {
        const runs = generateDesign(state.factors, state.responses, state.designOptions)
        const terms = defaultModelTerms(state.factors, state.designOptions.type)
        const modelSpecs = state.responses.map((r) => ({
          responseId: r.id,
          terms
        }))
        return { ...state, designRuns: runs, modelSpecs, fittedModels: [], optimizationResult: null }
      } catch (e) {
        console.error('Design generation error:', e)
        return state
      }
    }

    case 'RANDOMIZE_RUNS': {
      const shuffled = [...state.designRuns].sort(() => Math.random() - 0.5)
      return { ...state, designRuns: shuffled.map((r, i) => ({ ...r, runOrder: i + 1 })) }
    }

    case 'UPDATE_RUN_RESPONSE': {
      const runs = state.designRuns.map((r) =>
        r.stdOrder === action.stdOrder
          ? { ...r, responses: { ...r.responses, [action.responseId]: action.value } }
          : r
      )
      return { ...state, designRuns: runs }
    }

    case 'IMPORT_RESPONSES': {
      const runs = state.designRuns.map((r) => {
        const rowData = action.data[r.stdOrder]
        if (!rowData) return r
        return { ...r, responses: { ...r.responses, ...rowData } }
      })
      return { ...state, designRuns: runs }
    }

    case 'SET_MODEL_SPEC': {
      const specs = state.modelSpecs.map((s) =>
        s.responseId === action.spec.responseId ? action.spec : s
      )
      if (!specs.find((s) => s.responseId === action.spec.responseId)) {
        specs.push(action.spec)
      }
      return { ...state, modelSpecs: specs }
    }

    case 'FIT_MODEL': {
      const spec = state.modelSpecs.find((s) => s.responseId === action.responseId)
      const response = state.responses.find((r) => r.id === action.responseId)
      if (!spec || !response) return state
      try {
        const fitted = fitModel(state.designRuns, response, spec, state.factors)
        const runOrders = state.designRuns
          .filter((r) => r.responses[response.id] !== null)
          .map((r) => r.runOrder)
        // diagnostics stored on FittedModel itself via fields
        const updatedModels = [
          ...state.fittedModels.filter((m) => m.spec.responseId !== action.responseId),
          fitted
        ]
        return { ...state, fittedModels: updatedModels }
      } catch (e) {
        console.error('Model fitting error:', e)
        return state
      }
    }

    case 'RUN_OPTIMIZATION': {
      if (state.fittedModels.length === 0) return state
      try {
        const result = optimizeDesirability(
          state.fittedModels,
          state.responses,
          state.factors.map((f) => f.id)
        )
        return { ...state, optimizationResult: result }
      } catch (e) {
        console.error('Optimization error:', e)
        return state
      }
    }

    case 'NAVIGATE':
      return { ...state, stage: action.stage }

    case 'LOAD_PROJECT':
      return action.state

    case 'NEW_PROJECT':
      return { ...initialState, projectName: '新しいDOEプロジェクト' }

    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface DOEContextValue {
  state: DOEState
  dispatch: Dispatch<DOEAction>
}

export const DOEContext = createContext<DOEContextValue>({
  state: initialState,
  dispatch: () => {}
})

export function useDOEContext(): DOEContextValue {
  return useContext(DOEContext)
}

// ─── Helper to create new factor/response ────────────────────────────────────

export function newFactor(index: number): Factor {
  return {
    id: uuidv4(),
    name: `因子${index + 1}`,
    symbol: `X${index + 1}`,
    type: 'continuous',
    low: -1,
    high: 1,
    units: ''
  }
}

export function newResponse(index: number): Response {
  return {
    id: uuidv4(),
    name: `応答${index + 1}`,
    units: '',
    goal: 'maximize',
    weight: 1
  }
}
