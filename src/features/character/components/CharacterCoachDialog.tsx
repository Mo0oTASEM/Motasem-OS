import React, { useState } from 'react';
import { Bot, X, Send, Loader2, Lightbulb, Zap, Star, Shield } from 'lucide-react';
import type { CoachMessageRequest } from '../services/characterCoachTypes';
import type { CoachResult, CoachChatResponse } from '../services/characterCoachClient';

interface CharacterCoachDialogProps {
  open: boolean;
  onClose: () => void;
  onSendMessage: (req: CoachMessageRequest) => Promise<CoachResult<CoachChatResponse>>;
  brainContext: string;
}

const COACH_INTRO = "I'm your Character Coach. I can help you reflect on your progress, suggest next actions, or help you work through a tough moment. What's on your mind?";

const SUGGESTED_PROMPTS = [
  { icon: Lightbulb, label: 'Suggest action', query: 'What should I work on today?' },
  { icon: Star, label: 'Review progress', query: 'How am I progressing?' },
  { icon: Zap, label: 'Motivate me', query: 'Give me a boost of motivation' },
  { icon: Shield, label: 'Handle a struggle', query: 'I am struggling with something' },
];

export const CharacterCoachDialog: React.FC<CharacterCoachDialogProps> = ({ open, onClose, onSendMessage, brainContext }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'coach' | 'user'; text: string; disclaimer?: string }[]>([
    { role: 'coach', text: COACH_INTRO },
  ]);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSend = async (overrideText?: string) => {
    const text = overrideText ?? input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    const history = messages.filter(m => m.role !== 'coach' || m.text !== COACH_INTRO).slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.text,
    }));
    const result = await onSendMessage({ message: text, history, characterContext: brainContext });
    if (result.ok && result.data) {
      setMessages(prev => [...prev, { role: 'coach', text: result.data!.reply, disclaimer: result.data!.disclaimer }]);
    } else {
      setMessages(prev => [...prev, { role: 'coach', text: result.error ?? 'Sorry, I could not process that. Please try again.' }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '500px', padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bot size={20} className="text-cyan" />
            <strong>AI Character Coach</strong>
          </div>
          <button className="glass-btn" style={{ padding: '0.25rem' }} onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {messages.map((msg, i) => (
            <div key={i}>
              <div style={{
                display: 'flex', gap: '0.5rem',
                flexDirection: msg.role === 'coach' ? 'row' : 'row-reverse',
              }}>
                <div style={{
                  background: msg.role === 'coach' ? 'var(--panel-bg)' : 'rgba(37, 99, 235, 0.15)',
                  padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.78rem',
                  lineHeight: 1.5, maxWidth: '80%', color: 'var(--text-primary)',
                }}>
                  {msg.text}
                </div>
              </div>
              {msg.disclaimer && (
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                  {msg.disclaimer}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <Loader2 size={14} className="spin" /> Coach is thinking...
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {SUGGESTED_PROMPTS.map(({ icon: Icon, label, query }) => (
              <button key={label} className="glass-btn"
                style={{ padding: '0.3rem 0.5rem', fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                onClick={() => handleSend(query)}>
                <Icon size={10} /> {label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--panel-border)', display: 'flex', gap: '0.5rem' }}>
          <input
            className="glass-input"
            style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.78rem' }}
            placeholder="Ask your coach..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="glass-btn btn-cyan" style={{ padding: '0.5rem' }} onClick={() => handleSend()} disabled={loading || !input.trim()}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
