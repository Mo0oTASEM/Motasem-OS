import React, { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface CompletionButtonProps {
  onComplete: () => Promise<void> | void;
  isCompleted?: boolean;
  label?: string;
  completedLabel?: string;
  size?: 'sm' | 'md';
}

export const CompletionButton: React.FC<CompletionButtonProps> = ({
  onComplete, isCompleted = false, label = 'Complete', completedLabel = 'Done', size = 'md',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (isCompleted || loading) return;
    setLoading(true);
    setError(null);
    try {
      await onComplete();
    } catch {
      setError('Failed');
    } finally {
      setLoading(false);
    }
  };

  const pad = size === 'sm' ? '0.25rem 0.5rem' : '0.4rem 0.75rem';
  const fontSize = size === 'sm' ? '0.65rem' : '0.72rem';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
      <button
        className={`glass-btn ${isCompleted ? 'btn-cyan' : ''}`}
        onClick={handleClick}
        disabled={isCompleted || loading}
        style={{ padding: pad, fontSize, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
      >
        {loading ? (
          <Loader2 size={size === 'sm' ? 12 : 14} className="spin" />
        ) : (
          <CheckCircle2 size={size === 'sm' ? 12 : 14} />
        )}
        {isCompleted ? completedLabel : label}
      </button>
      {error && <span style={{ fontSize: '0.6rem', color: 'var(--accent-magenta)' }}>{error}</span>}
    </div>
  );
};
