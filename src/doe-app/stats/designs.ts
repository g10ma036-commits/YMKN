import { Matrix, SingularValueDecomposition } from 'ml-matrix'
import type { DesignRun, Factor, DesignOptions, ModelTerm } from '../types/doe'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function makeRun(
  stdOrder: number,
  factorIds: string[],
  coded: number[],
  responseIds: string[]
): DesignRun {
  const factors: Record<string, number> = {}
  factorIds.forEach((id, i) => { factors[id] = coded[i] })
  const responses: Record<string, number | null> = {}
  responseIds.forEach((id) => { responses[id] = null })
  return { runOrder: stdOrder, stdOrder, factors, responses }
}

// ─── Full Factorial 2^k ───────────────────────────────────────────────────────

export function fullFactorial2k(factors: Factor[], responses: Factor[]): DesignRun[] {
  const k = factors.length
  const n = Math.pow(2, k)
  const responseIds = (responses as unknown as { id: string }[]).map((r) => r.id)
  const factorIds = factors.map((f) => f.id)
  const runs: DesignRun[] = []
  for (let i = 0; i < n; i++) {
    const coded = factorIds.map((_, j) => (((i >> j) & 1) === 0 ? -1 : 1))
    runs.push(makeRun(i + 1, factorIds, coded, responseIds))
  }
  return runs
}

// Built-in generator table: [k][resolution] → generators (as factor indices 0-based, last factor = product)
// Format: each generator is [result_index, ...factor_indices_to_multiply]
const FF_GENERATORS: Record<number, number[][]> = {
  // k=3, p=1 (2^(3-1) = 4 runs), res III: C=AB
  3: [[2, 0, 1]],
  // k=4, p=1 (2^(4-1) = 8 runs), res IV: D=ABC
  4: [[3, 0, 1, 2]],
  // k=5, p=1 (2^(5-1) = 16 runs), res V: E=ABCD
  5: [[4, 0, 1, 2, 3]],
  // k=6, p=2 (2^(6-2) = 16 runs), res IV: E=ABC, F=BCD
  6: [[4, 0, 1, 2], [5, 1, 2, 3]],
  // k=7, p=2 (2^(7-2) = 32 runs), res IV: F=ABCD, G=ABDE
  7: [[5, 0, 1, 2, 3], [6, 0, 1, 3, 4]],
  // k=8, p=2, res V: G=ABCDF, H=ABCDE
  8: [[6, 0, 1, 2, 3, 5], [7, 0, 1, 2, 3, 4]],
}

export function fractionalFactorial2kp(factors: Factor[], responses: Factor[]): DesignRun[] {
  const k = factors.length
  const gens = FF_GENERATORS[k]
  if (!gens) return fullFactorial2k(factors, responses)
  const p = gens.length
  const baseK = k - p
  const baseFactors = factors.slice(0, baseK)
  const baseFull = fullFactorial2k(baseFactors, [])
  const responseIds = (responses as unknown as { id: string }[]).map((r) => r.id)
  const factorIds = factors.map((f) => f.id)

  return baseFull.map((run, i) => {
    const baseVals = baseFactors.map((f) => run.factors[f.id])
    const allVals = [...baseVals]
    for (const gen of gens) {
      const val = gen.slice(1).reduce((acc, idx) => acc * baseVals[idx], 1)
      allVals.push(val)
    }
    return makeRun(i + 1, factorIds, allVals, responseIds)
  })
}

// ─── Central Composite Design ─────────────────────────────────────────────────

export function centralComposite(
  factors: Factor[],
  responses: { id: string }[],
  opts: { variant: 'circumscribed' | 'inscribed' | 'faced'; centerRuns: number }
): DesignRun[] {
  const k = factors.length
  const factorIds = factors.map((f) => f.id)
  const responseIds = responses.map((r) => r.id)

  let alpha: number
  if (opts.variant === 'faced') {
    alpha = 1
  } else if (opts.variant === 'inscribed') {
    alpha = 1 / Math.sqrt(k)
  } else {
    // circumscribed (rotatable)
    alpha = Math.pow(2, k / 4)
  }

  const scale = opts.variant === 'inscribed' ? 1 / alpha : 1
  const runs: DesignRun[] = []
  let std = 1

  // Factorial portion
  const nFact = Math.pow(2, k)
  for (let i = 0; i < nFact; i++) {
    const coded = factorIds.map((_, j) => (((i >> j) & 1) === 0 ? -1 : 1) * scale)
    runs.push(makeRun(std++, factorIds, coded, responseIds))
  }

  // Axial points
  for (let j = 0; j < k; j++) {
    for (const sign of [-1, 1]) {
      const coded = factorIds.map((_, idx) => (idx === j ? sign * alpha : 0))
      runs.push(makeRun(std++, factorIds, coded, responseIds))
    }
  }

  // Center runs
  for (let c = 0; c < opts.centerRuns; c++) {
    runs.push(makeRun(std++, factorIds, new Array(k).fill(0), responseIds))
  }

  return runs
}

