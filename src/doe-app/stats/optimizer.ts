import type { FittedModel, Response, OptimizationResult } from '../types/doe'
import { predictAt } from './fitting'

// ─── Derringer-Suich desirability ────────────────────────────────────────────

function individualDesirability(predicted: number, response: Response): number {
  const { goal, lowerBound: L, upperBound: U, targetValue: T, weight: w = 1 } = response
  if (goal === 'none') return 1

  if (goal === 'maximize') {
    if (L === undefined || U === undefined) return 0.5
    if (predicted <= L) return 0
    if (predicted >= U) return 1
    return Math.pow((predicted - L) / (U - L), w)
  }

  if (goal === 'minimize') {
    if (L === undefined || U === undefined) return 0.5
    if (predicted <= L) return 1
    if (predicted >= U) return 0
    return Math.pow((U - predicted) / (U - L), w)
  }

  if (goal === 'target') {
    const lo = L ?? (T ?? 0) - 1
    const hi = U ?? (T ?? 0) + 1
    const tgt = T ?? (lo + hi) / 2
    if (predicted < lo || predicted > hi) return 0
    if (predicted <= tgt) return Math.pow((predicted - lo) / (tgt - lo), w)
    return Math.pow((hi - predicted) / (hi - tgt), w)
  }

  return 1
}

// ─── Grid search optimizer ────────────────────────────────────────────────────

export function optimizeDesirability(
  models: FittedModel[],
  responses: Response[],
  factorIds: string[],
  gridSize = 11
): OptimizationResult {
  const k = factorIds.length
  const levels = Array.from({ length: gridSize }, (_, i) => -1 + (2 * i) / (gridSize - 1))

  let bestD = -1
  let bestFactors: Record<string, number> = {}
  let bestPredictions: Record<string, number> = {}
  let bestIndividual: Record<string, number> = {}

  function recurse(depth: number, current: Record<string, number>): void {
    if (depth === k) {
      const predictions: Record<string, number> = {}
      const desirabilities: Record<string, number> = {}
      let totalWeight = 0
      let compositeD = 1

      for (let mi = 0; mi < models.length; mi++) {
        const model = models[mi]
        const resp = responses.find((r) => r.id === model.spec.responseId)
        if (!resp) continue
        const { predicted } = predictAt(model, current)
        predictions[resp.id] = predicted
        const d = individualDesirability(predicted, resp)
        desirabilities[resp.id] = d
        compositeD *= Math.pow(d, resp.weight)
        totalWeight += resp.weight
      }

      const D = totalWeight > 0 ? Math.pow(compositeD, 1 / totalWeight) : 0

      if (D > bestD) {
        bestD = D
        bestFactors = { ...current }
        bestPredictions = predictions
        bestIndividual = desirabilities
      }
      return
    }

    const id = factorIds[depth]
    for (const lv of levels) {
      current[id] = lv
      recurse(depth + 1, current)
    }
  }

  // For k > 4, use coarser grid
  const effectiveGrid = k > 4 ? 5 : gridSize
  const effectiveLevels = Array.from({ length: effectiveGrid }, (_, i) => -1 + (2 * i) / (effectiveGrid - 1))

  function recurseEff(depth: number, current: Record<string, number>): void {
    if (depth === k) {
      const predictions: Record<string, number> = {}
      const desirabilities: Record<string, number> = {}
      let totalWeight = 0
      let compositeD = 1

      for (let mi = 0; mi < models.length; mi++) {
        const model = models[mi]
        const resp = responses.find((r) => r.id === model.spec.responseId)
        if (!resp) continue
        const { predicted } = predictAt(model, current)
        predictions[resp.id] = predicted
        const d = individualDesirability(predicted, resp)
        desirabilities[resp.id] = d
        compositeD *= Math.pow(d, resp.weight)
        totalWeight += resp.weight
      }

      const D = totalWeight > 0 ? Math.pow(compositeD, 1 / totalWeight) : 0

      if (D > bestD) {
        bestD = D
        bestFactors = { ...current }
        bestPredictions = predictions
        bestIndividual = desirabilities
      }
      return
    }

    const id = factorIds[depth]
    for (const lv of effectiveLevels) {
      current[id] = lv
      recurseEff(depth + 1, current)
    }
  }

  recurseEff(0, {})

  return {
    optimalFactors: bestFactors,
    predictedResponses: bestPredictions,
    compositeDesirability: bestD,
    individualDesirability: bestIndividual
  }
}
