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

  async function dismiss() {
    // Hide it straight away -- this is a nudge, so don't make anyone wait
    // on the network to get rid of it.
    setChecklist({ ...checklist, complete: true })
    api.dismissOnboardingChecklist().catch(() => {})
  }

  if (!checklist || checklist.complete) return null

  const doneCount = checklist.steps.filter((s) => s.done).length

  return (
    <div className="bg-surface border border-line rounded-xl2 divide-y divide-line mb-10 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-sm font-bold">Getting started</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-light">{doneCount} of {checklist.steps.length} done</span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Hide getting started"
            title="Hide this"
            className="text-slate-light hover:text-navy transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
      </div>
      <OnboardingSteps steps={checklist.steps} />
    </div>
  )
}
