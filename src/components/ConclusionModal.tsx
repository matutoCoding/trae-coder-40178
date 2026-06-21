import { useState } from 'react'
import {
  Modal,
  Button,
  Input,
  Space,
  Card,
  Tag,
  Typography,
  Descriptions,
  Divider,
  Alert,
  message,
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { useQcStore } from '../store/qcStore'
import { QC_CATEGORY_LABELS } from '../types'
import type { QcConclusion } from '../types'

const { Text, Title, Paragraph } = Typography
const { TextArea } = Input

interface ConclusionModalProps {
  open: boolean
  onClose: () => void
  onSubmitted: (conclusion: QcConclusion) => void
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function ConclusionModal({ open, onClose, onSubmitted }: ConclusionModalProps) {
  const currentCall = useQcStore((s) => s.currentCall)
  const qcItems = useQcStore((s) => s.qcItems)
  const submitConclusion = useQcStore((s) => s.submitConclusion)

  const [inspectorName, setInspectorName] = useState('张主管')
  const [overallComment, setOverallComment] = useState('')
  const [submitted, setSubmitted] = useState<QcConclusion | null>(null)

  const pendingCount = qcItems.filter((i) => i.isPassed === null).length
  const canSubmit = pendingCount === 0 && inspectorName.trim()

  const totalScore = qcItems.reduce((s, i) => s + i.score, 0)
  const maxScore = qcItems.reduce((s, i) => s + i.maxScore, 0)
  const isPassed = totalScore >= maxScore * 0.8

  const handleSubmit = () => {
    if (!canSubmit) return
    try {
      const conclusion = submitConclusion(inspectorName.trim(), overallComment.trim())
      setSubmitted(conclusion)
      message.success('质检结论已提交！')
    } catch (e) {
      message.error('提交失败')
    }
  }

  const handleClose = () => {
    if (submitted) {
      onSubmitted(submitted)
    }
    setSubmitted(null)
    onClose()
  }

  return (
    <Modal
      title={submitted ? '质检结论已生成' : '提交质检结论'}
      open={open}
      onCancel={handleClose}
      width={800}
      footer={
        submitted ? (
          <Button type="primary" onClick={handleClose}>
            返回任务池
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
      {pendingCount > 0 && !submitted && (
        <Alert
          type="warning"
          showIcon
          message={`还有 ${pendingCount} 项质检项未完成判定，请先完成所有质检项`}
          style={{ marginBottom: 16 }}
        />
      )}

      {submitted ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card
            style={{
              textAlign: 'center',
              background: isPassed ? '#f6ffed' : '#fff2f0',
              border: `1px solid ${isPassed ? '#b7eb8f' : '#ffa39e'}`,
            }}
          >
            <Space direction="vertical">
              {isPassed ? (
                <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
              ) : (
                <CloseCircleOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
              )}
              <Title level={3} style={{ margin: 0, color: isPassed ? '#52c41a' : '#ff4d4f' }}>
                {isPassed ? '质检合格' : '质检不合格'}
              </Title>
              <Text>
                综合得分 <strong style={{ fontSize: 20 }}>{submitted.totalScore}</strong> / {submitted.maxScore} 分
              </Text>
            </Space>
          </Card>

          <Card size="small" title="基本信息">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="通话编号">{submitted.callId}</Descriptions.Item>
              <Descriptions.Item label="质检员">{submitted.inspectorName}</Descriptions.Item>
              <Descriptions.Item label="质检时间">{submitted.inspectTime}</Descriptions.Item>
              <Descriptions.Item label="问题片段">{submitted.problemFragments.length} 处</Descriptions.Item>
            </Descriptions>
          </Card>

          {submitted.problemFragments.length > 0 && (
            <Card
              size="small"
              title={
                <Space>
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                  <span>问题片段明细</span>
                  <Tag color="error">{submitted.problemFragments.length} 处</Tag>
                </Space>
              }
            >
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {submitted.problemFragments.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 12,
                      background: '#fff2f0',
                      borderRadius: 6,
                      border: '1px solid #ffccc7',
                    }}
                  >
                    <Space style={{ marginBottom: 8 }}>
                      <Tag color="purple">{QC_CATEGORY_LABELS[f.category as keyof typeof QC_CATEGORY_LABELS] || f.category}</Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        时间点：{formatTime(f.startTime)} - {formatTime(f.endTime)}
                      </Text>
                    </Space>
                    <Paragraph style={{ marginBottom: 8 }}>
                      <Text type="secondary">原文：</Text>
                      {f.revisedText ? (
                        <>
                          <span style={{ textDecoration: 'line-through', color: '#bfbfbf' }}>{f.originalText}</span>
                          <br />
                          <Text type="secondary">修订：</Text>
                          <span style={{ color: '#722ed1' }}>{f.revisedText}</span>
                        </>
                      ) : (
                        f.originalText
                      )}
                    </Paragraph>
                    <Paragraph style={{ marginBottom: 4 }}>
                      <Text strong type="danger">原因：</Text>
                      {f.reason}
                    </Paragraph>
                    {f.suggestion && (
                      <Paragraph style={{ margin: 0 }}>
                        <Text strong style={{ color: '#1677ff' }}>建议：</Text>
                        {f.suggestion}
                      </Paragraph>
                    )}
                  </div>
                ))}
              </Space>
            </Card>
          )}

          {submitted.overallComment && (
            <Card size="small" title="总体评语">
              <Paragraph style={{ margin: 0 }}>{submitted.overallComment}</Paragraph>
            </Card>
          )}
        </Space>
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card size="small" title="质检摘要">
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
              <Descriptions.Item label="不通过项">
                {qcItems.filter((i) => i.isPassed === false).length} 项
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card size="small" title="不通过项预览">
            {qcItems.filter((i) => i.isPassed === false).length === 0 ? (
              <Alert type="success" showIcon message="本次质检无不合格项，全部通过！" />
            ) : (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {qcItems
                  .filter((i) => i.isPassed === false)
                  .map((item) => (
                    <div
                      key={item.id}
                      style={{ padding: 8, background: '#fff2f0', borderRadius: 4 }}
                    >
                      <Space>
                        <Tag color="purple">{QC_CATEGORY_LABELS[item.category]}</Tag>
                        <Text strong>{item.label}</Text>
                        <Tag color="error">-{item.maxScore}分</Tag>
                      </Space>
                      {item.deductionReason && (
                        <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
                          原因：{item.deductionReason}
                        </div>
                      )}
                    </div>
                  ))}
              </Space>
            )}
          </Card>

          <div>
            <Text strong>质检员姓名</Text>
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
            />
          </div>
        </Space>
      )}
    </Modal>
  )
}

export default ConclusionModal
