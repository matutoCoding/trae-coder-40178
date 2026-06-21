import { useRef, useEffect, useMemo, useState } from 'react'
import { Button, Slider, Space, Select, Tooltip, Tag, message, Upload, Spin, Alert } from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  FastBackwardOutlined,
  FastForwardOutlined,
  SoundOutlined,
  FolderOpenOutlined,
  AudioOutlined,
  InboxOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useQcStore } from '../store/qcStore'

type AudioSourceType = 'none' | 'silent' | 'remote' | 'local'

function formatTime(seconds: number | null | undefined): string {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return '00:00'
  const sec = Math.floor(seconds)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function generateSilentWav(durationSec: number): string {
  try {
    const safeDuration = Math.max(1, Math.min(durationSec, 3600 * 3))
    const sampleRate = 8000
    const numChannels = 1
    const bitsPerSample = 16
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
    const dataSize = Math.floor(sampleRate * safeDuration * numChannels * (bitsPerSample / 8))
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)

    function writeString(offset: number, str: string) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, byteRate, true)
    view.setUint16(32, numChannels * (bitsPerSample / 8), true)
    view.setUint16(34, bitsPerSample, true)
    writeString(36, 'data')
    view.setUint32(40, dataSize, true)

    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    return `data:audio/wav;base64,${base64}`
  } catch (err) {
    console.warn('[AudioPlayer] 生成静音音频失败:', err)
    return ''
  }
}

