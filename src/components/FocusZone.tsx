import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/useApp';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Flame, 
  DollarSign,
  Coffee,
  CheckCircle2
} from 'lucide-react';
import { PageHeader } from '../components/system/Layout';

export const FocusZone: React.FC = () => {
  const { clients, focusSession, updateFocusSession, addFinance } = useApp();
  
  // Timer settings states
  const [mode, setMode] = useState<'pomodoro' | 'stopwatch'>('stopwatch');
  const [selectedClient, setSelectedClient] = useState<string>('');
  
  // Pomodoro states
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [pomodoroMax, setPomodoroMax] = useState(25 * 60);
  const [isBreak, setIsBreak] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  // Billing calculation
  const targetClient = clients.find(c => c.id === selectedClient);
  const billingRate = targetClient?.billingRate || 0; // $/hour
  const ratePerSecond = billingRate / 3600;
  const accumulatedBillable = focusSession.durationSeconds * ratePerSecond;

  // Sound generator simulation states
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [eqHeights, setEqHeights] = useState<number[]>([10, 10, 10, 10, 10, 10, 10, 10]);
  const eqTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleTimerFinish = useCallback(() => {
    updateFocusSession({ isActive: false });
    
    if (!isBreak) {
      // Completed focus session
      setCompletedSessions(prev => prev + 1);
      setIsBreak(true);
      setPomodoroSeconds(5 * 60); // 5 min break
      setPomodoroMax(5 * 60);
      alert('Focus period completed! Time for a short break.');
    } else {
      // Completed break
      setIsBreak(false);
      setPomodoroSeconds(25 * 60); // 25 min focus
      setPomodoroMax(25 * 60);
      alert('Break finished. Let\'s resume coding.');
    }
  }, [isBreak, updateFocusSession]);

  // Core ticking effect — use ref to avoid restarting every second
  const durationRef = useRef(focusSession.durationSeconds);
  useEffect(() => {
    durationRef.current = focusSession.durationSeconds;
  }, [focusSession.durationSeconds]);

  useEffect(() => {
    if (!focusSession.isActive) return;

    const interval = setInterval(() => {
      updateFocusSession({ durationSeconds: durationRef.current + 1 });

      if (mode === 'pomodoro') {
        setPomodoroSeconds(prev => {
          if (prev <= 1) {
            handleTimerFinish();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [focusSession.isActive, mode, handleTimerFinish, updateFocusSession]);

  // EQ Audio Visualizer effect
  useEffect(() => {
    if (activeSound && focusSession.isActive) {
      eqTimerRef.current = setInterval(() => {
        setEqHeights(prev => prev.map(() => Math.floor(Math.random() * 45) + 5));
      }, 100);
    }
    return () => {
      if (eqTimerRef.current) {
        clearInterval(eqTimerRef.current);
        eqTimerRef.current = null;
      }
    };
  }, [activeSound, focusSession.isActive]);

  const handlePlayPause = () => {
    updateFocusSession({ 
      isActive: !focusSession.isActive,
      type: mode,
      currentClientId: selectedClient || undefined
    });
  };

  const handleReset = () => {
    updateFocusSession({ isActive: false, durationSeconds: 0 });
    if (mode === 'pomodoro') {
      setIsBreak(false);
      setPomodoroSeconds(25 * 60);
      setPomodoroMax(25 * 60);
    }
  };

  // Log accumulated billing to ledger
  const handleLogBillingToLedger = () => {
    if (!selectedClient || accumulatedBillable <= 1) return;
    
    const clientCompany = targetClient?.company || 'Freelance Client';
    const totalHours = (focusSession.durationSeconds / 3600).toFixed(2);
    
    addFinance({
      date: new Date().toISOString().split('T')[0],
      description: `Billing Log: ${totalHours} hours work for ${clientCompany}`,
      amount: accumulatedBillable,
      type: 'income',
      category: 'client_payment',
      clientId: selectedClient
    });

    alert(`Successfully logged $${accumulatedBillable.toFixed(2)} to ledger under ${clientCompany}!`);
    handleReset();
  };

  // Convert seconds to readable format
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Radial Circle Calculations
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const currentVal = mode === 'pomodoro' ? pomodoroSeconds : focusSession.durationSeconds % 3600;
  const maxVal = mode === 'pomodoro' ? pomodoroMax : 3600;
  const offset = circumference - (currentVal / maxVal) * circumference;

  const ambientTracks = [
    { id: 'grid', name: 'Midnight Grid Synth', desc: 'Low-fi coding pads' },
    { id: 'quantum', name: 'Quantum Shield Core', desc: 'Industrial fan drone' },
    { id: 'rain', name: 'Neo-Tokyo Rain', desc: 'Subtle water drops & vinyl crack' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {/* Header */}
      <PageHeader title="Focus Chamber" description="Deep work portal, ambient synthesizers, and client stopwatch billing." />

      {/* Main layout */}
      <div className="page-body" style={{
        display: 'grid',
        gridTemplateColumns: '1.5fr 1fr',
        gap: '1.5rem',
        alignItems: 'start',
        overflowY: 'auto'
      }}>
        
        {/* Core Timer Panel */}
        <div className="glass-panel" style={{ 
          borderRadius: 'var(--radius-lg)', 
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Mode Switcher */}
          <div style={{ display: 'flex', gap: '0.5rem', zIndex: 5 }}>
            <button
              onClick={() => { setMode('stopwatch'); handleReset(); }}
              className="glass-btn"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                borderRadius: '4px',
                borderColor: mode === 'stopwatch' ? 'var(--accent-cyan)' : 'transparent',
                color: mode === 'stopwatch' ? 'var(--accent-cyan)' : 'var(--text-secondary)'
              }}
              disabled={focusSession.isActive}
            >
              Stopwatch Billing
            </button>
            <button
              onClick={() => { setMode('pomodoro'); handleReset(); }}
              className="glass-btn"
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem',
                borderRadius: '4px',
                borderColor: mode === 'pomodoro' ? 'var(--accent-cyan)' : 'transparent',
                color: mode === 'pomodoro' ? 'var(--accent-cyan)' : 'var(--text-secondary)'
              }}
              disabled={focusSession.isActive}
            >
              Pomodoro Focus
            </button>
          </div>

          {/* SVG Radial Progress Ring */}
          <div style={{ position: 'relative', width: 'min(220px, 65vw)', height: 'min(220px, 65vw)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="100%" height="100%" viewBox="0 0 220 220" style={{ transform: 'rotate(-90deg)' }}>
              {/* Back Circle */}
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth="6"
              />
              {/* Active Circle */}
              <circle
                cx="110"
                cy="110"
                r={radius}
                fill="transparent"
                stroke={isBreak ? 'var(--accent-teal)' : 'var(--accent-cyan)'}
                strokeWidth="6"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ 
                  transition: 'stroke-dashoffset 0.5s ease',
                  filter: `drop-shadow(0 0 5px ${isBreak ? 'var(--accent-teal)' : 'var(--accent-cyan)'})`
                }}
              />
            </svg>

            {/* Centered Timer Text */}
            <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {mode === 'pomodoro' && isBreak && (
                <Coffee size={20} className="text-teal" style={{ marginBottom: '0.25rem', animation: 'pulse-cyan 1s infinite' }} />
              )}
              {mode === 'pomodoro' && !isBreak && (
                <Flame size={20} className="text-cyan" style={{ marginBottom: '0.25rem', animation: 'pulse-cyan 1.5s infinite' }} />
              )}
              <h3 className="mono" style={{ fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                {mode === 'pomodoro' ? formatTime(pomodoroSeconds) : formatTime(focusSession.durationSeconds)}
              </h3>
              <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '0.2rem', textTransform: 'uppercase' }}>
                {mode === 'pomodoro' ? (isBreak ? 'BREAK INTERVAL' : 'FOCUS BLOCKS') : 'ELAPSED TRACK'}
              </span>
            </div>
          </div>

          {/* Controls Bar */}
          <div style={{ display: 'flex', gap: '0.75rem', zIndex: 5 }}>
            <button 
              onClick={handlePlayPause} 
              className={`glass-btn ${focusSession.isActive ? 'btn-magenta' : 'btn-cyan'}`}
              style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--radius-md)', minWidth: '110px' }}
            >
              {focusSession.isActive ? (
                <>
                  <Pause size={16} /> Pause
                </>
              ) : (
                <>
                  <Play size={16} /> Engage
                </>
              )}
            </button>
            <button 
              onClick={handleReset} 
              className="glass-btn"
              style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)' }}
              title="Reset timer"
            >
              <RotateCcw size={16} className="text-secondary" />
            </button>
          </div>

          {/* Billing metadata for stopwatch */}
          {mode === 'stopwatch' && (
            <div style={{
              width: '100%',
              borderTop: '1px solid var(--panel-border)',
              paddingTop: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Select client for billable logging</label>
                <select
                  className="glass-input"
                  style={{ background: '#0a0814' }}
                  value={selectedClient}
                  onChange={e => setSelectedClient(e.target.value)}
                  disabled={focusSession.isActive}
                >
                  <option value="">-- No Client (Internal Project) --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.company} (${c.billingRate}/hr)</option>
                  ))}
                </select>
              </div>

              {selectedClient && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0, 245, 212, 0.02)',
                  border: '1px solid rgba(0, 245, 212, 0.15)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 1rem',
                  marginTop: '0.25rem'
                }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ACCUMULATED BILLABLE</span>
                    <h4 className="mono text-teal" style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center' }}>
                      <DollarSign size={16} /> {accumulatedBillable.toFixed(2)}
                    </h4>
                  </div>
                  
                  <button
                    onClick={handleLogBillingToLedger}
                    className="glass-btn btn-cyan"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                    disabled={focusSession.isActive || focusSession.durationSeconds < 5}
                  >
                    Commit to Ledger
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Pomodoro Session count */}
          {mode === 'pomodoro' && (
            <div style={{
              width: '100%',
              borderTop: '1px solid var(--panel-border)',
              paddingTop: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Completed Rounds</span>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {Array.from({ length: 4 }).map((_, idx) => (
                  <CheckCircle2 
                    key={idx} 
                    size={16} 
                    className={idx < completedSessions ? "text-cyan" : "text-muted"} 
                    style={{ opacity: idx < completedSessions ? 1 : 0.3 }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ambient music visualizer console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Ambient Audio Generator</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {ambientTracks.map(track => {
                const isPlaying = activeSound === track.id;
                
                return (
                  <div 
                    key={track.id}
                    onClick={() => setActiveSound(isPlaying ? null : track.id)}
                    className="glass-card"
                    style={{
                      cursor: 'pointer',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderColor: isPlaying ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.04)',
                      background: isPlaying ? 'rgba(0, 240, 255, 0.02)' : 'rgba(255,255,255,0.01)'
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem', display: 'block' }}>{track.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{track.desc}</span>
                    </div>

                    <button className="glass-btn" style={{ padding: '0.35rem', background: 'transparent' }}>
                      {isPlaying ? (
                        <Volume2 size={14} className="text-cyan" />
                      ) : (
                        <VolumeX size={14} className="text-muted" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Glowing Graphic Equalizer simulation */}
            {activeSound && focusSession.isActive && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--panel-border)', paddingTop: '1.25rem' }}>
                <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', display: 'block', marginBottom: '0.75rem' }}>
                  EQ_FREQUENCY_SPECTRUM // OUTPUT
                </span>
                <div style={{
                  height: '50px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-around',
                  padding: '0 10px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  {eqHeights.map((h, i) => (
                    <div
                      key={i}
                      style={{
                        width: '8px',
                        height: `${h}%`,
                        backgroundColor: 'var(--accent-cyan)',
                        boxShadow: '0 0 5px var(--accent-cyan-glow)',
                        borderRadius: '2px',
                        transition: 'height 0.1s ease'
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
