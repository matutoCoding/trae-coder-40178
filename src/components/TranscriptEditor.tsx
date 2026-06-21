import { useState, useRef, useEffect } from 'react'
import { Button, Checkbox, Input, Space, Tooltip, Tag, message, Popconfirm } from 'antd'
import {
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  MergeCellsOutlined,
  SoundOutlined,
  LinkOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { useQcStore } from '../store/qcStore'
import type { TranscriptSegment } from '../types'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

interface TranscriptEditorProps {
  selectedQcItemId: string | null
  onSegmentClick?: (segmentId: string) => void
}

function TranscriptEditor({ selectedQcItemId, onSegmentClick }: TranscriptEditorProps) {
  const currentCall = useQcStore((s) => s.currentCall)
  const transcript = currentCall?.transcript || []
  const currentTime = useQcStore((s) => s.currentTime)
  const setCurrentTime = useQcStore((s) => s.setCurrentTime)
  const setIsPlaying = useQcStore((s) => s.setIsPlaying)
  const updateTranscriptSegment = useQcStore((s) => s.updateTranscriptSegment)
  const mergeSegments = useQcStore((s) => s.mergeSegments)
  const toggleUnclear = useQcStore((s) => s.toggleUnclear)
  const qcItems = useQcStore((s) => s.qcItems)
  const toggleQcItemRelated = useQcStore((s) => s.toggleQcItemRelated)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedMergeIds, setSelectedMergeIds] = useState<string[]>([])
  const [mergeMode, setMergeMode] = useState(false)
  const [showOriginal, setShowOriginal] = useState(true)

  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]') as HTMLElement
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentTime])

  const startEdit = (seg: TranscriptSegment) => {
    setEditingId(seg.id)
    setEditValue(seg.revisedText)
  }

  const saveEdit = (id: string) => {
    if (editValue.trim()) {
      updateTranscriptSegment(id, { revisedText: editValue.trim() })
      message.success('已保存修改')
    }
    setEditingId(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleSegmentClick = (seg: TranscriptSegment) => {
    setCurrentTime(seg.startTime)
    setIsPlaying(true)
    onSegmentClick?.(seg.id)

    if (mergeMode) {
      setSelectedMergeIds((prev) =>
        prev.includes(seg.id) ? prev.filter((id) => id !== seg.id) : [...prev, seg.id]
      )
    }
  }

  const doMerge = () => {
    if (selectedMergeIds.length < 2) {
      message.warning('请选择至少2句进行合并')
      return
    }
    mergeSegments(selectedMergeIds)
    message.success(`已合并 ${selectedMergeIds.length} 句话`)
    setSelectedMergeIds([])
    setMergeMode(false)
  }

  const toggleMergeSelect = (e: React.MouseEvent, segId: string) => {
    e.stopPropagation()
    setSelectedMergeIds((prev) =>
      prev.includes(segId) ? prev.filter((id) => id !== segId) : [...prev, segId]
    )
  }

  const isSegmentRelatedToQcItem = (segmentId: string) => {
    if (!selectedQcItemId) return false
    const item = qcItems.find((i) => i.id === selectedQcItemId)
    return item?.relatedSegmentIds.includes(segmentId) || false
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#fff',
        borderRadius: 8,
        border: '1px solid #f0f0f0',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Space>
          <strong style={{ fontSize: 14 }}>📝 通话转写</strong>
          <Tag color="blue">{transcript.length} 句</Tag>
          {mergeMode && <Tag color="orange">合并模式：已选 {selectedMergeIds.length} 句</Tag>}
        </Space>
        <Space size={8}>
          <Tooltip title={showOriginal ? '隐藏原文对比' : '显示原文对比'}>
            <Button
              size="small"
              type={showOriginal ? 'primary' : 'default'}
              icon={<EyeOutlined />}
              onClick={() => setShowOriginal(!showOriginal)}
            >
              原文
            </Button>
          </Tooltip>
          <Tooltip title="选择多句进行合并">
            <Button
              size="small"
              type={mergeMode ? 'primary' : 'default'}
              icon={<MergeCellsOutlined />}
              onClick={() => {
                setMergeMode(!mergeMode)
                setSelectedMergeIds([])
              }}
            >
              {mergeMode ? '取消合并' : '合并模式'}
            </Button>
          </Tooltip>
          {mergeMode && (
            <Popconfirm title="确认合并选中的句子？" onConfirm={doMerge}>
              <Button size="small" type="primary" disabled={selectedMergeIds.length < 2}>
                确认合并
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <div ref={listRef} style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {transcript.map((seg) => {
          const isActive = currentTime >= seg.startTime && currentTime < seg.endTime
          const isEditing = editingId === seg.id
          const isMergeSelected = selectedMergeIds.includes(seg.id)
          const isRelated = isSegmentRelatedToQcItem(seg.id)

          return (
            <div
              key={seg.id}
              data-active={isActive}
              onClick={() => handleSegmentClick(seg)}
              style={{
                padding: '8px 12px',
                marginBottom: 8,
                borderRadius: 6,
                cursor: 'pointer',
                border: `2px solid ${
                  isMergeSelected
                    ? '#fa8c16'
                    : isRelated
                    ? '#722ed1'
                    : isActive
                    ? '#1677ff'
                    : 'transparent'
                }`,
                background: isActive ? '#e6f4ff' : isMergeSelected ? '#fff7e6' : isRelated ? '#f9f0ff' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <Space size={8}>
                  {mergeMode && (
                    <Checkbox
                      checked={isMergeSelected}
                      onClick={(e) => toggleMergeSelect(e, seg.id)}
                    />
                  )}
                  <Tag
                    color={seg.speaker === 'agent' ? 'blue' : 'green'}
                    icon={seg.speaker === 'agent' ? <SoundOutlined /> : null}
                  >
                    {seg.speaker === 'agent' ? `客服 ${currentCall?.agentName || ''}` : '客户'}
                  </Tag>
                  <span style={{ fontSize: 12, color: '#8c8c8c' }}>
                    {formatTime(seg.startTime)} - {formatTime(seg.endTime)}
                  </span>
                  {seg.isUnclear && <Tag color="warning">听不清</Tag>}
                  {seg.isEdited && <Tag color="purple">已修订</Tag>}
                  {seg.isMerged && <Tag color="cyan">已合并</Tag>}
                  {selectedQcItemId && (
                    <Button
                      size="small"
                      type={isRelated ? 'primary' : 'default'}
                      icon={<LinkOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleQcItemRelated(selectedQcItemId, seg.id)
                      }}
                    >
                      {isRelated ? '已关联' : '关联问题'}
                    </Button>
                  )}
                </Space>
                <Space size={4}>
                  {!isEditing ? (
                    <>
                      <Tooltip title="标记为听不清">
                        <Button
                          size="small"
                          type={seg.isUnclear ? 'primary' : 'text'}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleUnclear(seg.id)
                          }}
                        >
                          听不清
                        </Button>
                      </Tooltip>
                      <Tooltip title="编辑文本">
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined />}
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit(seg)
                          }}
                        />
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Button
                        size="small"
                        type="primary"
                        icon={<CheckOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          saveEdit(seg.id)
                        }}
                      />
                      <Button
                        size="small"
                        type="text"
                        icon={<CloseOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          cancelEdit()
                        }}
                      />
                    </>
                  )}
                </Space>
              </div>

              {isEditing ? (
                <Input.TextArea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  onClick={(e) => e.stopPropagation()}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault()
                      saveEdit(seg.id)
                    }
                  }}
                  autoFocus
                />
              ) : (
                <>
                  {showOriginal && seg.isEdited && (
                    <div
                      style={{
                        fontSize: 12,
                        color: '#bfbfbf',
                        textDecoration: 'line-through',
                        marginBottom: 4,
                      }}
                    >
                      原文：{seg.originalText}
                    </div>
                  )}
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: seg.isUnclear ? '#d46b08' : '#262626' }}>
                    {seg.revisedText}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default TranscriptEditor
