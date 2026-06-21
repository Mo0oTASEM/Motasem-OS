import React from 'react';
import { Mail, Calendar, HardDrive, CheckSquare, Users, Table, FileText } from 'lucide-react';
import type { GoogleServiceName } from '../types';
import { GOOGLE_SERVICE_META } from '../types';
import { IntegrationStatusBadge } from '../../../components/system/States';

type Props = {
  services: Record<GoogleServiceName, boolean>;
  onToggle?: (service: GoogleServiceName) => void;
  readOnly?: boolean;
};

const iconMap: Record<string, React.FC<{ size?: number; color?: string }>> = {
  mail: Mail,
  calendar: Calendar,
  hard_drive: HardDrive,
  check_square: CheckSquare,
  users: Users,
  table: Table,
  file_text: FileText,
};

const googleServiceKeys: GoogleServiceName[] = ['gmail', 'calendar', 'drive', 'tasks', 'contacts', 'sheets', 'docs'];

export const GoogleServiceList: React.FC<Props> = ({ services, onToggle, readOnly }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
      {googleServiceKeys.map(service => {
        const meta = GOOGLE_SERVICE_META[service];
        const Icon = iconMap[meta.icon] || Mail;
        const enabled = services[service] ?? false;
        return (
          <div
            key={service}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon size={16} color={meta.color} />
              <span>{meta.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IntegrationStatusBadge status={enabled ? 'connected' : 'disconnected'} />
              {!readOnly && (
                <button
                  className="glass-btn btn-sm"
                  onClick={() => onToggle?.(service)}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                >
                  {enabled ? 'Disable' : 'Enable'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