// ─── Box-Behnken Design ───────────────────────────────────────────────────────

// Pre-tabulated BBD patterns (pairs of factor indices that take ±1 simultaneously)
const BBD_BLOCKS: Record<number, [number, number][]> = {
  3: [[0,1],[0,2],[1,2],[0,1],[0,2],[1,2]],
  4: [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3],[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],
  5: [
    [0,1],[0,2],[1,3],[2,4],[3,4],
    [0,3],[0,4],[1,2],[1,4],[2,3],
    [0,1],[0,2],[1,3],[2,4],[3,4],
    [0,3],[0,4],[1,2],[1,4],[2,3]
  ]
}

export function boxBehnken(
  factors: Factor[],
  responses: { id: string }[],
  centerRuns: number
): DesignRun[] {
  const k = factors.length
  if (k < 3 || k > 5) throw new Error(`Box-Behnken サポート対象: 3~5因子 (指定: ${k})`)
  const factorIds = factors.map((f) => f.id)
  const responseIds = responses.map((r) => r.id)
  const blocks = BBD_BLOCKS[k]
  const runs: DesignRun[] = []
  let std = 1

  for (const [i, j] of blocks) {
    for (const [si, sj] of [[-1,-1],[-1,1],[1,-1],[1,1]] as [number,number][]) {
      const coded = new Array(k).fill(0)
      coded[i] = si
      coded[j] = sj
      runs.push(makeRun(std++, factorIds, coded, responseIds))
    }
  }

  for (let c = 0; c < centerRuns; c++) {
    runs.push(makeRun(std++, factorIds, new Array(k).fill(0), responseIds))
  }
  return runs
}

// ─── D-Optimal (Coordinate Exchange) ─────────────────────────────────────────

export function dOptimal(
  factors: Factor[],
  responses: { id: string }[],
  nRuns: number,
  nRestarts = 5
): DesignRun[] {
  const k = factors.length
  const factorIds = factors.map((f) => f.id)
  const responseIds = responses.map((r) => r.id)

  function evalRow(vals: number[]): number[] {
    const row = [1, ...vals]
    // add 2FI
    for (let i = 0; i < k; i++)
      for (let j = i + 1; j < k; j++)
        row.push(vals[i] * vals[j])
    return row
  }

  function logDet(X: number[][]): number {
    try {
      const M = new Matrix(X)
      const XtX = M.transpose().mmul(M)
      // simple log-det via LU (use trace as proxy for small matrices)
      // For robustness, compute eigenvalues via sum of log diagonals of R
      const svd = new SingularValueDecomposition(XtX)
      return svd.diagonal.reduce((s: number, v: number) => s + (v > 1e-12 ? Math.log(v) : -1e9), 0)
    } catch {
      return -Infinity
    }
  }

  const levels = [-1, 0, 1]
  let bestDesign: number[][] | null = null
  let bestD = -Infinity

  for (let r = 0; r < nRestarts; r++) {
    // Random initial design
    let design: number[][] = Array.from({ length: nRuns }, () =>
      factorIds.map(() => levels[Math.floor(Math.random() * 3)])
    )

    let improved = true
    while (improved) {
      improved = false
      for (let i = 0; i < nRuns; i++) {
        for (let j = 0; j < k; j++) {
          const best = { val: design[i][j], d: logDet(design.map((r2, ri) => evalRow(ri === i ? [...r2.slice(0,j), design[i][j], ...r2.slice(j+1)] : r2))) }
          for (const lv of levels) {
            if (lv === design[i][j]) continue
            const trial = design.map((row2, ri) => ri === i ? [...row2.slice(0,j), lv, ...row2.slice(j+1)] : row2)
            const d = logDet(trial.map(evalRow))
            if (d > best.d + 1e-9) { best.val = lv; best.d = d; improved = true }
          }
          if (best.val !== design[i][j]) {
            design[i] = [...design[i].slice(0,j), best.val, ...design[i].slice(j+1)]
          }
        }
      }
    }

    const d = logDet(design.map(evalRow))
    if (d > bestD) { bestD = d; bestDesign = design }
  }

  return (bestDesign ?? []).map((vals, i) =>
    makeRun(i + 1, factorIds, vals, responseIds)
  )
}

// ─── Definitive Screening Design ─────────────────────────────────────────────

