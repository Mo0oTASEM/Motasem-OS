import React from 'react';
import { Brain, ArrowRight, CheckCircle2, XCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import type { CharacterIfThenRule } from '../types';

interface IfThenRuleCardProps {
  rule: CharacterIfThenRule;
  onTrigger?: (id: string, followed: boolean) => void;
  onToggle?: (id: string) => void;
  onDelete?: (id: string) => void;
  saving?: boolean;
}

export const IfThenRuleCard: React.FC<IfThenRuleCardProps> = ({ rule, onTrigger, onToggle, onDelete, saving }) => {
  const total = rule.successCount + rule.failureCount;
  const pct = total > 0 ? Math.round((rule.successCount / total) * 100) : 0;

  return (
    <div className="glass-card" style={{
      padding: '1rem',
      opacity: rule.isActive ? 1 : 0.5,
      borderLeft: `3px solid ${rule.isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Brain size={16} className="text-cyan" />
          <strong style={{ fontSize: '0.85rem' }}>If-Then Rule</strong>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <span className="badge badge-cyan" style={{ fontSize: '0.6rem' }}>
            {rule.effectivenessScore > 0 ? `${rule.effectivenessScore}%` : `${pct}%`}
          </span>
          {onToggle && (
            <button className="glass-btn" style={{ padding: '0.15rem 0.35rem', fontSize: '0.6rem' }}
              onClick={() => onToggle(rule.id)}>
              {rule.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            </button>
          )}
        </div>
      </div>

      <div style={{ fontSize: '0.78rem', marginBottom: '0.5rem', lineHeight: 1.5 }}>
        <span style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>IF</span>{' '}
        {rule.triggerCondition}
      </div>
      <div style={{ fontSize: '0.78rem', marginBottom: '0.5rem', lineHeight: 1.5 }}>
        <span style={{ color: 'var(--accent-teal)', fontWeight: 600 }}>THEN</span>{' '}
        <ArrowRight size={12} style={{ verticalAlign: 'middle' }} />{' '}
        {rule.responseAction}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        <span>Followed: {rule.successCount}</span>
        <span>Missed: {rule.failureCount}</span>
        {rule.linkedTraitId && <span>Linked to trait</span>}
        {rule.linkedBadGuyId && <span>Linked to bad guy</span>}
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {onTrigger && rule.isActive && (
          <>
            <button className="glass-btn btn-cyan"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              onClick={() => onTrigger(rule.id, true)} disabled={saving}>
              <CheckCircle2 size={12} /> Followed
            </button>
            <button className="glass-btn"
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              onClick={() => onTrigger(rule.id, false)} disabled={saving}>
              <XCircle size={12} /> Missed
            </button>
          </>
        )}
        {onDelete && (
          <button className="glass-btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
            onClick={() => onDelete(rule.id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
};
