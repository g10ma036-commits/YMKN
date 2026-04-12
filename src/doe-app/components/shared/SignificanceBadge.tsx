import React from 'react'

interface Props { pValue: number | null }

export function SignificanceBadge({ pValue }: Props) {
  if (pValue === null) return null
  if (pValue < 0.001) return <span className="badge badge-red">p&lt;0.001 ★★★</span>
  if (pValue < 0.01)  return <span className="badge badge-red">p&lt;0.01 ★★</span>
  if (pValue < 0.05)  return <span className="badge badge-yellow">p&lt;0.05 ★</span>
  if (pValue < 0.1)   return <span className="badge badge-gray">p&lt;0.1 .</span>
  return <span className="badge badge-gray">ns</span>
}

export function sigStars(p: number | null): string {
  if (p === null) return ''
  if (p < 0.001) return '★★★'
  if (p < 0.01)  return '★★'
  if (p < 0.05)  return '★'
  if (p < 0.1)   return '.'
  return ''
}
