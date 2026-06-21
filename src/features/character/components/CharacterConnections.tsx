import React, { useState } from 'react';
import { useApp } from '../../../context/useApp';
import {
  Link2,
  Trash2,
  Plus,
  CheckCircle2,
  Target,
  FileText,
  Database,
  ArrowUpRight
} from 'lucide-react';
import type { CharacterConnection } from '../types';
import { ConnectionModal } from './ConnectionModal';

interface CharacterConnectionsProps {
  sourceEntityType: 'habit' | 'goal' | 'challenge' | 'identity_rule';
  sourceEntityId: string;
  connections: CharacterConnection[];
  onAddConnection: (conn: Omit<CharacterConnection, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  onDeleteConnection: (id: string) => Promise<void>;
}

export const CharacterConnections: React.FC<CharacterConnectionsProps> = ({
  sourceEntityType,
  sourceEntityId,
  connections,
  onAddConnection,
  onDeleteConnection,
}) => {
  const { plannerTasks, goals: plannerGoals, notes, memoryItems } = useApp();
  const [modalOpen, setModalOpen] = useState(false);

  // Filter connections relevant to this source entity
  const activeConnections = connections.filter(
    (c) => c.sourceEntityType === sourceEntityType && c.sourceEntityId === sourceEntityId
  );

  const resolveTargetDetails = (targetType: string, targetId: string) => {
    switch (targetType) {
      case 'task': {
        const task = plannerTasks.find((t) => t.id === targetId);
        return {
          title: task ? task.title : `Task (${targetId.substring(0, 8)}...)`,
          icon: CheckCircle2,
          color: 'var(--accent-cyan)',
          hash: '#/planner-today'
        };
      }
      case 'planner_goal': {
        const goal = plannerGoals.find((g) => g.id === targetId);
        const hash = goal?.level === 'weekly' ? '#/planner-week'
                   : goal?.level === 'monthly' ? '#/planner-month'
                   : goal?.level === 'quarterly' ? '#/planner-quarter'
                   : '#/planner';
        return {
          title: goal ? goal.title : `Planner Goal (${targetId.substring(0, 8)}...)`,
          icon: Target,
          color: 'var(--accent-purple)',
          hash
        };
      }
      case 'note': {
        const note = notes.find((n) => n.id === targetId);
        return {
          title: note ? note.title : `Note (${targetId.substring(0, 8)}...)`,
          icon: FileText,
          color: 'var(--accent-teal)',
          hash: '#/wiki'
        };
      }
      case 'resource': {
        const memory = memoryItems.find((m) => m.id === targetId);
        return {
          title: memory ? memory.title : `Memory (${targetId.substring(0, 8)}...)`,
          icon: Database,
          color: 'var(--text-muted)',
          hash: '#/wiki'
        };
      }
      default:
        return {
          title: `Unknown Target (${targetId})`,
          icon: Link2,
          color: 'var(--text-secondary)',
          hash: null
        };
    }
  };

  const handleCreateConnection = async (targetType: string, targetId: string, relationshipType: string) => {
    await onAddConnection({
      sourceEntityType,
      sourceEntityId,
      targetEntityType: targetType,
      targetEntityId: targetId,
      relationshipType,
      metadata: {}
    });
  };

  const relationshipLabels: Record<string, string> = {
    supports: 'Supports',
    generated_from: 'Generated from',
    tracks: 'Tracks',
    part_of: 'Part of',
    related_to: 'Related to'
  };

  const excludeTargetIds = activeConnections.map((c) => c.targetEntityId);

  return (
    <div style={{ marginTop: '0.75rem', padding: '0.75rem 0', borderTop: '1px solid var(--panel-border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Connected Integrations ({activeConnections.length})
        </span>
        <button
          className="glass-btn btn-cyan"
          style={{ padding: '0.2rem 0.4rem', fontSize: '0.62rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          onClick={() => setModalOpen(true)}
        >
          <Plus size={10} /> Link
        </button>
      </div>

      {activeConnections.length === 0 ? (
        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.25rem 0' }}>
          No connected Planner or Brain records.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {activeConnections.map((conn) => {
            const details = resolveTargetDetails(conn.targetEntityType, conn.targetEntityId);
            const IconComponent = details.icon;
            
            return (
              <div
                key={conn.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.35rem 0.5rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                  <IconComponent size={12} style={{ color: details.color, flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 500,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {details.title}
                    </span>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                      {relationshipLabels[conn.relationshipType] || conn.relationshipType} • {conn.targetEntityType}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexShrink: 0 }}>
                  {details.hash && (
                    <button
                      className="glass-btn"
                      style={{ padding: '0.2rem', color: 'var(--accent-cyan)' }}
                      onClick={() => { window.location.hash = details.hash!; }}
                      title={`Go to ${conn.targetEntityType}`}
                    >
                      <ArrowUpRight size={10} />
                    </button>
                  )}
                  <button
                    className="glass-btn"
                    style={{ padding: '0.2rem', color: 'var(--accent-magenta)' }}
                    onClick={() => onDeleteConnection(conn.id)}
                    title="Unlink connection"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <ConnectionModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onAddConnection={handleCreateConnection}
          excludeTargetIds={excludeTargetIds}
        />
      )}
    </div>
  );
};
