// ─── Factor ─────────────────────────────────────────────────────────────────

export type FactorType = 'continuous' | 'categorical' | 'blocking'

export interface Factor {
  id: string
  name: string
  symbol: string
  type: FactorType
  low: number
  high: number
  center?: number
  units?: string
  levels?: string[] // for categorical
}

// ─── Response ────────────────────────────────────────────────────────────────

export type ResponseGoal = 'minimize' | 'maximize' | 'target' | 'none'

export interface Response {
  id: string
  name: string
  units?: string
  goal: ResponseGoal
  targetValue?: number
  lowerBound?: number
  upperBound?: number
  weight: number
}

// ─── Design ──────────────────────────────────────────────────────────────────

export type DesignType =
  | 'full-factorial-2k'
  | 'fractional-factorial-2kp'
  | 'central-composite'
  | 'box-behnken'
  | 'd-optimal'
  | 'definitive-screening'

export type CCDVariant = 'circumscribed' | 'inscribed' | 'faced'

export interface DesignOptions {
  type: DesignType
  // Full / Fractional Factorial
  resolution?: number
  generators?: string[]
  // CCD
  ccdVariant?: CCDVariant
  alpha?: number
  centerRuns?: number
  // D-Optimal
  dOptimalRuns?: number
  randomize?: boolean
}

export interface DesignRun {
  runOrder: number
  stdOrder: number
  block?: number
  factors: Record<string, number>            // factor.id → coded value
  responses: Record<string, number | null>   // response.id → observed
}

// ─── Model terms ─────────────────────────────────────────────────────────────

export type TermType = 'intercept' | 'main' | 'interaction' | 'quadratic'

export interface ModelTerm {
  label: string
  factorIds: string[]
  type: TermType
}

export interface ModelSpec {
  responseId: string
  terms: ModelTerm[]
}

// ─── Fitted model ─────────────────────────────────────────────────────────────

export interface ParameterEstimate {
  term: ModelTerm
  estimate: number
  stdError: number
  tStat: number
  pValue: number
  lowerCI95: number
  upperCI95: number
  aliased: boolean
}

export interface ANOVARow {
  source: string
  sumOfSquares: number
  df: number
  meanSquare: number
  fStat: number | null
  pValue: number | null
}

export interface ANOVATable {
  rows: ANOVARow[]
  modelSS: number
  errorSS: number
  totalSS: number
}

export interface FittedModel {
  spec: ModelSpec
  coefficients: number[]
  parameterEstimates: ParameterEstimate[]
  rSquared: number
  adjRSquared: number
  rmse: number
  residuals: number[]
  fitted: number[]
  leverages: number[]
  cookDistance: number[]
  anovaTable: ANOVATable
  conditionNumber: number
  nObs: number
}

// ─── Residual diagnostics ────────────────────────────────────────────────────

export interface ResidualDiagnostics {
  residuals: number[]
  studentizedResiduals: number[]
  fittedValues: number[]
  normalQuantiles: number[]
  leverages: number[]
  cookDistances: number[]
  runOrders: number[]
}

// ─── Prediction ──────────────────────────────────────────────────────────────

export interface PredictionPoint {
  factors: Record<string, number>
  predicted: number
  stdError: number
  lowerCI95: number
  upperCI95: number
  lowerPI95: number
  upperPI95: number
}

// ─── Optimization ────────────────────────────────────────────────────────────

export interface OptimizationResult {
  optimalFactors: Record<string, number>     // coded values
  predictedResponses: Record<string, number>
  compositeDesirability: number
  individualDesirability: Record<string, number>
}

// ─── Application state ───────────────────────────────────────────────────────

export type WorkflowStage =
  | 'factor-setup'
  | 'design-selection'
  | 'design-review'
  | 'response-entry'
  | 'model-fitting'
  | 'analysis'
  | 'optimization'

export interface DOEState {
  stage: WorkflowStage
  projectName: string
  factors: Factor[]
  responses: Response[]
  designOptions: DesignOptions | null
  designRuns: DesignRun[]
  modelSpecs: ModelSpec[]
  fittedModels: FittedModel[]
  optimizationResult: OptimizationResult | null
  savedAt: string | null
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type DOEAction =
  | { type: 'SET_PROJECT_NAME'; name: string }
  | { type: 'ADD_FACTOR'; factor: Factor }
  | { type: 'UPDATE_FACTOR'; id: string; updates: Partial<Factor> }
  | { type: 'REMOVE_FACTOR'; id: string }
  | { type: 'ADD_RESPONSE'; response: Response }
  | { type: 'UPDATE_RESPONSE'; id: string; updates: Partial<Response> }
  | { type: 'REMOVE_RESPONSE'; id: string }
  | { type: 'SET_DESIGN_OPTIONS'; options: DesignOptions }
  | { type: 'GENERATE_DESIGN' }
  | { type: 'RANDOMIZE_RUNS' }
  | { type: 'UPDATE_RUN_RESPONSE'; stdOrder: number; responseId: string; value: number | null }
  | { type: 'IMPORT_RESPONSES'; data: Record<number, Record<string, number | null>> }
  | { type: 'SET_MODEL_SPEC'; spec: ModelSpec }
  | { type: 'FIT_MODEL'; responseId: string }
  | { type: 'RUN_OPTIMIZATION' }
  | { type: 'NAVIGATE'; stage: WorkflowStage }
  | { type: 'LOAD_PROJECT'; state: DOEState }
  | { type: 'NEW_PROJECT' }
