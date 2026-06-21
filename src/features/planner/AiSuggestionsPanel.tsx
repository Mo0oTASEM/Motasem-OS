import React, { useState, useCallback } from 'react';
import { cloudRunClient } from '../../lib/api/cloudRunClient';

// ── Types ──────────────────────────────────────────────────────────────────

type SuggestionType =
  | 'schedule_suggestion'
  | 'priority_reorder'
  | 'risk_alert'
  | 'capacity_warning'
  | 'goal_insight'
  | 'momentum_tip';

type SuggestionRisk = 'low' | 'medium' | 'high';

interface ProposedChange {
  operation: string;
  entityType: string;
  entityId: string;
  currentValue?: unknown;
  proposedValue?: unknown;
  field?: string;
}

interface AiSuggestion {
  id: string;
  type: SuggestionType;
  title: string;
  explanation: string;
  proposedChange?: ProposedChange;
  risk: SuggestionRisk;
  requiresApproval: boolean;
  affectedEntityType?: string;
  affectedEntityId?: string;
  affectedEntityTitle?: string;
  confidence: number;
  generatedAt: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

interface AiSuggestionsPanelProps {
  workspaceId: string;
  quarterId?: string;
  goalId?: string;
  monthlyPlanId?: string;
  /** Optional: called when a priority change is approved so the parent can refresh */
  onApplyChange?: (change: ProposedChange) => Promise<void>;
}

// ── Sub-components ─────────────────────────────────────────────────────────

const TYPE_META: Record<SuggestionType, { icon: string; label: string; color: string }> = {
  schedule_suggestion: { icon: '📅', label: 'Scheduling', color: 'var(--planner-ai-blue)' },
  priority_reorder:    { icon: '⚖️', label: 'Priority',   color: 'var(--planner-ai-purple)' },
  risk_alert:          { icon: '⚠️', label: 'Risk',        color: 'var(--planner-ai-orange)' },
  capacity_warning:    { icon: '📊', label: 'Capacity',    color: 'var(--planner-ai-teal)' },
  goal_insight:        { icon: '💡', label: 'Insight',     color: 'var(--planner-ai-yellow)' },
  momentum_tip:        { icon: '🚀', label: 'Momentum',    color: 'var(--planner-ai-green)' },
};

const RISK_BADGE: Record<SuggestionRisk, { label: string; cls: string }> = {
  low:    { label: 'Low risk',    cls: 'ai-risk-low' },
  medium: { label: 'Medium risk', cls: 'ai-risk-medium' },
  high:   { label: 'High risk',   cls: 'ai-risk-high' },
};

const ConfidenceBar: React.FC<{ confidence: number }> = ({ confidence }) => (
  <div className="ai-confidence-bar" title={`AI confidence: ${Math.round(confidence * 100)}%`}>
    <div className="ai-confidence-fill" style={{ width: `${Math.round(confidence * 100)}%` }} />
  </div>
);

interface PreviewModalProps {
  suggestion: AiSuggestion;
  onConfirm: () => void;
  onCancel: () => void;
  applying: boolean;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ suggestion, onConfirm, onCancel, applying }) => {
  const change = suggestion.proposedChange;
  return (
    <div className="ai-preview-overlay" onClick={onCancel}>
      <div className="ai-preview-modal" onClick={e => e.stopPropagation()}>
        <div className="ai-preview-header">
          <span className="ai-preview-icon">🔍</span>
          <h3>Preview Change</h3>
        </div>
        <p className="ai-preview-summary">{suggestion.title}</p>
        <p className="ai-preview-explanation">{suggestion.explanation}</p>

        {change && (
          <div className="ai-preview-change">
            <div className="ai-preview-change-row">
              <span className="ai-change-label">Entity</span>
              <span className="ai-change-value">
                {suggestion.affectedEntityTitle ?? change.entityId}
                <em> ({change.entityType})</em>
              </span>
            </div>
            <div className="ai-preview-change-row">
              <span className="ai-change-label">Field</span>
              <span className="ai-change-value">{change.field ?? change.operation}</span>
            </div>
            {change.currentValue !== undefined && (
              <div className="ai-preview-change-row">
                <span className="ai-change-label">Current</span>
                <span className="ai-change-value ai-change-old">{String(change.currentValue)}</span>
              </div>
            )}
            <div className="ai-preview-change-row">
              <span className="ai-change-label">New value</span>
              <span className="ai-change-value ai-change-new">{String(change.proposedValue)}</span>
            </div>
          </div>
        )}

        <div className="ai-preview-actions">
          <button className="ai-preview-cancel" onClick={onCancel} disabled={applying}>
            Cancel
          </button>
          <button className="ai-preview-confirm" onClick={onConfirm} disabled={applying}>
            {applying ? 'Applying…' : 'Apply Change'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface SuggestionCardProps {
  suggestion: AiSuggestion;
  onDismiss: (id: string) => void;
  onAccept: (suggestion: AiSuggestion) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onDismiss, onAccept }) => {
  const meta = TYPE_META[suggestion.type] ?? TYPE_META.goal_insight;
  const riskBadge = RISK_BADGE[suggestion.risk];

  if (suggestion.status === 'dismissed') return null;
  if (suggestion.status === 'accepted') {
    return (
      <div className="ai-suggestion-card ai-suggestion-accepted">
        <span className="ai-accepted-icon">✓</span>
        <span className="ai-accepted-label">{suggestion.title} — applied</span>
      </div>
    );
  }

  return (
    <div className="ai-suggestion-card" style={{ borderLeftColor: meta.color }}>
      <div className="ai-suggestion-top">
        <span className="ai-suggestion-type-icon">{meta.icon}</span>
        <span className="ai-suggestion-type-label" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <span className={`ai-risk-badge ${riskBadge.cls}`}>{riskBadge.label}</span>
        <button
          className="ai-suggestion-dismiss"
          onClick={() => onDismiss(suggestion.id)}
          title="Dismiss"
          aria-label="Dismiss suggestion"
        >
          ×
        </button>
      </div>

      <h4 className="ai-suggestion-title">{suggestion.title}</h4>
      <p className="ai-suggestion-explanation">{suggestion.explanation}</p>

      {suggestion.affectedEntityTitle && (
        <div className="ai-suggestion-entity">
          <span className="ai-entity-icon">→</span>
          <span>{suggestion.affectedEntityTitle}</span>
        </div>
      )}

      <div className="ai-suggestion-footer">
        <ConfidenceBar confidence={suggestion.confidence} />
        <div className="ai-suggestion-actions">
          {suggestion.requiresApproval ? (
            <button className="ai-btn ai-btn-preview" onClick={() => onAccept(suggestion)}>
              Preview &amp; Apply
            </button>
          ) : (
            <button className="ai-btn ai-btn-accept" onClick={() => onAccept(suggestion)}>
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Panel ─────────────────────────────────────────────────────────────

type LoadingKey = 'schedule' | 'risks' | 'priority' | 'capacity';

export const AiSuggestionsPanel: React.FC<AiSuggestionsPanelProps> = ({
  workspaceId,
  quarterId,
  monthlyPlanId,
  onApplyChange
}) => {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [loading, setLoading] = useState<LoadingKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewTarget, setPreviewTarget] = useState<AiSuggestion | null>(null);
  const [applying, setApplying] = useState(false);
  const [ran, setRan] = useState<Set<LoadingKey>>(new Set());

  const addSuggestions = (incoming: AiSuggestion[]) => {
    setSuggestions(prev => {
      // Merge, deduplicating by id
      const existingIds = new Set(prev.map(s => s.id));
      const fresh = incoming.filter(s => !existingIds.has(s.id));
      return [...prev, ...fresh];
    });
  };

  const runAnalysis = useCallback(async (key: LoadingKey) => {
    if (!workspaceId) return;
    setLoading(key);
    setError(null);
    try {
      let result: { suggestions: Record<string, unknown>[] } | null = null;

      if (key === 'schedule' && quarterId) {
        result = await cloudRunClient.plannerApi.aiSuggestSchedule({
          workspaceId,
          quarterId,
          monthlyPlanId
        });
      } else if (key === 'risks' && quarterId) {
        result = await cloudRunClient.plannerApi.aiDetectRisks({ workspaceId, quarterId });
      } else if (key === 'priority' && quarterId) {
        result = await cloudRunClient.plannerApi.aiPrioritize({ workspaceId, quarterId });
      } else if (key === 'capacity') {
        result = await cloudRunClient.plannerApi.aiAnalyzeCapacity({
          workspaceId,
          quarterId
        });
      }

      if (result?.suggestions) {
        addSuggestions(result.suggestions as unknown as AiSuggestion[]);
      }
      setRan(prev => new Set([...prev, key]));
    } catch (err) {
      setError((err as Error).message || 'AI analysis failed. Please try again.');
    } finally {
      setLoading(null);
    }
  }, [workspaceId, quarterId, monthlyPlanId]);

  const handleDismiss = (id: string) => {
    setSuggestions(prev =>
      prev.map(s => s.id === id ? { ...s, status: 'dismissed' } : s)
    );
  };

  const handleAccept = (suggestion: AiSuggestion) => {
    if (suggestion.requiresApproval && suggestion.proposedChange) {
      setPreviewTarget(suggestion);
    } else {
      // Non-destructive insight — just mark as accepted
      setSuggestions(prev =>
        prev.map(s => s.id === suggestion.id ? { ...s, status: 'accepted' } : s)
      );
    }
  };

  const handleConfirmPreview = async () => {
    if (!previewTarget) return;
    setApplying(true);
    let success = false;
    let errorMessage: string | undefined = undefined;
    try {
      if (onApplyChange && previewTarget.proposedChange) {
        await onApplyChange(previewTarget.proposedChange);
      }
      success = true;
      setSuggestions(prev =>
        prev.map(s => s.id === previewTarget.id ? { ...s, status: 'accepted' } : s)
      );
      setPreviewTarget(null);
    } catch (err) {
      errorMessage = (err as Error).message || 'Failed to apply change.';
      setError(errorMessage);
    } finally {
      setApplying(false);
      if (previewTarget.proposedChange) {
        try {
          await cloudRunClient.plannerApi.aiLogAction({
            workspaceId,
            actionType: previewTarget.proposedChange.operation,
            appliedChanges: {
              operation: previewTarget.proposedChange.operation,
              entityType: previewTarget.proposedChange.entityType,
              entityId: previewTarget.proposedChange.entityId,
              currentValue: previewTarget.proposedChange.currentValue,
              proposedValue: previewTarget.proposedChange.proposedValue,
              field: previewTarget.proposedChange.field
            },
            success,
            errorMessage
          });
        } catch (logErr) {
          console.error('Failed to log AI action:', logErr);
        }
      }
    }
  };

  const visibleSuggestions = suggestions.filter(s => s.status !== 'dismissed');
  const pendingSuggestions = visibleSuggestions.filter(s => s.status === 'pending');
  const acceptedCount = suggestions.filter(s => s.status === 'accepted').length;

  const analysisButtons: Array<{ key: LoadingKey; label: string; icon: string; needs: boolean }> = [
    { key: 'risks',    label: 'Detect Risks',    icon: '⚠️',  needs: !!quarterId },
    { key: 'schedule', label: 'Scheduling Tips', icon: '📅', needs: !!quarterId },
    { key: 'priority', label: 'Prioritize Goals',icon: '⚖️',  needs: !!quarterId },
    { key: 'capacity', label: 'Capacity Check',  icon: '📊', needs: true },
  ];

  return (
    <div className="ai-suggestions-panel">
      {/* Header */}
      <div className="ai-panel-header">
        <div className="ai-panel-title-row">
          <span className="ai-panel-sparkle">✨</span>
          <h3 className="ai-panel-title">AI Planning Assistant</h3>
          {acceptedCount > 0 && (
            <span className="ai-accepted-count">{acceptedCount} applied</span>
          )}
        </div>
        <p className="ai-panel-subtitle">
          Real-time analysis of your goals, capacity, and risks.
        </p>
      </div>

      {/* Analysis trigger buttons */}
      <div className="ai-analysis-buttons">
        {analysisButtons.map(btn => (
          <button
            key={btn.key}
            className={`ai-analysis-btn ${ran.has(btn.key) ? 'ai-analysis-btn-ran' : ''}`}
            onClick={() => runAnalysis(btn.key)}
            disabled={loading !== null || !btn.needs}
            title={!btn.needs ? 'Requires a quarter to be selected' : undefined}
          >
            {loading === btn.key ? (
              <span className="ai-spinner" />
            ) : (
              <span className="ai-btn-icon">{btn.icon}</span>
            )}
            <span className="ai-btn-label">{btn.label}</span>
            {ran.has(btn.key) && <span className="ai-ran-dot">•</span>}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="ai-error-banner">
          <span>⚡ {error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Empty state */}
      {suggestions.length === 0 && !loading && (
        <div className="ai-empty-state">
          <div className="ai-empty-icon">🤖</div>
          <p>Run an analysis to receive personalized planning insights.</p>
          {!quarterId && (
            <p className="ai-empty-note">Open a quarter to unlock all analyses.</p>
          )}
        </div>
      )}

      {/* Suggestions list */}
      {visibleSuggestions.length > 0 && (
        <div className="ai-suggestions-list">
          {pendingSuggestions.length === 0 && acceptedCount > 0 && (
            <div className="ai-all-done">
              <span>🎉</span>
              <span>All suggestions reviewed!</span>
            </div>
          )}
          {visibleSuggestions.map(s => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              onDismiss={handleDismiss}
              onAccept={handleAccept}
            />
          ))}
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div className="ai-loading-overlay">
          <div className="ai-loading-pulse" />
          <span>Analyzing your planning data…</span>
        </div>
      )}

      {/* Preview modal */}
      {previewTarget && (
        <PreviewModal
          suggestion={previewTarget}
          onConfirm={handleConfirmPreview}
          onCancel={() => setPreviewTarget(null)}
          applying={applying}
        />
      )}
    </div>
  );
};
