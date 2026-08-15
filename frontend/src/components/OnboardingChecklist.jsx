import { useEffect, useState } from 'react'
import { api } from '../api'
import OnboardingSteps from './OnboardingSteps'

export default function OnboardingChecklist({ onVisibilityChange } = {}) {
  const [checklist, setChecklist] = useState(null)

  useEffect(() => {
    api.getOnboardingChecklist().then(setChecklist).catch(() => {})
  }, [])

  useEffect(() => {
    onVisibilityChange?.(!!checklist && !checklist.complete)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checklist])

  if (!checklist || checklist.complete) return null

  const doneCount = checklist.steps.filter((s) => s.done).length

  return (
    <div className="bg-surface border border-line rounded-xl2 divide-y divide-line mb-10 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-sm font-bold">Getting started</h2>
        <span className="text-xs text-slate-light">{doneCount} of {checklist.steps.length} done</span>
      </div>
      <OnboardingSteps steps={checklist.steps} />
    </div>
  )
}
