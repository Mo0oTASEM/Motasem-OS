import React from 'react';
import { FileCheck, Calendar, User, Award } from 'lucide-react';
import type { CharacterContract } from '../types';

interface ContractCardProps {
  contract: CharacterContract;
  onComplete?: (id: string) => void;
  onFail?: (id: string) => void;
  onDelete?: (id: string) => void;
  saving?: boolean;
}

export const ContractCard: React.FC<ContractCardProps> = ({ contract, onComplete, onFail, onDelete, saving }) => {
  const statusColor = contract.completionStatus === 'completed' ? 'var(--accent-teal)'
    : contract.completionStatus === 'failed' ? 'var(--accent-magenta)'
    : contract.isActive ? 'var(--accent-cyan)' : 'var(--text-muted)';

  return (
    <div className="glass-card" style={{ padding: '1rem', borderLeft: `3px solid ${statusColor}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileCheck size={16} style={{ color: statusColor }} />
          <strong style={{ fontSize: '0.85rem' }}>{contract.title}</strong>
        </div>
        <span className="badge" style={{
          background: `${statusColor}20`,
          color: statusColor,
          fontSize: '0.6rem',
        }}>
          {contract.completionStatus === 'completed' ? 'Completed' : contract.completionStatus === 'failed' ? 'Failed' : contract.isActive ? 'Active' : 'Pending'}
        </span>
      </div>

      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
        {contract.measurableCommitment}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
        {contract.accountabilityPerson && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <User size={12} /> {contract.accountabilityPerson}
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
          <Calendar size={12} /> {contract.reportingFrequency}
        </span>
        {contract.endDate && (
          <span>Due: {new Date(contract.endDate).toLocaleDateString()}</span>
        )}
        {contract.stakeType !== 'none' && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <Award size={12} /> {contract.stakeType} stake
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {contract.isActive && onComplete && (
          <button className="glass-btn btn-cyan"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
            onClick={() => onComplete(contract.id)} disabled={saving}>
            Complete
          </button>
        )}
        {contract.isActive && onFail && (
          <button className="glass-btn"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
            onClick={() => onFail(contract.id)} disabled={saving}>
            Fail
          </button>
        )}
        {onDelete && (
          <button className="glass-btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem' }}
            onClick={() => onDelete(contract.id)}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
};
