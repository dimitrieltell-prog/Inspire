import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import OnboardingSteps from './OnboardingSteps'

export default function OnboardingGuideModal() {
  const { refreshUser } = useAuth()
  const [checklist, setChecklist] = useState(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    api.getOnboardingChecklist().then(setChecklist).catch(() => {})
  }, [])

  async function dismiss() {
    if (closing) return
    setClosing(true)
    try {
      await api.markOnboardingGuideSeen()
    } catch (_) {
      // Same fallback as the founder-story popup -- if the save fails it'll
      // just show again next time, rather than trapping the user here.
    } finally {
      await refreshUser().catch(() => {})
    }
  }

  if (!checklist) return null

  const doneCount = checklist.steps.filter((s) => s.done).length

  return createPortal(
    <div className="fixed inset-0 z-50 bg-navy/60 flex items-center justify-center p-4">
      <div className="bg-surface rounded-xl2 w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-line flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold">Getting started</h2>
            <p className="text-xs text-slate-light mt-0.5">{doneCount} of {checklist.steps.length} done</p>
          </div>
          <button
            onClick={dismiss}
            disabled={closing}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate hover:text-navy hover:bg-bg transition-colors disabled:opacity-50 flex-shrink-0"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto divide-y divide-line">
          <OnboardingSteps steps={checklist.steps} onStepClick={dismiss} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
