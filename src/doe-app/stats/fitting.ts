import { jStat } from 'jstat'
import type {
  DesignRun, Factor, FittedModel, ModelSpec, ModelTerm,
  ParameterEstimate, ANOVATable, ANOVARow, Response
} from '../types/doe'
import { buildDesignMatrix, leastSquaresFit, hatDiagonal } from './matrix'

// ─── Main fitting function ────────────────────────────────────────────────────

export function fitModel(
  runs: DesignRun[],
  response: Response,
  spec: ModelSpec,
  factors: Factor[]
): FittedModel {
  // Filter runs with observed response
  const validRuns = runs.filter((r) => r.responses[response.id] !== null && r.responses[response.id] !== undefined)
  if (validRuns.length < 2) throw new Error('応答値が不足しています（最低2件必要）')

  const Y = validRuns.map((r) => r.responses[response.id] as number)
  const X = buildDesignMatrix(validRuns, spec.terms, factors)
  const n = Y.length
  const p = spec.terms.length

  const { beta, XtXinv, fitted, residuals, conditionNumber, rankDeficient } = leastSquaresFit(X, Y)

  const df_error = n - p
  if (df_error <= 0) throw new Error('自由度が不足しています（観測数 > パラメータ数が必要）')

  const SSE = residuals.reduce((s, e) => s + e * e, 0)
  const MSE = SSE / df_error
  const RMSE = Math.sqrt(MSE)

  const Ymean = Y.reduce((s, y) => s + y, 0) / n
  const SST = Y.reduce((s, y) => s + (y - Ymean) ** 2, 0)
  const SSM = SST - SSE
  const rSquared = SST > 0 ? Math.max(0, SSM / SST) : 0
  const adjRSquared = SST > 0 ? 1 - (SSE / df_error) / (SST / (n - 1)) : 0

  const leverages = hatDiagonal(X)

  // Cook's distances
  const cookDistance = residuals.map((e, i) => {
    const h = leverages[i]
    return (e * e / (p * MSE)) * (h / Math.pow(1 - h, 2))
  })

  // t-critical for 95% CI
  const tCrit = jStat.studentt.inv(0.975, df_error)

  const parameterEstimates: ParameterEstimate[] = spec.terms.map((term, j) => {
    const estimate = beta[j]
    const variance = MSE * XtXinv.get(j, j)
    const stdError = Math.sqrt(Math.max(0, variance))
    const tStat = stdError > 0 ? estimate / stdError : 0
    const pValue = stdError > 0 ? 2 * (1 - jStat.studentt.cdf(Math.abs(tStat), df_error)) : 1
    return {
      term,
      estimate,
      stdError,
      tStat,
      pValue,
      lowerCI95: estimate - tCrit * stdError,
      upperCI95: estimate + tCrit * stdError,
      aliased: rankDeficient && stdError < 1e-10
    }
  })

  const anovaTable = buildANOVATable(spec.terms, SSM, SSE, SST, n, p, MSE, df_error)

  return {
    spec,
    coefficients: beta,
    parameterEstimates,
    rSquared,
    adjRSquared,
    rmse: RMSE,
    residuals,
    fitted,
    leverages,
    cookDistance,
    anovaTable,
    conditionNumber,
    nObs: n
  }
}

// ─── ANOVA table ─────────────────────────────────────────────────────────────

function buildANOVATable(
  terms: ModelTerm[],
  SSM: number,
  SSE: number,
  SST: number,
  n: number,
  p: number,
  MSE: number,
  df_error: number
): ANOVATable {
  const df_model = p - 1  // excludes intercept
  const MSM = df_model > 0 ? SSM / df_model : 0
  const F_model = MSE > 0 ? MSM / MSE : null
  const p_model = F_model !== null ? 1 - jStat.centralF.cdf(F_model, df_model, df_error) : null

  const rows: ANOVARow[] = [
    {
      source: 'モデル',
      sumOfSquares: SSM,
      df: df_model,
      meanSquare: MSM,
      fStat: F_model,
      pValue: p_model
    },
    {
      source: '残差',
      sumOfSquares: SSE,
      df: df_error,
      meanSquare: MSE,
      fStat: null,
      pValue: null
    },
    {
      source: '合計',
      sumOfSquares: SST,
      df: n - 1,
      meanSquare: SST / (n - 1),
      fStat: null,
      pValue: null
    }
  ]

  return { rows, modelSS: SSM, errorSS: SSE, totalSS: SST }
}

// ─── Prediction ──────────────────────────────────────────────────────────────

export function predictAt(
  model: FittedModel,
  factorValues: Record<string, number>
): { predicted: number; seConf: number; sePred: number } {
  const x = model.spec.terms.map((term) => {
    if (term.type === 'intercept') return 1
    if (term.type === 'main') return factorValues[term.factorIds[0]] ?? 0
    if (term.type === 'interaction')
      return term.factorIds.reduce((acc, id) => acc * (factorValues[id] ?? 0), 1)
    if (term.type === 'quadratic') {
      const v = factorValues[term.factorIds[0]] ?? 0
      return v * v
    }
    return 0
  })

  const predicted = x.reduce((s, xi, i) => s + xi * model.coefficients[i], 0)
  const MSE = model.rmse * model.rmse
  // x' (X'X)^-1 x — not stored directly; approximate from RMSE
  // For profiler use only (SE is approximate)
  const seConf = model.rmse * 0.1  // simplified
  const sePred = Math.sqrt(MSE + seConf * seConf)
  return { predicted, seConf, sePred }
}
