import { create } from 'zustand'
import type { CallTask, TranscriptSegment, QcCheckItem, QcConclusion, BusinessLine } from '../types'
import { MOCK_CALLS, DEFAULT_QC_ITEMS } from '../mock'

interface QcStore {
  calls: CallTask[]
  currentCall: CallTask | null
  qcItems: QcCheckItem[]
  conclusion: QcConclusion | null
  filterDate: [string, string] | null
  filterAgent: string
  filterBusinessLine: BusinessLine | 'all'
  filterStatus: 'all' | 'pending' | 'inspecting' | 'completed'
  currentTime: number
  isPlaying: boolean
  playbackRate: number

  setFilterDate: (range: [string, string] | null) => void
  setFilterAgent: (name: string) => void
  setFilterBusinessLine: (line: BusinessLine | 'all') => void
  setFilterStatus: (status: 'all' | 'pending' | 'inspecting' | 'completed') => void

  getFilteredCalls: () => CallTask[]
  selectCall: (callId: string) => void
  clearCurrentCall: () => void

  updateTranscriptSegment: (id: string, updates: Partial<TranscriptSegment>) => void
  mergeSegments: (ids: string[]) => void
  toggleUnclear: (id: string) => void

  setQcItemPassed: (id: string, passed: boolean, deductionReason?: string, suggestedScript?: string) => void
  toggleQcItemRelated: (qcItemId: string, segmentId: string) => void
  resetQcItems: () => void

  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackRate: (rate: number) => void

  submitConclusion: (inspectorName: string, overallComment?: string) => QcConclusion
}

function deepCloneQcItems(): QcCheckItem[] {
  return DEFAULT_QC_ITEMS.map((item) => ({
    ...item,
    isPassed: null,
    relatedSegmentIds: [],
    deductionReason: undefined,
    suggestedScript: undefined,
  }))
}

