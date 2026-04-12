import { Matrix, QrDecomposition, SingularValueDecomposition } from 'ml-matrix'
import type { DesignRun, Factor, ModelTerm } from '../types/doe'

// ─── Design matrix construction ─────────────────────────────────────────────

export function buildDesignMatrix(
  runs: DesignRun[],
  terms: ModelTerm[],
  factors: Factor[]
): Matrix {
  const rows = runs.map((run) => {
    return terms.map((term) => {
      if (term.type === 'intercept') return 1
      if (term.type === 'main') {
        return run.factors[term.factorIds[0]] ?? 0
      }
      if (term.type === 'interaction') {
        return term.factorIds.reduce((acc, id) => acc * (run.factors[id] ?? 0), 1)
      }
      if (term.type === 'quadratic') {
        const v = run.factors[term.factorIds[0]] ?? 0
        return v * v
      }
      return 0
    })
  })
  return new Matrix(rows)
}

// ─── Least-squares via QR (numerically stable) ───────────────────────────────

export interface LsqResult {
  beta: number[]
  XtXinv: Matrix
  fitted: number[]
  residuals: number[]
  conditionNumber: number
  rankDeficient: boolean
}

export function leastSquaresFit(X: Matrix, Y: number[]): LsqResult {
  const n = X.rows
  const p = X.columns
  const Ymat = Matrix.columnVector(Y)

  let beta: number[]
  let rankDeficient = false
  let XtXinv: Matrix

  try {
    const qr = new QrDecomposition(X)
    if (!qr.isFullRank()) throw new Error('rank deficient')
    // β = R⁻¹ Q'Y
    const QT = qr.orthogonalMatrix.transpose()
    const QTY = QT.mmul(Ymat)
    const R = qr.upperTriangularMatrix
    beta = solveUpperTriangular(R, QTY.getColumn(0))
    // (X'X)⁻¹ via R⁻¹(R⁻¹)'
    const Rinv = invertUpperTriangular(R)
    XtXinv = Rinv.mmul(Rinv.transpose())
  } catch {
    // Fallback to SVD pseudoinverse
    rankDeficient = true
    const svd = new SingularValueDecomposition(X, { autoTranspose: true })
    // Manual pseudoinverse: V * diag(1/σ) * U'
    const U = svd.leftSingularVectors
    const V = svd.rightSingularVectors
    const sigmas = svd.diagonal
    const threshold = 1e-10 * Math.max(...sigmas)
    const Sinv = Matrix.zeros(V.columns, U.columns)
    sigmas.forEach((s, i) => { if (s > threshold) Sinv.set(i, i, 1 / s) })
    const pseudoInv = V.mmul(Sinv).mmul(U.transpose())
    beta = pseudoInv.mmul(Ymat).getColumn(0)
    XtXinv = pseudoInv.mmul(pseudoInv.transpose())
  }

  const fitted = X.mmul(Matrix.columnVector(beta)).getColumn(0)
  const residuals = Y.map((y, i) => y - fitted[i])
  const conditionNumber = computeConditionNumber(X)

  return { beta, XtXinv, fitted, residuals, conditionNumber, rankDeficient }
}

// ─── Hat matrix diagonal (leverages) ─────────────────────────────────────────

export function hatDiagonal(X: Matrix): number[] {
  const qr = new QrDecomposition(X)
  const Q = qr.orthogonalMatrix
  // h_i = (QQ')_ii = sum_j Q_ij²
  const n = Q.rows
  const p = Q.columns
  const h: number[] = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      h[i] += Q.get(i, j) ** 2
    }
  }
  return h
}

// ─── Condition number via SVD ────────────────────────────────────────────────

export function computeConditionNumber(X: Matrix): number {
  try {
    const svd = new SingularValueDecomposition(X, { autoTranspose: true })
    const sv = svd.diagonal
    const max = Math.max(...sv)
    const min = sv.filter((v) => v > 1e-10).reduce((a, b) => Math.min(a, b), Infinity)
    return min > 0 ? max / min : Infinity
  } catch {
    return Infinity
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function solveUpperTriangular(R: Matrix, b: number[]): number[] {
  const p = R.rows
  const x: number[] = new Array(p).fill(0)
  for (let i = p - 1; i >= 0; i--) {
    let sum = b[i]
    for (let j = i + 1; j < p; j++) {
      sum -= R.get(i, j) * x[j]
    }
    const diag = R.get(i, i)
    x[i] = Math.abs(diag) > 1e-12 ? sum / diag : 0
  }
  return x
}

function invertUpperTriangular(R: Matrix): Matrix {
  const p = R.rows
  const inv = Matrix.zeros(p, p)
  for (let col = 0; col < p; col++) {
    const b = new Array(p).fill(0)
    b[col] = 1
    const x = solveUpperTriangular(R, b)
    for (let row = 0; row < p; row++) inv.set(row, col, x[row])
  }
  return inv
}
