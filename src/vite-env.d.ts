export {}

declare global {
  interface Window {
    electronAPI: {
      selectAudioFile: () => Promise<string | null>
    }
  }
}
