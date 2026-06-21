import { useState } from 'react'
import TaskPool from './pages/TaskPool'
import InspectWorkbench from './pages/InspectWorkbench'
import { useQcStore } from './store/qcStore'

function App() {
  const currentCall = useQcStore((s) => s.currentCall)
  return currentCall ? <InspectWorkbench /> : <TaskPool />
}

export default App
