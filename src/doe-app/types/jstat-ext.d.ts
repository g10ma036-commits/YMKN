declare module 'jstat' {
  const jStat: {
    studentt: {
      cdf(x: number, df: number): number
      inv(p: number, df: number): number
    }
    centralF: {
      cdf(x: number, df1: number, df2: number): number
    }
    normal: {
      cdf(x: number, mean: number, std: number): number
      inv(p: number, mean: number, std: number): number
    }
  }
  export { jStat }
}
