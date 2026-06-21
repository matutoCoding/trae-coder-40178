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

  setAudioFile: (filePath: string) => void

  updateTranscriptSegment: (id: string, updates: Partial<TranscriptSegment>) => void
  mergeSegments: (ids: string[]) => void
  toggleUnclear: (id: string) => void

  setQcItemPassed: (id: string, passed: boolean, deductionReason?: string, suggestedScript?: string) => void
  toggleQcItemRelated: (qcItemId: string, segmentId: string) => void
  resetQcItems: () => void

  setCurrentTime: (time: number) => void
  setIsPlaying: (playing: boolean) => void
  setPlaybackRate: (rate: number) => void

  validateSubmittable: () => { ok: boolean; errors: string[] }
  submitConclusion: (inspectorName: string, overallComment?: string) => QcConclusion

  syncCurrentToCalls: () => void
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
      if (filterAgent) {
        const keyword = filterAgent.toLowerCase()
        const nameMatch = call.agentName.toLowerCase().includes(keyword)
        const idMatch = call.agentId.toLowerCase().includes(keyword)
        if (!nameMatch && !idMatch) return false
      }
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
      const savedQcItems = call.qcItems || deepCloneQcItems()
      set({
        currentCall: { ...call, status: call.status === 'pending' ? 'inspecting' : call.status },
        qcItems: savedQcItems,
        currentTime: 0,
        isPlaying: false,
      })
    }
  },

  clearCurrentCall: () => {
    get().syncCurrentToCalls()
    set({ currentCall: null, qcItems: deepCloneQcItems(), currentTime: 0, isPlaying: false })
  },

  setAudioFile: (filePath) => {
    set((state) => {
      if (!state.currentCall) return state
      const updatedCall = { ...state.currentCall, audioFilePath: filePath }
      return {
        currentCall: updatedCall,
        calls: state.calls.map((c) => (c.id === state.currentCall!.id ? updatedCall : c)),
      }
    })
  },

  syncCurrentToCalls: () => {
    set((state) => {
      if (!state.currentCall) return state
      const updatedCall = {
        ...state.currentCall,
        qcItems: state.qcItems,
      }
      return {
        calls: state.calls.map((c) => (c.id === state.currentCall!.id ? updatedCall : c)),
      }
    })
  },

  updateTranscriptSegment: (id, updates) => {
    set((state) => {
      if (!state.currentCall) return state
      const newTranscript = state.currentCall.transcript.map((seg) =>
        seg.id === id ? { ...seg, ...updates, isEdited: true } : seg
      )
      const updatedCall = { ...state.currentCall, transcript: newTranscript }
      return {
        currentCall: updatedCall,
        calls: state.calls.map((c) => (c.id === state.currentCall!.id ? updatedCall : c)),
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

      const updatedCall = { ...state.currentCall, transcript: newTranscript }
      return {
        currentCall: updatedCall,
        calls: state.calls.map((c) => (c.id === state.currentCall!.id ? updatedCall : c)),
      }
    })
  },

  toggleUnclear: (id) => {
    set((state) => {
      if (!state.currentCall) return state
      const newTranscript = state.currentCall.transcript.map((seg) =>
        seg.id === id ? { ...seg, isUnclear: !seg.isUnclear, isEdited: true } : seg
      )
      const updatedCall = { ...state.currentCall, transcript: newTranscript }
      return {
        currentCall: updatedCall,
        calls: state.calls.map((c) => (c.id === state.currentCall!.id ? updatedCall : c)),
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
    get().syncCurrentToCalls()
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
    get().syncCurrentToCalls()
  },

  resetQcItems: () => {
    set({ qcItems: deepCloneQcItems() })
    get().syncCurrentToCalls()
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),

  validateSubmittable: () => {
    const { qcItems } = get()
    const errors: string[] = []

    const unjudged = qcItems.filter((i) => i.isPassed === null)
    if (unjudged.length > 0) {
      errors.push(`还有 ${unjudged.length} 项质检项未判定，请先完成判定`)
    }

    const failedItems = qcItems.filter((i) => i.isPassed === false)
    for (const item of failedItems) {
      if (!item.deductionReason || item.deductionReason === '待填写' || item.deductionReason.trim() === '') {
      errors.push(`「${item.label}」未填写扣分原因`)
    }
      if (!item.suggestedScript || item.suggestedScript.trim() === '') {
        errors.push(`「${item.label}」未填写建议话术`)
      }
      if (item.relatedSegmentIds.length === 0) {
        errors.push(`「${item.label}」未关联任何问题片段，请在转写中标记`)
      }
    }

    return { ok: errors.length === 0, errors }
  },

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

    const completedCall = {
      ...currentCall,
      status: 'completed' as const,
      qcItems,
      qcConclusion: conclusion,
    }

    set((state) => ({
      conclusion,
      currentCall: completedCall,
      calls: state.calls.map((c) => (c.id === currentCall.id ? completedCall : c)),
    }))

    return conclusion
  },
}))
