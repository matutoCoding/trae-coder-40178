import { useRef, useEffect } from 'react'
import { Button, Slider, Space, Select, Tooltip } from 'antd'
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StepBackwardOutlined,
  StepForwardOutlined,
  FastBackwardOutlined,
  FastForwardOutlined,
  SoundOutlined,
} from '@ant-design/icons'
import { useQcStore } from '../store/qcStore'

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
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

  const duration = currentCall?.duration || 0

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(() => {})
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying])

  useEffect(() => {
    if (audioRef.current && Math.abs(audioRef.current.currentTime - currentTime) > 0.2) {
      audioRef.current.currentTime = currentTime
    }
  }, [currentTime])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
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

  return (
    <div
      style={{
        padding: '16px 20px',
        background: '#001529',
        borderRadius: 8,
        color: '#fff',
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <Slider
          value={currentTime}
          max={duration}
          step={0.1}
          onChange={(v) => seek(v as number)}
          tooltip={{
            formatter: (v) => formatTime(v as number),
          }}
          styles={{
            track: { background: '#1677ff' },
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
          <span>{formatTime(duration)}</span>
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
            icon={isPlaying ? <PauseCircleOutlined style={{ fontSize: 36 }} /> : <PlayCircleOutlined style={{ fontSize: 36 }} />}
            onClick={togglePlay}
            style={{ color: '#1677ff', padding: 0 }}
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

      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <source src={currentCall?.audioUrl || ''} type="audio/mpeg" />
      </audio>
    </div>
  )
}

export default AudioPlayer
