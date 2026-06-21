export type SpeakerRole = 'agent' | 'customer'

export type CallStatus = 'pending' | 'inspecting' | 'completed'

export type BusinessLine = 'credit_card' | 'loan' | 'insurance' | 'customer_service'

export interface TranscriptSegment {
  id: string
  startTime: number
  endTime: number
  speaker: SpeakerRole
  originalText: string
  revisedText: string
  isUnclear: boolean
  isEdited: boolean
  isMerged?: boolean
  mergedFromIds?: string[]
}

export interface CallTask {
  id: string
  callId: string
  agentName: string
  agentId: string
  businessLine: BusinessLine
  callTime: string
  duration: number
  customerPhone: string
  audioUrl: string
  audioFilePath?: string
  status: CallStatus
  transcript: TranscriptSegment[]
  qcItems?: QcCheckItem[]
  qcConclusion?: QcConclusion
}

export interface QcCheckItem {
  id: string
  category: 'opening' | 'identity_verify' | 'forbidden_words' | 'solution' | 'closing'
  label: string
  description: string
  score: number
  maxScore: number
  isPassed: boolean | null
  relatedSegmentIds: string[]
  deductionReason?: string
  suggestedScript?: string
}

export interface QcConclusion {
  id?: string
  callId: string
  inspectorName: string
  inspectTime: string
  totalScore: number
  maxScore: number
  isPassed: boolean
  items: QcCheckItem[]
  problemFragments: ProblemFragment[]
  overallComment?: string
}

export interface ProblemFragment {
  segmentId: string
  originalText: string
  revisedText?: string
  startTime: number
  endTime: number
  category: string
  reason: string
  suggestion?: string
}

export const BUSINESS_LINE_OPTIONS: { value: BusinessLine; label: string }[] = [
  { value: 'credit_card', label: '信用卡业务' },
  { value: 'loan', label: '贷款业务' },
  { value: 'insurance', label: '保险业务' },
  { value: 'customer_service', label: '综合客服' },
]

export const QC_CATEGORY_LABELS: Record<QcCheckItem['category'], string> = {
  opening: '开场白',
  identity_verify: '身份核验',
  forbidden_words: '禁用语',
  solution: '解决方案说明',
  closing: '结束语',
}
