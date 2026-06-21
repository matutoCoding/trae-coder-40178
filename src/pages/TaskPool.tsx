import { useMemo } from 'react'
import { Layout, Input, Select, DatePicker, Tag, Button, Table, Space, Typography, Card, Badge } from 'antd'
import { SearchOutlined, CheckCircleOutlined, ClockCircleOutlined, SyncOutlined, PlayCircleOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import type { ColumnsType } from 'antd/es/table'
import { useQcStore } from '../store/qcStore'
import { BUSINESS_LINE_OPTIONS } from '../types'
import type { CallTask, BusinessLine, CallStatus } from '../types'

const { Header, Content } = Layout
const { RangePicker } = DatePicker
const { Title, Text } = Typography

const STATUS_MAP: Record<CallStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: '待质检', color: 'default', icon: <ClockCircleOutlined /> },
  inspecting: { label: '质检中', color: 'processing', icon: <SyncOutlined spin /> },
  completed: { label: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function TaskPool() {
  const filterDate = useQcStore((s) => s.filterDate)
  const filterAgent = useQcStore((s) => s.filterAgent)
  const filterBusinessLine = useQcStore((s) => s.filterBusinessLine)
  const filterStatus = useQcStore((s) => s.filterStatus)
  const setFilterDate = useQcStore((s) => s.setFilterDate)
  const setFilterAgent = useQcStore((s) => s.setFilterAgent)
  const setFilterBusinessLine = useQcStore((s) => s.setFilterBusinessLine)
  const setFilterStatus = useQcStore((s) => s.setFilterStatus)
  const getFilteredCalls = useQcStore((s) => s.getFilteredCalls)
  const selectCall = useQcStore((s) => s.selectCall)
  const allCalls = useQcStore((s) => s.calls)

  const filteredCalls = useMemo(() => getFilteredCalls(), [getFilteredCalls, filterDate, filterAgent, filterBusinessLine, filterStatus])

  const stats = useMemo(() => {
    return {
      total: allCalls.length,
      pending: allCalls.filter((c) => c.status === 'pending').length,
      inspecting: allCalls.filter((c) => c.status === 'inspecting').length,
      completed: allCalls.filter((c) => c.status === 'completed').length,
    }
  }, [allCalls])

  const columns: ColumnsType<CallTask> = [
    {
      title: '通话编号',
      dataIndex: 'callId',
      key: 'callId',
      width: 160,
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: '通话时间',
      dataIndex: 'callTime',
      key: 'callTime',
      width: 170,
      sorter: (a, b) => dayjs(a.callTime).valueOf() - dayjs(b.callTime).valueOf(),
    },
    {
      title: '坐席',
      dataIndex: 'agentName',
      key: 'agentName',
      width: 100,
      render: (name, record) => (
        <Space direction="vertical" size={0}>
          <Text>{name}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>{record.agentId}</Text>
        </Space>
      ),
    },
    {
      title: '业务线',
      dataIndex: 'businessLine',
      key: 'businessLine',
      width: 110,
      render: (v: BusinessLine) => {
        const opt = BUSINESS_LINE_OPTIONS.find((o) => o.value === v)
        return <Tag color="blue">{opt?.label || v}</Tag>
      },
    },
    {
      title: '客户号码',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
      width: 130,
    },
    {
      title: '通话时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 90,
      align: 'center',
      render: (v: number) => formatDuration(v),
      sorter: (a, b) => a.duration - b.duration,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: CallStatus) => {
        const cfg = STATUS_MAP[v]
        return (
          <Tag icon={cfg.icon} color={cfg.color as any}>
            {cfg.label}
          </Tag>
        )
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => selectCall(record.id)}
        >
          {record.status === 'completed' ? '查看' : '开始质检'}
        </Button>
      ),
    },
  ]

  return (
    <Layout style={{ height: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          height: 64,
        }}
      >
        <Title level={4} style={{ margin: 0, color: '#1677ff' }}>
          🎧 质检复核工作台
        </Title>
        <div style={{ flex: 1 }} />
        <Text type="secondary">质检员：张主管</Text>
      </Header>

      <Content style={{ padding: 20, overflow: 'auto' }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <Card size="small" style={{ flex: 1 }}>
              <Space>
                <Badge status="default" />
                <Text type="secondary">全部任务</Text>
                <Text strong style={{ fontSize: 20, marginLeft: 8 }}>{stats.total}</Text>
              </Space>
            </Card>
            <Card size="small" style={{ flex: 1 }}>
              <Space>
                <Badge status="warning" />
                <Text type="secondary">待质检</Text>
                <Text strong style={{ fontSize: 20, marginLeft: 8, color: '#faad14' }}>{stats.pending}</Text>
              </Space>
            </Card>
            <Card size="small" style={{ flex: 1 }}>
              <Space>
                <Badge status="processing" />
                <Text type="secondary">质检中</Text>
                <Text strong style={{ fontSize: 20, marginLeft: 8, color: '#1677ff' }}>{stats.inspecting}</Text>
              </Space>
            </Card>
            <Card size="small" style={{ flex: 1 }}>
              <Space>
                <Badge status="success" />
                <Text type="secondary">已完成</Text>
                <Text strong style={{ fontSize: 20, marginLeft: 8, color: '#52c41a' }}>{stats.completed}</Text>
              </Space>
            </Card>
          </div>

          <Card size="small" title="筛选条件">
            <Space wrap size={16}>
              <div>
                <Text type="secondary" style={{ marginRight: 8 }}>日期：</Text>
                <RangePicker
                  value={filterDate ? [dayjs(filterDate[0]), dayjs(filterDate[1])] : null}
                  onChange={(range: [Dayjs | null, Dayjs | null] | null) => {
                    if (range && range[0] && range[1]) {
                      setFilterDate([range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD')])
                    } else {
                      setFilterDate(null)
                    }
                  }}
                />
              </div>
              <div>
                <Text type="secondary" style={{ marginRight: 8 }}>坐席：</Text>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="输入姓名或工号，如：张小雨 / A10023"
                  style={{ width: 240 }}
                  value={filterAgent}
                  onChange={(e) => setFilterAgent(e.target.value)}
                  allowClear
                />
              </div>
              <div>
                <Text type="secondary" style={{ marginRight: 8 }}>业务线：</Text>
                <Select
                  style={{ width: 160 }}
                  value={filterBusinessLine}
                  onChange={setFilterBusinessLine}
                  options={[
                    { value: 'all', label: '全部' },
                    ...BUSINESS_LINE_OPTIONS,
                  ]}
                />
              </div>
              <div>
                <Text type="secondary" style={{ marginRight: 8 }}>状态：</Text>
                <Select
                  style={{ width: 140 }}
                  value={filterStatus}
                  onChange={setFilterStatus}
                  options={[
                    { value: 'all', label: '全部' },
                    { value: 'pending', label: '待质检' },
                    { value: 'inspecting', label: '质检中' },
                    { value: 'completed', label: '已完成' },
                  ]}
                />
              </div>
            </Space>
          </Card>

          <Card
            size="small"
            title={
              <Space>
                <span>任务列表</span>
                <Tag color="processing">{filteredCalls.length} 条记录</Tag>
              </Space>
            }
          >
            <Table
              size="small"
              columns={columns}
              dataSource={filteredCalls}
              rowKey="id"
              pagination={{ pageSize: 10, showSizeChanger: false }}
              scroll={{ x: 1000 }}
            />
          </Card>
        </Space>
      </Content>
    </Layout>
  )
}

export default TaskPool
