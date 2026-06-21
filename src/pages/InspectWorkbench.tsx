import { useState } from 'react'
import { Layout, Button, Space, Tag, Typography, Breadcrumb, Alert, Tooltip } from 'antd'
import {
  ArrowLeftOutlined,
  FileTextOutlined,
  PhoneOutlined,
  UserOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  SendOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { useQcStore } from '../store/qcStore'
import { BUSINESS_LINE_OPTIONS } from '../types'
import AudioPlayer from '../components/AudioPlayer'
import TranscriptEditor from '../components/TranscriptEditor'
import QcScorecard from '../components/QcScorecard'
import ConclusionModal from '../components/ConclusionModal'
import type { QcConclusion } from '../types'

const { Header, Content, Sider } = Layout
const { Title, Text } = Typography

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}分${s}秒`
}

function InspectWorkbench() {
  const currentCall = useQcStore((s) => s.currentCall)
  const clearCurrentCall = useQcStore((s) => s.clearCurrentCall)
  const qcItems = useQcStore((s) => s.qcItems)

  const [selectedQcItemId, setSelectedQcItemId] = useState<string | null>(null)
  const [conclusionModalOpen, setConclusionModalOpen] = useState(false)

  const totalScore = qcItems.reduce((s, i) => s + i.score, 0)
  const maxScore = qcItems.reduce((s, i) => s + i.maxScore, 0)
  const completedCount = qcItems.filter((i) => i.isPassed !== null).length
  const pendingCount = qcItems.length - completedCount

  const businessLineLabel = BUSINESS_LINE_OPTIONS.find((o) => o.value === currentCall?.businessLine)?.label
  const isCompleted = currentCall?.status === 'completed'
  const hasConclusion = !!currentCall?.qcConclusion

  const handleConclusionSubmitted = (_conclusion: QcConclusion) => {
    setConclusionModalOpen(false)
    clearCurrentCall()
  }

  if (!currentCall) return null

  return (
    <Layout style={{ height: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          padding: '0 16px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Space>
          <Tooltip title="返回任务池">
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={clearCurrentCall}
            />
          </Tooltip>
          <Breadcrumb
            items={[
              { title: '任务池', onClick: clearCurrentCall },
              { title: isCompleted ? '质检结果查看' : '逐通复核工作台' },
            ]}
          />
        </Space>

        <div style={{ flex: 1, marginLeft: 24 }}>
          <Space size={16}>
            <Space size={4}>
              <PhoneOutlined style={{ color: '#1677ff' }} />
              <Text strong>{currentCall.callId}</Text>
            </Space>
            <Tag color="blue">{businessLineLabel}</Tag>
            <Space size={4}>
              <UserOutlined />
              <Text type="secondary">坐席：</Text>
              <Text strong>
                {currentCall.agentName}（{currentCall.agentId}）
              </Text>
            </Space>
            <Space size={4}>
              <ClockCircleOutlined />
              <Text type="secondary">{currentCall.callTime}</Text>
              <Text type="secondary">·</Text>
              <Text type="secondary">{formatDuration(currentCall.duration)}</Text>
            </Space>
          </Space>
        </div>

        <Space>
          {isCompleted ? (
            <>
              <Tag color="success" icon={<CheckCircleOutlined />}>
                已完成质检
              </Tag>
              {hasConclusion && (
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  onClick={() => setConclusionModalOpen(true)}
                >
                  查看质检报告
                </Button>
              )}
            </>
          ) : (
            <>
              <Alert
                type={pendingCount === 0 ? 'success' : 'info'}
                showIcon
                message={
                  pendingCount === 0
                    ? `质检完成 ${completedCount}/${qcItems.length} 项，得分 ${totalScore}/${maxScore}`
                    : `已完成 ${completedCount}/${qcItems.length} 项，剩余 ${pendingCount} 项待判定`
                }
                style={{ padding: '0 12px', height: 32 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={() => setConclusionModalOpen(true)}
              >
                提交质检结论
              </Button>
            </>
          )}
        </Space>
      </Header>

      <Layout>
        <Content style={{ padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 12 }}>
            <AudioPlayer />
          </div>

          {selectedQcItemId && (
            <Alert
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              message={
                <Space>
                  <Text>正在标记质检项关联片段</Text>
                  <Text type="secondary">- 点击转写文本中的句子，可跳转播放并标记为该质检项的问题片段</Text>
                  <Button size="small" onClick={() => setSelectedQcItemId(null)}>
                    取消标记
                  </Button>
                </Space>
              }
              style={{ marginBottom: 12 }}
            />
          )}

          <div style={{ flex: 1, overflow: 'hidden' }}>
            <TranscriptEditor
              selectedQcItemId={selectedQcItemId}
              onSegmentClick={() => {}}
            />
          </div>
        </Content>

        <Sider
          width={420}
          style={{
            background: '#f5f5f5',
            padding: 16,
            borderLeft: '1px solid #f0f0f0',
            overflow: 'hidden',
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
              <FileTextOutlined style={{ color: '#1677ff' }} />
              <Title level={5} style={{ margin: 0 }}>质检评分表</Title>
            </Space>
            <Tooltip title="点击某项可关联转写中的问题片段">
              <Tag color="purple">点击质检项可标记问题</Tag>
            </Tooltip>
          </div>
          <div style={{ height: 'calc(100% - 44px)', overflow: 'hidden' }}>
            <QcScorecard
              selectedQcItemId={selectedQcItemId}
              onSelectQcItem={setSelectedQcItemId}
            />
          </div>
        </Sider>
      </Layout>

      <ConclusionModal
        open={conclusionModalOpen}
        onClose={() => setConclusionModalOpen(false)}
        onSubmitted={handleConclusionSubmitted}
      />
    </Layout>
  )
}

export default InspectWorkbench
