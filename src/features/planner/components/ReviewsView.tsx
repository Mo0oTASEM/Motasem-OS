import React, { useEffect, useState, useCallback } from 'react';
import { BookOpen, Calendar, Loader2, Sparkles } from 'lucide-react';
import { cloudRunClient } from '../../../lib/api/cloudRunClient';
import type { PlanningReview } from '../types';

interface ReviewsViewProps {
  workspaceId: string;
  userId: string;
}

export const ReviewsView: React.FC<ReviewsViewProps> = ({ workspaceId, userId }) => {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<PlanningReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<PlanningReview | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [form, setForm] = useState(() => {
    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return {
      reviewType: 'weekly',
      wins: '',
      missedItems: '',
      lessons: '',
      bottlenecks: '',
      periodStart: start.toISOString().split('T')[0],
      periodEnd: now.toISOString().split('T')[0]
    };
  });

  const loadReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await cloudRunClient.plannerApi.listReviews(workspaceId);
      const list = (res.reviews || []) as unknown as PlanningReview[];
      setReviews(list);
      if (list.length > 0) {
        setSelectedReview(list[0]);
      }
    } catch {
      // Silently handled — errors shown via UI states
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let active = true;
    const trigger = async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (active) {
        loadReviews();
      }
    };
    trigger();
    return () => { active = false; };
  }, [workspaceId, loadReviews]);

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await cloudRunClient.plannerApi.createReview({
        ...form,
        workspaceId,
        userId,
        metrics: {},
        plannedVsActual: {}
      });
      const createdReview = res.review as unknown as PlanningReview;
      setShowCreateForm(false);
      setReviews(prev => [createdReview, ...prev]);
      setSelectedReview(createdReview);
      
      const resetNow = new Date();
      const resetStart = new Date(resetNow.getTime() - 7 * 24 * 60 * 60 * 1000);
      setForm({
        reviewType: 'weekly',
        wins: '',
        missedItems: '',
        lessons: '',
        bottlenecks: '',
        periodStart: resetStart.toISOString().split('T')[0],
        periodEnd: resetNow.toISOString().split('T')[0]
      });
    } catch {
      // Silently handled
    }
  };

  if (loading) {
    return (
      <div className="planner-splash" style={{ padding: '2rem' }}>
        <Loader2 className="spin text-cyan" size={32} />
        <p>Loading historical review logs...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '0.5rem' }}>
      
      {/* Sidebar: list of reviews */}
      <div className="glass-panel" style={{ flexGrow: 1, flexBasis: '280px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <BookOpen size={16} className="text-cyan" />
            Reflection Logs
          </h3>
          <button className="glass-btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setShowCreateForm(true)}>
            + Log Win
          </button>
        </div>

        {reviews.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '1rem 0', textAlign: 'center' }}>
            No review logs stored. Click "+ Log Win" to write one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }} className="custom-scrollbar">
            {reviews.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedReview(r)}
                className={`glass-btn ${selectedReview?.id === r.id ? 'active' : ''}`}
                style={{
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '0.65rem 0.85rem',
                  fontSize: '0.8rem',
                  borderColor: selectedReview?.id === r.id ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                  background: selectedReview?.id === r.id ? 'rgba(255,255,255,0.03)' : 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '0.2rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.reviewType.toUpperCase()} REVIEW</span>
                  <span className="mono" style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)' }}>
                    {new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {r.periodStart} to {r.periodEnd}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Container: Detail view */}
      <div className="glass-panel" style={{ flexGrow: 3, flexBasis: '450px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        {selectedReview ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.25rem 0' }}>
                {selectedReview.reviewType.toUpperCase()} RITUAL LOG
              </h3>
              <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={12} /> Period: {selectedReview.periodStart} to {selectedReview.periodEnd}
              </span>
            </div>

            {selectedReview.wins && (
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-teal, #2dd4bf)', margin: '0 0 0.5rem 0' }}>What went well (Wins)</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {selectedReview.wins}
                </p>
              </div>
            )}

            {selectedReview.missedItems && (
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-magenta)', margin: '0 0 0.5rem 0' }}>What was missed or deferred</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {selectedReview.missedItems}
                </p>
              </div>
            )}

            {selectedReview.lessons && (
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-purple)', margin: '0 0 0.5rem 0' }}>Key lessons learned</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {selectedReview.lessons}
                </p>
              </div>
            )}

            {selectedReview.bottlenecks && (
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-amber, #f59e0b)', margin: '0 0 0.5rem 0' }}>Bottlenecks / Friction encountered</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {selectedReview.bottlenecks}
                </p>
              </div>
            )}

            {selectedReview.aiGeneratedSummary && (
              <div style={{ borderTop: '1px dashed var(--panel-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={14} /> AI Synthesis Summary
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                  {selectedReview.aiGeneratedSummary}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--text-muted)' }}>
            <BookOpen size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Create a Win Log or select an existing one.</p>
          </div>
        )}
      </div>

      {/* Create Review / Win Log Modal */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ padding: '2rem', width: '420px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>Log Review Reflection</h3>
            <form onSubmit={handleCreateReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Review Type</label>
                  <select
                    className="glass-input"
                    value={form.reviewType}
                    onChange={(e) => setForm({ ...form, reviewType: e.target.value })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Start Date</label>
                  <input
                    type="date"
                    className="glass-input"
                    value={form.periodStart}
                    onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>End Date</label>
                <input
                  type="date"
                  className="glass-input"
                  value={form.periodEnd}
                  onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Wins / Successes</label>
                <textarea
                  className="glass-input"
                  style={{ minHeight: '60px' }}
                  value={form.wins}
                  onChange={(e) => setForm({ ...form, wins: e.target.value })}
                  placeholder="What went well during this period?"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Missed / Postponed Items</label>
                <textarea
                  className="glass-input"
                  style={{ minHeight: '50px' }}
                  value={form.missedItems}
                  onChange={(e) => setForm({ ...form, missedItems: e.target.value })}
                  placeholder="What did you defer or fail to complete?"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Lessons learned</label>
                <textarea
                  className="glass-input"
                  style={{ minHeight: '50px' }}
                  value={form.lessons}
                  onChange={(e) => setForm({ ...form, lessons: e.target.value })}
                  placeholder="What will you do differently next time?"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="glass-btn" onClick={() => setShowCreateForm(false)}>Cancel</button>
                <button type="submit" className="glass-btn btn-cyan">Save Reflection</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
