import { useState, useMemo } from 'react'
import {
  Modal,
  Button,
  Input,
  Space,
  Card,
  Tag,
  Typography,
  Descriptions,
  Alert,
  message,
  List,
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  FileTextOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useQcStore } from '../store/qcStore'
import { QC_CATEGORY_LABELS } from '../types'
import type { QcConclusion, QcCheckItem, ProblemFragment } from '../types'

const { Text, Title, Paragraph } = Typography
const { TextArea } = Input

interface ConclusionModalProps {
  open: boolean
  onClose: () => void
  onSubmitted: (conclusion: QcConclusion) => void
  viewOnly?: boolean
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

interface FailedItemWithFragments {
  item: QcCheckItem
  fragments: ProblemFragment[]
}

function ConclusionModal({ open, onClose, onSubmitted, viewOnly }: ConclusionModalProps) {
  const currentCall = useQcStore((s) => s.currentCall)
  const qcItems = useQcStore((s) => s.qcItems)
  const validateSubmittable = useQcStore((s) => s.validateSubmittable)
  const submitConclusion = useQcStore((s) => s.submitConclusion)

  const [inspectorName, setInspectorName] = useState('张主管')
  const [overallComment, setOverallComment] = useState('')
  const [submitted, setSubmitted] = useState<QcConclusion | null>(null)
  const [showErrors, setShowErrors] = useState(false)

  const existingConclusion = currentCall?.qcConclusion
  const isViewOnly = viewOnly || !!existingConclusion
  const displayConclusion = submitted || existingConclusion || null

  const validation = useMemo(() => validateSubmittable(), [qcItems, validateSubmittable])
  const canSubmit = validation.ok && inspectorName.trim()

  const totalScore = qcItems.reduce((s, i) => s + i.score, 0)
  const maxScore = qcItems.reduce((s, i) => s + i.maxScore, 0)
  const isPassed = totalScore >= maxScore * 0.8

  const failedItemsWithFragments: FailedItemWithFragments[] = useMemo(() => {
    if (!currentCall) return []
    const items = displayConclusion ? displayConclusion.items : qcItems
    const fragmentsSource = displayConclusion ? displayConclusion.problemFragments : null

    return items
      .filter((item) => item.isPassed === false)
      .map((item) => {
        let fragments: ProblemFragment[]
        if (fragmentsSource) {
          fragments = fragmentsSource.filter((f) => {
            const seg = currentCall.transcript.find((s) => s.id === f.segmentId)
            return item.relatedSegmentIds.includes(f.segmentId) || seg?.startTime !== undefined
          })
          fragments = item.relatedSegmentIds
            .map((sid) => {
              const frag = fragmentsSource.find((f) => f.segmentId === sid)
              if (frag) return frag
              const seg = currentCall.transcript.find((s) => s.id === sid)
              return {
                segmentId: sid,
                originalText: seg?.originalText || '',
                revisedText: seg?.isEdited ? seg.revisedText : undefined,
                startTime: seg?.startTime || 0,
                endTime: seg?.endTime || 0,
                category: item.category,
                reason: item.deductionReason || '未填写原因',
                suggestion: item.suggestedScript,
              }
            })
            .filter(Boolean) as ProblemFragment[]
        } else {
          fragments = item.relatedSegmentIds
            .map((segId) => {
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
        }
        return { item, fragments }
      })
  }, [qcItems, currentCall, displayConclusion])

  const handleSubmit = () => {
    if (!canSubmit) {
      setShowErrors(true)
      message.error('请先完成所有不通过项的填写')
      return
    }
    try {
      const conclusion = submitConclusion(inspectorName.trim(), overallComment.trim())
      setSubmitted(conclusion)
      setShowErrors(false)
      message.success('质检结论已提交！')
    } catch (e) {
      message.error('提交失败')
    }
  }

  const handleClose = () => {
    if (submitted && !isViewOnly) {
      onSubmitted(submitted)
    }
    setSubmitted(null)
    setShowErrors(false)
    onClose()
  }

  const showResult = !!displayConclusion
  const resultScore = displayConclusion ? displayConclusion.totalScore : totalScore
  const resultMaxScore = displayConclusion ? displayConclusion.maxScore : maxScore
  const resultPassed = displayConclusion ? displayConclusion.isPassed : isPassed

  return (
    <Modal
      title={showResult ? '✅ 质检报告' : '📋 提交质检结论'}
      open={open}
      onCancel={handleClose}
      width={860}
      footer={
        showResult ? (
          <Button type="primary" size="large" onClick={handleClose}>
            {submitted ? '返回任务池' : '关闭'}
          </Button>
        ) : (
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" disabled={!canSubmit} onClick={handleSubmit}>
              确认提交
            </Button>
          </Space>
        )
      }
    >
      {showErrors && !showResult && validation.errors.length > 0 && (
        <Alert
          type="error"
          showIcon
          icon={<WarningOutlined />}
          message="请先补齐以下信息后再提交"
          description={
            <List
              size="small"
              dataSource={validation.errors}
              renderItem={(err) => (
                <List.Item>
                  <Text type="danger">• {err}</Text>
                </List.Item>
              )}
            />
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {showResult ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card
            style={{
              textAlign: 'center',
              background: resultPassed ? '#f6ffed' : '#fff2f0',
              border: `2px solid ${resultPassed ? '#b7eb8f' : '#ffa39e'}`,
              borderRadius: 12,
            }}
            bodyStyle={{ padding: '24px 32px' }}
          >
            <Space direction="vertical" size={12}>
              {resultPassed ? (
                <CheckCircleOutlined style={{ fontSize: 56, color: '#52c41a' }} />
              ) : (
                <CloseCircleOutlined style={{ fontSize: 56, color: '#ff4d4f' }} />
              )}
              <Title level={2} style={{ margin: 0, color: resultPassed ? '#52c41a' : '#ff4d4f' }}>
                {resultPassed ? '质检合格' : '质检不合格'}
              </Title>
              <Space size={8}>
                <Text type="secondary">综合得分</Text>
                <Text strong style={{ fontSize: 28, color: resultPassed ? '#52c41a' : '#ff4d4f' }}>
                  {resultScore}
                </Text>
                <Text type="secondary" style={{ fontSize: 16 }}>
                  / {resultMaxScore} 分
                </Text>
              </Space>
            </Space>
          </Card>

          <Card size="small" title="📌 基本信息">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="通话编号">
                <Text strong>{displayConclusion!.callId}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="质检员">{displayConclusion!.inspectorName}</Descriptions.Item>
              <Descriptions.Item label="质检时间">{displayConclusion!.inspectTime}</Descriptions.Item>
              <Descriptions.Item label="不合格项">
                <Tag color="error">
                  {displayConclusion!.items.filter((i) => i.isPassed === false).length} 项
                </Tag>
                <Tag color="warning">{displayConclusion!.problemFragments.length} 处问题片段</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {displayConclusion!.problemFragments.length > 0 && (
            <Card
              size="small"
              title={
                <Space>
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                  <span>问题片段明细（按质检项分组）</span>
                </Space>
              }
            >
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {failedItemsWithFragments.map(({ item, fragments }) => (
                  <div
                    key={item.id}
                    style={{
                      padding: 16,
                      background: '#fff2f0',
                      borderRadius: 8,
                      border: '1px solid #ffccc7',
                    }}
                  >
                    <div
                      style={{
                        marginBottom: 12,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Space>
                        <Tag color="purple">
                          {QC_CATEGORY_LABELS[item.category as keyof typeof QC_CATEGORY_LABELS]}
                        </Tag>
                        <Text strong style={{ fontSize: 15 }}>
                          {item.label}
                        </Text>
                        <Tag color="error">-{item.maxScore}分</Tag>
                      </Space>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <Space>
                        <MessageOutlined style={{ color: '#ff4d4f' }} />
                        <Text strong type="danger">
                          扣分原因：
                        </Text>
                      </Space>
                      <Paragraph style={{ margin: '4px 0 0 22px' }}>
                        {item.deductionReason || '未填写'}
                      </Paragraph>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <Space>
                        <FileTextOutlined style={{ color: '#1677ff' }} />
                        <Text strong style={{ color: '#1677ff' }}>
                          建议话术：
                        </Text>
                      </Space>
                      <Paragraph style={{ margin: '4px 0 0 22px', color: '#0958d9' }}>
                        {item.suggestedScript || '未填写'}
                      </Paragraph>
                    </div>

                    <div>
                      <Space style={{ marginBottom: 8 }}>
                        <ClockCircleOutlined style={{ color: '#d46b08' }} />
                        <Text strong style={{ color: '#d46b08' }}>
                          对应问题片段（{fragments.length} 处）：
                        </Text>
                      </Space>
                      <Space direction="vertical" size={8} style={{ width: '100%', paddingLeft: 22 }}>
                        {fragments.map((frag, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              background: '#fff',
                              borderRadius: 6,
                              border: '1px solid #ffd591',
                            }}
                          >
                            <Space style={{ marginBottom: 4 }}>
                              <Tag color="orange" style={{ margin: 0 }}>
                                ⏱ {formatTime(frag.startTime)} - {formatTime(frag.endTime)}
                              </Tag>
                            </Space>
                            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                              {frag.revisedText ? (
                                <>
                                  <div style={{ color: '#bfbfbf', textDecoration: 'line-through' }}>
                                    原文：{frag.originalText}
                                  </div>
                                  <div style={{ color: '#722ed1', marginTop: 2 }}>
                                    修订：{frag.revisedText}
                                  </div>
                                </>
                              ) : (
                                <span>{frag.originalText}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </Space>
                    </div>
                  </div>
                ))}
              </Space>
            </Card>
          )}

          {displayConclusion!.overallComment && (
            <Card size="small" title="📝 总体评语">
              <Paragraph style={{ margin: 0 }}>{displayConclusion!.overallComment}</Paragraph>
            </Card>
          )}
        </Space>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card size="small" title="📊 质检摘要">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="通话编号">{currentCall?.callId}</Descriptions.Item>
              <Descriptions.Item label="坐席">
                {currentCall?.agentName}（{currentCall?.agentId}）
              </Descriptions.Item>
              <Descriptions.Item label="通话时间">{currentCall?.callTime}</Descriptions.Item>
              <Descriptions.Item label="通话时长">
                {currentCall ? formatTime(currentCall.duration) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="综合得分">
                <Text strong style={{ color: isPassed ? '#52c41a' : '#ff4d4f', fontSize: 16 }}>
                  {totalScore}
                </Text>
                <Text type="secondary">/{maxScore}</Text>
                <Tag color={isPassed ? 'success' : 'error'} style={{ marginLeft: 8 }}>
                  {isPassed ? '合格' : '不合格'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="完成进度">
                {qcItems.filter((i) => i.isPassed !== null).length} / {qcItems.length} 项
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card size="small" title="❌ 不通过项预览">
            {failedItemsWithFragments.length === 0 ? (
              <Alert type="success" showIcon message="本次质检无不合格项，全部通过！" />
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {failedItemsWithFragments.map(({ item, fragments }) => {
                  const missingReason = !item.deductionReason || item.deductionReason === '待填写'
                  const missingSuggestion = !item.suggestedScript
                  const missingFragments = item.relatedSegmentIds.length === 0
                  const hasMissing = missingReason || missingSuggestion || missingFragments

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: 12,
                        background: hasMissing ? '#fffbe6' : '#fff2f0',
                        borderRadius: 6,
                        border: `1px solid ${hasMissing ? '#ffe58f' : '#ffccc7'}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
                        <Space>
                          <Tag color="purple">{QC_CATEGORY_LABELS[item.category]}</Tag>
                          <Text strong>{item.label}</Text>
                          <Tag color="error">-{item.maxScore}分</Tag>
                        </Space>
                        {hasMissing && (
                          <Tag color="warning" icon={<WarningOutlined />}>
                            信息待补全
                          </Tag>
                        )}
                      </div>
                      <Space direction="vertical" size={4} style={{ fontSize: 12 }}>
                        {missingReason && (
                          <Text type="warning">⚠ 未填写扣分原因</Text>
                        )}
                        {missingSuggestion && (
                          <Text type="warning">⚠ 未填写建议话术</Text>
                        )}
                        {missingFragments && (
                          <Text type="warning">⚠ 未关联任何问题片段</Text>
                        )}
                        {fragments.length > 0 && (
                          <Text type="secondary">
                            已关联 {fragments.length} 处问题片段
                          </Text>
                        )}
                      </Space>
                    </div>
                  )
                })}
              </Space>
            )}
          </Card>

          <div>
            <Text strong>质检员姓名 <Text type="danger">*</Text></Text>
            <Input
              style={{ marginTop: 4 }}
              value={inspectorName}
              onChange={(e) => setInspectorName(e.target.value)}
              placeholder="请输入质检员姓名"
            />
          </div>

          <div>
            <Text strong>总体评语（可选）</Text>
            <TextArea
              style={{ marginTop: 4 }}
              rows={3}
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              placeholder="请输入总体评语..."
              maxLength={500}
              showCount
            />
          </div>

          {validation.errors.length > 0 && (
            <Alert
              type={showErrors ? 'error' : 'warning'}
              showIcon
              message={
                showErrors
                  ? '提交失败，请补齐以下信息'
                  : `还有 ${validation.errors.length} 项信息待补齐，提交前请确认`
              }
              description={
                <List
                  size="small"
                  dataSource={validation.errors}
                  renderItem={(err) => (
                    <List.Item style={{ padding: '2px 0' }}>
                      <Text type={showErrors ? 'danger' : 'warning'}>• {err}</Text>
                    </List.Item>
                  )}
                />
              }
            />
          )}
        </Space>
      )}
    </Modal>
  )
}

export default ConclusionModal
