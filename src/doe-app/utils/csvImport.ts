/**
 * Parse CSV text into a mapping of stdOrder → { responseId: value }
 * Expected header: stdOrder, [response names...]
 */
export function parseCSV(
  text: string,
  responseMap: Record<string, string>  // name → id
): Record<number, Record<string, number | null>> {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return {}
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
  const result: Record<number, Record<string, number | null>> = {}

  for (let li = 1; li < lines.length; li++) {
    const cells = lines[li].split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const stdOrder = parseInt(cells[0], 10)
    if (isNaN(stdOrder)) continue
    result[stdOrder] = {}
    for (let ci = 1; ci < headers.length; ci++) {
      const header = headers[ci]
      const id = responseMap[header]
      if (!id) continue
      const raw = cells[ci]
      result[stdOrder][id] = raw === '' || raw === 'NA' ? null : parseFloat(raw)
    }
  }
  return result
}
