import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function OnboardingChecklist() {
  const [checklist, setChecklist] = useState(null)

  useEffect(() => {
    api.getOnboardingChecklist().then(setChecklist).catch(() => {})
  }, [])

  if (!checklist || checklist.complete) return null

  const doneCount = checklist.steps.filter((s) => s.done).length

  return (
    <div className="bg-white border border-line rounded-xl2 divide-y divide-line mb-10 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-sm font-bold">Getting started</h2>
        <span className="text-xs text-slate-light">{doneCount} of {checklist.steps.length} done</span>
      </div>
      {checklist.steps.map((step) => {
        const row = (
          <div className="flex items-center gap-3 px-5 py-3.5">
            <span
              className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold ${
                step.done ? 'bg-indigo text-white' : 'border-2 border-line'
              }`}
            >
              {step.done ? '✓' : ''}
            </span>
            <div className="min-w-0 flex-grow">
              <p className={`text-sm font-semibold ${step.done ? 'text-slate-light line-through' : ''}`}>{step.title}</p>
              {!step.done && <p className="text-xs text-slate-light mt-0.5">{step.subtitle}</p>}
            </div>
            {!step.done && <span className="text-slate-light flex-shrink-0">→</span>}
          </div>
        )
        return step.done ? (
          <div key={step.key}>{row}</div>
        ) : (
          <Link key={step.key} to={step.cta_url} className="block hover:bg-bg/60 transition-colors">
            {row}
          </Link>
        )
      })}
    </div>
  )
}
