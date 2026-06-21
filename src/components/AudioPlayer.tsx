import { useRef, useEffect, useMemo } from 'react'
import { Button, Slider, Space, Select, Tooltip, Tag, message, Upload } from 'antd'
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
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import { useQcStore } from '../store/qcStore'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function generateSilentWav(durationSec: number): string {
  const sampleRate = 8000
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const dataSize = Math.floor(sampleRate * durationSec * numChannels * (bitsPerSample / 8))
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
}

function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const currentCall = useQcStore((s) => s.currentCall)
  const currentTime = useQcStore((s) => s.currentTime)
  const isPlaying = useQcStore((s) => s.isPlaying)
  const playbackRate = useQcStore((s) => s.playbackRate)
  const setCurrentTime = useQcStore((s) => s.setCurrentTime)
  const setIsPlaying = useQcStore((s) => s.setIsPlaying)
  const setPlaybackRate = useQcStore((s) => s.setPlaybackRate)
  const setAudioFile = useQcStore((s) => s.setAudioFile)

  const duration = currentCall?.duration || 0
  const audioFilePath = currentCall?.audioFilePath || ''

  const silentAudioUrl = useMemo(() => {
    if (duration > 0) return generateSilentWav(duration)
    return ''
  }, [duration])

  const actualAudioSrc = audioFilePath || silentAudioUrl
  const hasRealAudio = !!audioFilePath

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  useEffect(() => {
    if (!audioRef.current) return
    if (Math.abs(audioRef.current.currentTime - currentTime) > 0.2) {
      audioRef.current.currentTime = currentTime
    }
  }, [currentTime])

  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn('播放失败:', err)
      })
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying, actualAudioSrc])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current && currentCall) {
      const actualDur = audioRef.current.duration
      if (isFinite(actualDur) && Math.abs(actualDur - duration) > 1) {
        console.log(`音频时长 ${actualDur}s，转写时长 ${duration}s`)
      }
    }
  }

  const togglePlay = () => {
    setIsPlaying(!isPlaying)
  }

  const seek = (time: number) => {
    setCurrentTime(Math.max(0, Math.min(time, duration)))
  }

  const skip = (delta: number) => {
    seek(currentTime + delta)
  }

  const uploadProps: UploadProps = {
    accept: 'audio/*',
    showUploadList: false,
    beforeUpload: (file) => {
      const url = URL.createObjectURL(file)
      setAudioFile(url)
      setIsPlaying(false)
      setCurrentTime(0)
      message.success(`已加载音频：${file.name}`)
      return false
    },
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setAudioFile(url)
      setIsPlaying(false)
      setCurrentTime(0)
      message.success(`已加载音频：${file.name}`)
    }
  }

  const audioDurationLabel = audioRef.current?.duration
    ? formatTime(audioRef.current.duration)
    : formatTime(duration)

  return (
    <div
      style={{
        padding: '16px 20px',
        background: hasRealAudio ? '#001529' : '#1f2937',
        borderRadius: 8,
        color: '#fff',
        transition: 'all 0.3s',
      }}
    >
      {!hasRealAudio && (
        <div
          style={{
            marginBottom: 12,
            padding: '8px 12px',
            background: '#374151',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            <InboxOutlined style={{ color: '#fbbf24' }} />
            <span style={{ fontSize: 13, color: '#d1d5db' }}>
              当前使用静音占位音频，请导入真实录音文件
            </span>
          </Space>
          <Upload {...uploadProps}>
            <Button size="small" icon={<FolderOpenOutlined />}>
              选择本地音频
            </Button>
          </Upload>
        </div>
      )}

      {hasRealAudio && (
        <div
          style={{
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            <AudioOutlined style={{ color: '#52c41a' }} />
            <Tag color="success">已加载本地音频</Tag>
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>
              {audioFilePath && (
                typeof audioFilePath === 'string' && audioFilePath.startsWith('blob:')
                  ? '本地文件'
                  : audioFilePath.split(/[\\/]/).pop())
              }
            </span>
          </Space>
          <Upload {...uploadProps}>
            <Button size="small" type="primary" ghost icon={<FolderOpenOutlined />}>
              更换音频
            </Button>
          </Upload>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <Slider
          value={currentTime}
          max={isFinite(audioRef.current?.duration || 0) ? audioRef.current?.duration : duration}
          step={0.1}
          onChange={(v) => seek(v as number)}
          tooltip={{
            formatter: (v) => formatTime(v as number),
          }}
          styles={{
            track: { background: hasRealAudio ? '#1677ff' : '#6b7280' },
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
          <span>{audioDurationLabel}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space size={8}>
          <Tooltip title="后退10秒">
            <Button
              type="text"
              icon={<FastBackwardOutlined />}
              onClick={() => skip(-10)}
              style={{ color: '#fff' }}
            />
          </Tooltip>
          <Tooltip title="后退5秒">
            <Button
              type="text"
              icon={<StepBackwardOutlined />}
              onClick={() => skip(-5)}
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
            style={{ color: hasRealAudio ? '#1677ff' : '#9ca3af', padding: 0 }}
          />
          <Tooltip title="前进5秒">
            <Button
              type="text"
              icon={<StepForwardOutlined />}
              onClick={() => skip(5)}
              style={{ color: '#fff' }}
            />
          </Tooltip>
          <Tooltip title="前进10秒">
            <Button
              type="text"
              icon={<FastForwardOutlined />}
              onClick={() => skip(10)}
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

      <input
        type="file"
        ref={fileInputRef}
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <audio
        ref={audioRef}
        src={actualAudioSrc}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  )
}

export default AudioPlayer