export const useQcStore = create<QcStore>((set, get) => ({
  calls: MOCK_CALLS,
  currentCall: null,
  qcItems: deepCloneQcItems(),
  conclusion: null,
  filterDate: null,
  filterAgent: '',
  filterBusinessLine: 'all',
  filterStatus: 'all',
  currentTime: 0,
  isPlaying: false,
  playbackRate: 1,

  setFilterDate: (range) => set({ filterDate: range }),
  setFilterAgent: (name) => set({ filterAgent: name }),
  setFilterBusinessLine: (line) => set({ filterBusinessLine: line }),
  setFilterStatus: (status) => set({ filterStatus: status }),

  getFilteredCalls: () => {
    const { calls, filterDate, filterAgent, filterBusinessLine, filterStatus } = get()
    return calls.filter((call) => {
      if (filterStatus !== 'all' && call.status !== filterStatus) return false
      if (filterAgent && !call.agentName.includes(filterAgent)) return false
      if (filterBusinessLine !== 'all' && call.businessLine !== filterBusinessLine) return false
      if (filterDate) {
        const callDate = call.callTime.split(' ')[0]
        if (callDate < filterDate[0] || callDate > filterDate[1]) return false
      }
      return true
    })
  },

  selectCall: (callId) => {
    const call = get().calls.find((c) => c.id === callId)
    if (call) {
      set({
        currentCall: { ...call, status: 'inspecting' },
        qcItems: deepCloneQcItems(),
        currentTime: 0,
        isPlaying: false,
      })
    }
  },

  clearCurrentCall: () => set({ currentCall: null, qcItems: deepCloneQcItems(), currentTime: 0 }),

  updateTranscriptSegment: (id, updates) => {
    set((state) => {
      if (!state.currentCall) return state
      const newTranscript = state.currentCall.transcript.map((seg) =>
        seg.id === id ? { ...seg, ...updates, isEdited: true } : seg
      )
      return {
        currentCall: { ...state.currentCall, transcript: newTranscript },
      }
    })
  },

  mergeSegments: (ids) => {
    set((state) => {
      if (!state.currentCall || ids.length < 2) return state
      const segments = state.currentCall.transcript
      const toMerge = segments.filter((s) => ids.includes(s.id))
      if (toMerge.length < 2) return state

      const firstId = toMerge[0].id
      const mergedSegment: TranscriptSegment = {
        id: firstId,
        startTime: toMerge[0].startTime,
        endTime: toMerge[toMerge.length - 1].endTime,
        speaker: toMerge[0].speaker,
        originalText: toMerge.map((s) => s.originalText).join(''),
        revisedText: toMerge.map((s) => s.revisedText).join(''),
        isUnclear: toMerge.some((s) => s.isUnclear),
        isEdited: true,
        isMerged: true,
        mergedFromIds: ids,
      }

      const newTranscript = segments
        .filter((s) => !ids.includes(s.id) || s.id === firstId)
        .map((s) => (s.id === firstId ? mergedSegment : s))
        .sort((a, b) => a.startTime - b.startTime)

      return {
        currentCall: { ...state.currentCall, transcript: newTranscript },
      }
    })
  },

  toggleUnclear: (id) => {
    set((state) => {
      if (!state.currentCall) return state
      const newTranscript = state.currentCall.transcript.map((seg) =>
        seg.id === id ? { ...seg, isUnclear: !seg.isUnclear, isEdited: true } : seg
      )
      return {
        currentCall: { ...state.currentCall, transcript: newTranscript },
      }
    })
  },

  setQcItemPassed: (id, passed, deductionReason, suggestedScript) => {
    set((state) => {
      const newItems = state.qcItems.map((item) => {
        if (item.id !== id) return item
        return {
          ...item,
          isPassed: passed,
          score: passed ? item.maxScore : 0,
          deductionReason: passed ? undefined : deductionReason,
          suggestedScript: passed ? undefined : suggestedScript,
        }
      })
      return { qcItems: newItems }
    })
  },

  toggleQcItemRelated: (qcItemId, segmentId) => {
    set((state) => {
      const newItems = state.qcItems.map((item) => {
        if (item.id !== qcItemId) return item
        const hasId = item.relatedSegmentIds.includes(segmentId)
        return {
          ...item,
          relatedSegmentIds: hasId
            ? item.relatedSegmentIds.filter((id) => id !== segmentId)
            : [...item.relatedSegmentIds, segmentId],
        }
      })
      return { qcItems: newItems }
    })
  },

  resetQcItems: () => set({ qcItems: deepCloneQcItems() }),

  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),

  submitConclusion: (inspectorName, overallComment) => {
    const { currentCall, qcItems } = get()
    if (!currentCall) throw new Error('No current call')

    const totalScore = qcItems.reduce((sum, item) => sum + item.score, 0)
    const maxScore = qcItems.reduce((sum, item) => sum + item.maxScore, 0)

    const problemFragments = qcItems
      .filter((item) => item.isPassed === false)
      .flatMap((item) =>
        item.relatedSegmentIds.map((segId) => {
          const seg = currentCall.transcript.find((s) => s.id === segId)
          return {
            segmentId: segId,
            originalText: seg?.originalText || '',
            revisedText: seg?.isEdited ? seg.revisedText : undefined,
            startTime: seg?.startTime || 0,
            endTime: seg?.endTime || 0,
            category: item.category,
            reason: item.deductionReason || '未填写原因',
            suggestion: item.suggestedScript,
          }
        })
      )

    const conclusion: QcConclusion = {
      callId: currentCall.callId,
      inspectorName,
      inspectTime: new Date().toLocaleString('zh-CN'),
      totalScore,
      maxScore,
      isPassed: totalScore >= maxScore * 0.8,
      items: qcItems,
      problemFragments,
      overallComment,
    }

    set((state) => ({
      conclusion,
      currentCall: state.currentCall ? { ...state.currentCall, status: 'completed' } : null,
      calls: state.calls.map((c) => (c.id === currentCall.id ? { ...c, status: 'completed' as const } : c)),
    }))

    return conclusion
  },
}))
