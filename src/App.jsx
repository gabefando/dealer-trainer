import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import Home from './pages/Home'
import ChipCountingSprint from './modules/module1/ChipCountingSprint'
import PayoutCalculator from './modules/module2/PayoutCalculator'
import HandValueTrainer from './modules/module3/HandValueTrainer'
import SideBetSpotter from './modules/module4/SideBetSpotter'
import BasicStrategy from './modules/module5/BasicStrategy'
import RulesQuiz from './modules/module6/RulesQuiz'
import DealSimulator from './modules/module7/DealSimulator'

function BackBar({ title }) {
  const navigate = useNavigate()
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.04)',
      borderBottom: '1px solid rgba(255,215,0,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <button
        onClick={() => navigate('/')}
        style={{
          background: 'none',
          border: 'none',
          color: '#FFD700',
          fontSize: 22,
          cursor: 'pointer',
          padding: '4px 8px 4px 0',
          lineHeight: 1,
        }}
        aria-label="Back to Home"
      >
        ←
      </button>
      <span style={{ fontWeight: 700, fontSize: 16, color: 'white' }}>{title}</span>
    </div>
  )
}

function ModuleWrapper({ title, children }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#1a1a2e', display: 'flex', flexDirection: 'column' }}>
      <BackBar title={title} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/module/1" element={
          <ModuleWrapper title="Chip Counting Sprint">
            <ChipCountingSprint />
          </ModuleWrapper>
        } />
        <Route path="/module/2" element={
          <ModuleWrapper title="Payout Calculator Sprint">
            <PayoutCalculator />
          </ModuleWrapper>
        } />
        <Route path="/module/3" element={
          <ModuleWrapper title="Hand Value Trainer">
            <HandValueTrainer />
          </ModuleWrapper>
        } />
        <Route path="/module/4" element={
          <ModuleWrapper title="Side Bet Spotter">
            <SideBetSpotter />
          </ModuleWrapper>
        } />
        <Route path="/module/5" element={
          <ModuleWrapper title="Basic Strategy Flashcards">
            <BasicStrategy />
          </ModuleWrapper>
        } />
        <Route path="/module/6" element={
          <ModuleWrapper title="Rules Quiz">
            <RulesQuiz />
          </ModuleWrapper>
        } />
        <Route path="/module/7" element={
          <ModuleWrapper title="Full Deal Simulator">
            <DealSimulator />
          </ModuleWrapper>
        } />
      </Routes>
    </BrowserRouter>
  )
}
