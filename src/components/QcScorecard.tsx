import { useState } from 'react'
import { Card, Button, Input, Space, Tag, Progress, Tooltip, Divider, Typography, Badge } from 'antd'
import {
  CheckCircleTwoTone,
  CloseCircleTwoTone,
  ExclamationCircleOutlined,
  MessageOutlined,
} from '@ant-design/icons'
import { useQcStore } from '../store/qcStore'
import { QC_CATEGORY_LABELS } from '../types'
import type { QcCheckItem } from '../types'

const { Text, Paragraph } = Typography
const { TextArea } = Input

interface QcScorecardProps {
  selectedQcItemId: string | null
  onSelectQcItem: (id: string | null) => void
}

function QcScorecard({ selectedQcItemId, onSelectQcItem }: QcScorecardProps) {
  const qcItems = useQcStore((s) => s.qcItems)
  const setQcItemPassed = useQcStore((s) => s.setQcItemPassed)
  const currentCall = useQcStore((s) => s.currentCall)

  const [localReasons, setLocalReasons] = useState<Record<string, string>>({})
  const [localSuggestions, setLocalSuggestions] = useState<Record<string, string>>({})

  const totalScore = qcItems.reduce((s, i) => s + i.score, 0)
  const maxScore = qcItems.reduce((s, i) => s + i.maxScore, 0)
  const percent = Math.round((totalScore / maxScore) * 100)
  const completed = qcItems.filter((i) => i.isPassed !== null).length

  const handlePass = (item: QcCheckItem, passed: boolean) => {
    setQcItemPassed(
      item.id,
      passed,
      passed ? undefined : localReasons[item.id] || '待填写',
      passed ? undefined : localSuggestions[item.id]
    )
  }

  const categoryGroups = qcItems.reduce<Record<string, QcCheckItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <Card
        size="small"
        style={{
          background: `linear-gradient(135deg, ${percent >= 80 ? '#52c41a' : percent >= 60 ? '#faad14' : '#ff4d4f'}15 0%, #fff 100%)`,
          border: `1px solid ${percent >= 80 ? '#52c41a40' : percent >= 60 ? '#faad1440' : '#ff4d4f40'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space direction="vertical" size={0}>
            <Text type="secondary">综合得分</Text>
            <div>
              <span style={{ fontSize: 32, fontWeight: 700, color: percent >= 80 ? '#52c41a' : percent >= 60 ? '#faad14' : '#ff4d4f' }}>
                {totalScore}
              </span>
              <Text type="secondary" style={{ fontSize: 16, marginLeft: 4 }}>/{maxScore}</Text>
            </div>
            <Space size={8}>
              <Badge status={percent >= 80 ? 'success' : percent >= 60 ? 'warning' : 'error'} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {percent >= 80 ? '合格' : percent >= 60 ? '待改进' : '不合格'} · 已检 {completed}/{qcItems.length} 项
              </Text>
            </Space>
          </Space>
          <Progress
            type="dashboard"
            percent={percent}
            size={80}
            strokeColor={percent >= 80 ? '#52c41a' : percent >= 60 ? '#faad14' : '#ff4d4f'}
          />
        </div>
      </Card>

      <div style={{ flex: 1, overflow: 'auto', paddingRight: 4 }}>
        {Object.entries(categoryGroups).map(([category, items]) => (
          <Card
            key={category}
            size="small"
            style={{ marginBottom: 12 }}
            title={
              <Space>
                <Text strong>{QC_CATEGORY_LABELS[category as QcCheckItem['category']]}</Text>
                <Tag color="blue">{items.length}项</Tag>
              </Space>
            }
          >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {items.map((item) => {
                const isSelected = selectedQcItemId === item.id
                const relatedCount = item.relatedSegmentIds.length
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectQcItem(isSelected ? null : item.id)}
                    style={{
                      padding: 12,
                      borderRadius: 6,
                      border: `2px solid ${isSelected ? '#1677ff' : item.isPassed === true ? '#52c41a40' : item.isPassed === false ? '#ff4d4f40' : '#f0f0f0'}`,
                      background: isSelected ? '#e6f4ff' : item.isPassed === true ? '#f6ffed' : item.isPassed === false ? '#fff2f0' : '#fafafa',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        <Space align="start">
                          <Text strong>{item.label}</Text>
                          <Tag color={item.isPassed === null ? 'default' : item.isPassed ? 'success' : 'error'}>
                            {item.score}/{item.maxScore}分
                          </Tag>
                          {relatedCount > 0 && (
                            <Tag color="purple">已关联 {relatedCount} 处</Tag>
                          )}
                        </Space>
                        <Paragraph
                          type="secondary"
                          style={{ fontSize: 12, margin: '4px 0 0 0' }}
                          ellipsis={{ rows: 2 }}
                        >
                          {item.description}
                        </Paragraph>
                      </div>
                      <Space size={4} onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="通过">
                          <Button
                            size="small"
                            type={item.isPassed === true ? 'primary' : 'text'}
                            icon={<CheckCircleTwoTone twoToneColor="#52c41a" />}
                            onClick={() => handlePass(item, true)}
                          />
                        </Tooltip>
                        <Tooltip title="不通过">
                          <Button
                            size="small"
                            type={item.isPassed === false ? 'primary' : 'text'}
                            danger={item.isPassed === false}
                            icon={<CloseCircleTwoTone twoToneColor="#ff4d4f" />}
                            onClick={() => handlePass(item, false)}
                          />
                        </Tooltip>
                      </Space>
                    </div>

                    {item.isPassed === false && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 12,
                          background: '#fff',
                          borderRadius: 4,
                          border: '1px solid #ffccc7',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          <div>
                            <Space>
                              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                              <Text strong type="danger" style={{ fontSize: 12 }}>扣分原因</Text>
                            </Space>
                            <TextArea
                              size="small"
                              placeholder="请输入扣分原因，例如：未使用标准开场白"
                              value={localReasons[item.id] || item.deductionReason || ''}
                              onChange={(e) => {
                                setLocalReasons({ ...localReasons, [item.id]: e.target.value })
                                if (item.isPassed === false) {
                                  setQcItemPassed(
                                    item.id,
                                    false,
                                    e.target.value || '待填写',
                                    localSuggestions[item.id] || item.suggestedScript
                                  )
                                }
                              }}
                              autoSize={{ minRows: 1, maxRows: 3 }}
                              style={{ marginTop: 4 }}
                            />
                          </div>
                          <div>
                            <Space>
                              <MessageOutlined style={{ color: '#1677ff' }} />
                              <Text strong style={{ fontSize: 12, color: '#1677ff' }}>建议话术</Text>
                            </Space>
                            <TextArea
                              size="small"
                              placeholder="请输入建议话术，例如：您好，我是XX银行客服XXX，工号XXXX，很高兴为您服务"
                              value={localSuggestions[item.id] || item.suggestedScript || ''}
                              onChange={(e) => {
                                setLocalSuggestions({ ...localSuggestions, [item.id]: e.target.value })
                                if (item.isPassed === false) {
                                  setQcItemPassed(
                                    item.id,
                                    false,
                                    localReasons[item.id] || item.deductionReason || '待填写',
                                    e.target.value
                                  )
                                }
                              }}
                              autoSize={{ minRows: 1, maxRows: 3 }}
                              style={{ marginTop: 4 }}
                            />
                          </div>
                        </Space>
                      </div>
                    )}
                  </div>
                )
              })}
            </Space>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default QcScorecard