function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const currentCall = useQcStore((s) => s.currentCall)
  const currentTime = useQcStore((s) => s.currentTime)
  const isPlaying = useQcStore((s) => s.isPlaying)
  const playbackRate = useQcStore((s) => s.playbackRate)
  const setCurrentTime = useQcStore((s) => s.setCurrentTime)
  const setIsPlaying = useQcStore((s) => s.setIsPlaying)
  const setPlaybackRate = useQcStore((s) => s.setPlaybackRate)
  const setAudioFile = useQcStore((s) => s.setAudioFile)

  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [audioDuration, setAudioDuration] = useState<number>(0)

  const taskDuration = currentCall?.duration ?? 0
  const audioFilePath = currentCall?.audioFilePath ?? ''
  const audioUrl = currentCall?.audioUrl ?? ''

  const silentAudioUrl = useMemo(() => {
    if (taskDuration > 0) return generateSilentWav(taskDuration)
    return ''
  }, [taskDuration])

  const sourceType: AudioSourceType = useMemo(() => {
    if (audioFilePath) return 'local'
    if (audioUrl) return 'remote'
    if (silentAudioUrl) return 'silent'
    return 'none'
  }, [audioFilePath, audioUrl, silentAudioUrl])

  const actualAudioSrc = useMemo(() => {
    if (audioFilePath) return audioFilePath
    if (audioUrl) return audioUrl
    if (silentAudioUrl) return silentAudioUrl
    return ''
  }, [audioFilePath, audioUrl, silentAudioUrl])

  const displayDuration = audioDuration > 0 ? audioDuration : taskDuration

  const audioLabel = useMemo(() => {
    switch (sourceType) {
      case 'local':
        if (typeof audioFilePath === 'string' && audioFilePath.startsWith('blob:')) return '本地文件'
        return audioFilePath.split(/[\\/]/).pop() || '本地文件'
      case 'remote':
        return '任务原始录音（URL）'
      case 'silent':
        return '静音占位音频'
      default:
        return '暂无音频'
    }
  }, [sourceType, audioFilePath])

  useEffect(() => {
    if (!audioRef.current) return
    try {
      audioRef.current.playbackRate = playbackRate
    } catch (err) {
      console.warn('[AudioPlayer] 设置倍速失败:', err)
    }
  }, [playbackRate])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !actualAudioSrc) return
    try {
      const target = Math.min(
        Math.max(0, currentTime),
        isFinite(audio.duration) && audio.duration > 0 ? audio.duration - 0.05 : taskDuration
      )
      if (isFinite(target) && Math.abs(audio.currentTime - target) > 0.2) {
        audio.currentTime = target
      }
    } catch (err) {
      console.warn('[AudioPlayer] 设置进度失败:', err)
    }
  }, [currentTime, actualAudioSrc, taskDuration])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    let cancelled = false

    if (isPlaying) {
      Promise.resolve()
        .then(() => {
          if (cancelled || !audioRef.current) return
          return audioRef.current.play()
        })
        .then(() => {})
        .catch((err) => {
          console.warn('[AudioPlayer] 播放失败:', err?.message || err)
          if (!cancelled) setIsPlaying(false)
        })
    } else {
      try {
        audio.pause()
      } catch (err) {
        console.warn('[AudioPlayer] 暂停失败:', err)
      }
    }

    return () => {
      cancelled = true
    }
  }, [isPlaying, actualAudioSrc, setIsPlaying])

  useEffect(() => {
    setLoading(false)
    setLoadError(null)
    setAudioDuration(taskDuration)
  }, [actualAudioSrc, taskDuration])

  const handleTimeUpdate = () => {
    try {
      const audio = audioRef.current
      if (audio && isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime)
      }
    } catch (err) {}
  }

  const handleLoadedMetadata = () => {
    try {
      setLoading(false)
      const audio = audioRef.current
      if (audio && isFinite(audio.duration) && audio.duration > 0) {
        setAudioDuration(audio.duration)
      }
    } catch (err) {}
  }

  const handleWaiting = () => setLoading(true)
  const handlePlaying = () => {
    setLoading(false)
    setLoadError(null)
  }
  const handleError = () => {
    setLoading(false)
    if (sourceType === 'remote') {
      setLoadError('远程音频加载失败，请检查网络或导入本地音频')
    } else if (sourceType === 'local') {
      setLoadError('本地音频加载失败，请重新选择文件')
    }
    setIsPlaying(false)
  }

  const togglePlay = () => {
    if (sourceType === 'none') {
      message.warning('请先导入本地音频文件或为任务配置录音地址')
      return
    }
    setIsPlaying(!isPlaying)
  }

  const seek = (time: number) => {
    const max = isFinite(audioDuration) && audioDuration > 0 ? audioDuration : taskDuration
    const target = Math.max(0, Math.min(time, max))
    setCurrentTime(target)
  }

  const skip = (delta: number) => {
    seek(currentTime + delta)
  }

  const uploadProps: UploadProps = {
    accept: 'audio/*,.mp3,.wav,.m4a,.ogg,.aac',
    showUploadList: false,
    multiple: false,
    beforeUpload: (file) => {
      try {
        const url = URL.createObjectURL(file)
        setAudioFile(url)
        setIsPlaying(false)
        setCurrentTime(0)
        setLoadError(null)
        message.success(`已加载音频：${file.name}`)
      } catch (err) {
        message.error('音频文件导入失败')
      }
      return false
    },
  }

  return (
    <div
      style={{
        padding: '16px 20px',
        background: sourceType === 'none' ? '#374151' : sourceType === 'silent' ? '#1f2937' : '#001529',
        borderRadius: 8,
        color: '#fff',
        transition: 'all 0.3s',
      }}
    >
      <Spin spinning={loading} tip="音频加载中..." wrapperClassName="qc-audio-spin">
        {sourceType === 'none' ? (
          <Alert
            type="warning"
            showIcon
            icon={<InboxOutlined />}
            message={
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <span>当前任务暂无录音，请导入本地音频文件</span>
                <Upload {...uploadProps}>
                  <Button size="small" icon={<FolderOpenOutlined />}>
                    选择本地音频
                  </Button>
                </Upload>
              </Space>
            }
            style={{
              marginBottom: 12,
              background: '#fffbe6',
              border: '1px solid #ffe58f',
            }}
          />
        ) : (
          <div
            style={{
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <Space wrap size={8}>
              {sourceType === 'remote' && <GlobalOutlined style={{ color: '#1677ff' }} />}
              {sourceType === 'local' && <AudioOutlined style={{ color: '#52c41a' }} />}
              {sourceType === 'silent' && <InboxOutlined style={{ color: '#fbbf24' }} />}
              <Tag
                color={
                  sourceType === 'remote'
                    ? 'blue'
                    : sourceType === 'local'
                    ? 'success'
                    : 'warning'
                }
              >
                {sourceType === 'remote'
                  ? '任务原始录音'
                  : sourceType === 'local'
                  ? '本地导入'
                  : '静音占位'}
              </Tag>
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>{audioLabel}</span>
            </Space>
            <Upload {...uploadProps}>
              <Button
                size="small"
                type={sourceType === 'silent' ? 'primary' : 'default'}
                ghost
                icon={<FolderOpenOutlined />}
              >
                {sourceType === 'silent' ? '导入真实录音' : '更换音频'}
              </Button>
            </Upload>
          </div>
        )}

        {loadError && (
          <Alert
            type="error"
            showIcon
            message={loadError}
            style={{ marginBottom: 12 }}
            action={
              <Upload {...uploadProps}>
                <Button size="small" danger>
                  重新选择
                </Button>
              </Upload>
            }
          />
        )}

        <div style={{ marginBottom: 12 }}>
          <Slider
            value={isFinite(currentTime) ? currentTime : 0}
            max={isFinite(displayDuration) ? displayDuration : 0}
            step={0.1}
            disabled={sourceType === 'none'}
            onChange={(v) => seek(v as number)}
            tooltip={{
              formatter: (v) => formatTime(v as number),
            }}
            styles={{
              track: {
                background:
                  sourceType === 'silent'
                    ? '#6b7280'
                    : sourceType === 'none'
                    ? '#4b5563'
                    : '#1677ff',
              },
              rail: { background: '#434343' },
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: '#8c8c8c',
              marginTop: -6,
            }}
          >
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(displayDuration)}</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <Space size={8}>
            <Tooltip title="后退10秒">
              <Button
                type="text"
                icon={<FastBackwardOutlined />}
                onClick={() => skip(-10)}
                disabled={sourceType === 'none'}
                style={{ color: '#fff' }}
              />
            </Tooltip>
            <Tooltip title="后退5秒">
              <Button
                type="text"
                icon={<StepBackwardOutlined />}
                onClick={() => skip(-5)}
                disabled={sourceType === 'none'}
                style={{ color: '#fff' }}
              />
            </Tooltip>
            <Button
              type="text"
              icon={
                isPlaying ? (
                  <PauseCircleOutlined style={{ fontSize: 36 }} />
                ) : (
                  <PlayCircleOutlined style={{ fontSize: 36 }} />
                )
              }
              onClick={togglePlay}
              disabled={sourceType === 'none'}
              style={{
                color:
                  sourceType === 'none'
                    ? '#4b5563'
                    : sourceType === 'silent'
                    ? '#9ca3af'
                    : '#1677ff',
                padding: 0,
              }}
            />
            <Tooltip title="前进5秒">
              <Button
                type="text"
                icon={<StepForwardOutlined />}
                onClick={() => skip(5)}
                disabled={sourceType === 'none'}
                style={{ color: '#fff' }}
              />
            </Tooltip>
            <Tooltip title="前进10秒">
              <Button
                type="text"
                icon={<FastForwardOutlined />}
                onClick={() => skip(10)}
                disabled={sourceType === 'none'}
                style={{ color: '#fff' }}
              />
            </Tooltip>
          </Space>

          <Space size={12}>
            <Space size={4}>
              <SoundOutlined style={{ color: '#8c8c8c' }} />
              <Select
                size="small"
                value={playbackRate}
                onChange={setPlaybackRate}
                style={{ width: 80 }}
                disabled={sourceType === 'none'}
                options={[
                  { value: 0.5, label: '0.5x' },
                  { value: 0.75, label: '0.75x' },
                  { value: 1, label: '1x' },
                  { value: 1.25, label: '1.25x' },
                  { value: 1.5, label: '1.5x' },
                  { value: 2, label: '2x' },
                ]}
              />
            </Space>
          </Space>
        </div>
      </Spin>

      <audio
        ref={audioRef}
        src={actualAudioSrc || undefined}
        preload="metadata"
        crossOrigin={sourceType === 'remote' ? 'anonymous' : undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onCanPlay={handlePlaying}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={handleError}
      />
    </div>
  )
}

export default AudioPlayer
