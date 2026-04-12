import { jStat } from 'jstat'
import type { FittedModel, ResidualDiagnostics } from '../types/doe'

export function computeResidualDiagnostics(
  model: FittedModel,
  runOrders: number[]
): ResidualDiagnostics {
  const { residuals, fitted, leverages, cookDistance, rmse } = model
  const n = residuals.length

  // Internally studentized residuals: e_i / (RMSE * sqrt(1 - h_i))
  const studentizedResiduals = residuals.map((e, i) => {
    const h = Math.min(leverages[i], 0.9999)
    return e / (rmse * Math.sqrt(1 - h))
  })

  // Normal quantiles for QQ plot using Blom's formula
  const sorted = [...studentizedResiduals].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v)
  const normalQuantiles = new Array(n)
  sorted.forEach(({ i }, rank) => {
    normalQuantiles[i] = jStat.normal.inv((rank + 1 - 0.375) / (n + 0.25), 0, 1)
  })

  return {
    residuals,
    studentizedResiduals,
    fittedValues: fitted,
    normalQuantiles,
    leverages,
    cookDistances: cookDistance,
    runOrders
  }
}