// Pre-tabulated conference matrices for k=3..7 (odd k)
// C is (k+1)×k with 0 on diagonal blocks and ±1 elsewhere
const DSD_MATRICES: Record<number, number[][]> = {
  3: [
    [ 0, 1, 1],
    [ 1, 0, 1],
    [ 1, 1, 0],
    [-1, 1,-1],
  ],
  4: [
    [ 0, 1, 1, 1],
    [ 1, 0, 1,-1],
    [ 1,-1, 0, 1],
    [-1, 1,-1, 0],
    [ 1, 1,-1,-1],
  ],
  5: [
    [ 0, 1, 1, 1, 1],
    [ 1, 0, 1,-1, 1],
    [ 1,-1, 0, 1, 1],
    [-1, 1,-1, 0, 1],
    [-1, 1, 1,-1, 0],
    [ 1, 1,-1,-1,-1],
  ],
  6: [
    [ 0, 1, 1, 1, 1, 1],
    [ 1, 0, 1, 1,-1, 1],
    [ 1,-1, 0, 1, 1,-1],
    [-1, 1,-1, 0, 1, 1],
    [-1,-1, 1,-1, 0, 1],
    [-1,-1,-1, 1,-1, 0],
    [ 1, 1, 1,-1,-1,-1],
  ],
  7: [
    [ 0, 1, 1, 1, 1, 1, 1],
    [ 1, 0, 1,-1, 1,-1, 1],
    [ 1,-1, 0, 1,-1, 1, 1],
    [-1, 1,-1, 0, 1, 1,-1],
    [-1,-1, 1,-1, 0, 1, 1],
    [-1, 1,-1,-1, 1, 0,-1],
    [-1,-1,-1, 1,-1, 1, 0],
    [ 1, 1, 1, 1,-1,-1,-1],
  ]
}

export function definitiveScreening(
  factors: Factor[],
  responses: { id: string }[]
): DesignRun[] {
  const k = factors.length
  if (k < 3 || k > 7) throw new Error(`DSD サポート対象: 3~7因子 (指定: ${k})`)
  const factorIds = factors.map((f) => f.id)
  const responseIds = responses.map((r) => r.id)
  const C = DSD_MATRICES[k]
  const runs: DesignRun[] = []
  let std = 1
  for (const row of C) {
    runs.push(makeRun(std++, factorIds, row, responseIds))
  }
  // foldover
  for (const row of C) {
    runs.push(makeRun(std++, factorIds, row.map((v) => -v), responseIds))
  }
  // center point
  runs.push(makeRun(std++, factorIds, new Array(k).fill(0), responseIds))
  return runs
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function generateDesign(
  factors: Factor[],
  responses: { id: string }[],
  opts: DesignOptions
): DesignRun[] {
  let runs: DesignRun[]
  switch (opts.type) {
    case 'full-factorial-2k':
      runs = fullFactorial2k(factors, responses as Factor[])
      break
    case 'fractional-factorial-2kp':
      runs = fractionalFactorial2kp(factors, responses as Factor[])
      break
    case 'central-composite':
      runs = centralComposite(factors, responses, {
        variant: opts.ccdVariant ?? 'circumscribed',
        centerRuns: opts.centerRuns ?? 3
      })
      break
    case 'box-behnken':
      runs = boxBehnken(factors, responses, opts.centerRuns ?? 3)
      break
    case 'd-optimal':
      runs = dOptimal(factors, responses, opts.dOptimalRuns ?? Math.max(10, 2 * factors.length + 3))
      break
    case 'definitive-screening':
      runs = definitiveScreening(factors, responses)
      break
    default:
      runs = fullFactorial2k(factors, responses as Factor[])
  }

  if (opts.randomize !== false) {
    const shuffled = shuffle(runs)
    return shuffled.map((r, i) => ({ ...r, runOrder: i + 1 }))
  }
  return runs
}

// ─── Default model terms for a design ────────────────────────────────────────

export function defaultModelTerms(
  factors: Factor[],
  designType: DesignOptions['type']
): ModelTerm[] {
  const terms: ModelTerm[] = [{ label: '切片', factorIds: [], type: 'intercept' }]

  // Main effects
  for (const f of factors) {
    terms.push({ label: f.symbol, factorIds: [f.id], type: 'main' })
  }

  const isSurface = designType === 'central-composite' || designType === 'box-behnken' || designType === 'definitive-screening'

  // Two-factor interactions
  for (let i = 0; i < factors.length; i++) {
    for (let j = i + 1; j < factors.length; j++) {
      terms.push({
        label: `${factors[i].symbol}×${factors[j].symbol}`,
        factorIds: [factors[i].id, factors[j].id],
        type: 'interaction'
      })
    }
  }

  // Quadratic terms for RSM designs
  if (isSurface) {
    for (const f of factors) {
      terms.push({ label: `${f.symbol}²`, factorIds: [f.id], type: 'quadratic' })
    }
  }

  return terms
}
