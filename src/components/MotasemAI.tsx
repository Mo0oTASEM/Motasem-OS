import React, { useState, useRef, useEffect } from 'react';
import { PageHeader } from './system/Layout';
import { useApp } from '../context/useApp';
import { Bot, Send, Sparkles, AlertCircle } from 'lucide-react';
import { cloudRunClient, hasApiConfig } from '../lib/api/cloudRunClient';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  isError?: boolean;
}

export const MotasemAI: React.FC = () => {
  const {
    projects,
    clients,
    finances,
    addNote,
    addFinance,
    updateProject
  } = useApp();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: !hasApiConfig
        ? `**Setup Required**\n\nMotasem AI requires a backend API with a configured AI provider. To enable this feature:\n1. Set \`VITE_API_BASE_URL\` in your \`.env\` file\n2. Configure \`GEMINI_API_KEY\` or \`HERMES_API_KEY\` on your backend\n3. Restart the application\n\nFor now, local slash commands are still available:\n- \`/todo [task]\` — Add task to your active project\n- \`/note [title]\` — Create a note in Second Brain\n- \`/invoice [client_name] [amount]\` — Log a client payment\n- \`/burn\` — Display monthly subscription burn rate`
        : `Greetings, Operator. I am Motasem AI, your workspace engine. I can help you manage your projects, draft code, write After Effects expressions, analyze finances, or create new tasks.\n\nTry typing a message or use one of these commands:\n- \`/todo [task]\` — Add task to your active project (routes through AI backend when connected)\n- \`/note [title]\` — Create a note in Second Brain (routes through AI backend when connected)\n- \`/invoice [client_name] [amount]\` — Log a client payment\n- \`/burn\` — Display monthly subscription burn rate`,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [conversationId] = useState(() => `motasem-ai-${Date.now()}`);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const templates = [
    { label: 'AE Spring Bounce', query: 'Write an After Effects expression for a springy elastic scale bounce.' },
    { label: 'HLSL CRT Shader', query: 'Draft a Unity HLSL pixel shader calculation for a retro CRT scanline curve.' },
    { label: 'Calculate Quote', query: 'Help me quote a project: 45 hours estimated at Aether\'s billing rate. What are the tier options?' },
    { label: 'GDD Outline', query: 'Draft a mini Game Design Document outline for a 3D isometric sci-fi puzzle game.' }
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    await sendToBackend(textToSend);
  };

  const callBackend = async (text: string) => {
    setIsThinking(true);
    try {
      const result = await cloudRunClient.aiCommand({
        message: text,
        currentView: 'copilot',
        conversationId,
        contextHints: {
          userProfile: { surface: 'motasem-ai' },
          localCounts: {
            projects: projects.length,
            clients: clients.length,
            finances: finances.length
          }
        }
      });
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: result.response || 'No response returned.',
        timestamp: new Date().toLocaleTimeString(),
        isError: result.errors && result.errors.length > 0
      }]);
    } catch {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: '**Backend unavailable**\n\nThe AI backend could not be reached. Make sure your API server is running.',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      }]);
    }
    setIsThinking(false);
  };

  const sendToBackend = async (userText: string) => {
    if (userText.startsWith('/')) {
      await executeSlashCommand(userText);
      return;
    }

    if (!hasApiConfig) {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: '**API not configured**\n\nSet `VITE_API_BASE_URL` in your `.env` file and configure an AI provider on your backend to use AI features. For now, use slash commands.',
        timestamp: new Date().toLocaleTimeString(),
        isError: true
      }]);
      return;
    }

    await callBackend(userText);
  };

  const executeSlashCommand = async (cmd: string) => {
    const parts = cmd.split(' ');
    const baseCmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    const alwaysLocal = ['/invoice', '/burn'];
    const backendRoutable = hasApiConfig && !alwaysLocal.includes(baseCmd);

    if (backendRoutable) {
      await callBackend(cmd);
      return;
    }

    let replyText = '';

    switch (baseCmd) {
      case '/todo':
        if (!args.trim()) {
          replyText = 'Error: Please specify the task description. Usage: `/todo Implement menu layout`';
        } else {
          const activeProj = projects.find(p => p.status === 'in_progress');
          if (activeProj) {
            const newTasks = [...activeProj.tasks, { id: `t-${Date.now()}`, text: args, completed: false }];
            updateProject(activeProj.id, { tasks: newTasks });
            replyText = `Added task **"${args}"** to project **"${activeProj.title}"**.`;
          } else {
            replyText = 'No active projects found. Please create an active project first.';
          }
        }
        break;

      case '/note':
        if (!args.trim()) {
          replyText = 'Error: Please specify note title. Usage: `/note Unity optimization tips`';
        } else {
          addNote({
            title: args,
            category: 'ideas',
            tags: ['ai-generated', 'core-command'],
            content: `### ${args}\n\nDraft created via Motasem OS command kernel on ${new Date().toLocaleDateString()}.\n\n*Write your details here...*`
          });
          replyText = `Created new markdown note **"${args}"** inside the Second Brain under *Ideas*.`;
        }
        break;

      case '/invoice': {
        const match = args.match(/(.+)\s+(\d+)$/);
        if (!match) {
          replyText = 'Error: Invalid format. Usage: `/invoice Aether Interactive 2500`';
        } else {
          const clientName = match[1].trim();
          const amount = parseFloat(match[2]);
          const client = clients.find(c =>
            c.company.toLowerCase().includes(clientName.toLowerCase()) ||
            c.name.toLowerCase().includes(clientName.toLowerCase())
          );

          addFinance({
            date: new Date().toISOString().split('T')[0],
            description: `Payment received: ${client ? client.company : clientName}`,
            amount: amount,
            type: 'income',
            category: 'client_payment',
            clientId: client?.id
          });
          replyText = `Logged invoice receipt of **$${amount.toLocaleString()}** for **"${client ? client.company : clientName}"**.`;
        }
        break;
      }

      case '/burn': {
        const subs = finances.filter(f =>
          f.type === 'expense' && (f.category === 'software_license' || f.category === 'hosting')
        );
        const burn = subs.reduce((sum, f) => sum + Math.abs(f.amount), 0);
        replyText = `### Software Subscription Burn Summary\n\nYou currently have **${subs.length}** active recurring software licenses / hostings:\n\n` +
          subs.map(s => `- **${s.description}**: $${Math.abs(s.amount)}/mo`).join('\n') +
          `\n\n**Total monthly tool burn: $${burn.toFixed(2)}/mo** ($${(burn * 12).toFixed(2)}/year).`;
        break;
      }

      default:
        if (!hasApiConfig) {
          replyText = `Unknown command: \`${baseCmd}\`. Available commands:\n- \`/todo [task]\`\n- \`/note [title]\`\n- \`/invoice [client] [amount]\`\n- \`/burn\``;
        } else {
          await callBackend(cmd);
          return;
        }
        break;
    }

    setMessages(prev => [...prev, {
      sender: 'assistant',
      text: replyText,
      timestamp: new Date().toLocaleTimeString(),
      isError: replyText.startsWith('Error') || replyText.startsWith('Unknown')
    }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <PageHeader title="Motasem AI" description="Workspace Copilot & Agent Shell">
        <span className={`badge ${hasApiConfig ? 'badge-teal' : 'badge-amber'}`}>
          {hasApiConfig ? 'API configured' : 'API not configured'}
        </span>
      </PageHeader>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 240px',
        flexGrow: 1,
        overflow: 'hidden',
        height: 'calc(100vh - 80px)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem 1.5rem 1rem', position: 'relative' }}>
          <div style={{
            flexGrow: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            paddingRight: '0.5rem',
            marginBottom: '1rem'
          }}>
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                {msg.sender === 'assistant' && (
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Bot size={16} className="text-cyan" />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div className="glass-panel" style={{
                    padding: '0.9rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    borderTopLeftRadius: msg.sender === 'assistant' ? '0' : 'var(--radius-md)',
                    borderTopRightRadius: msg.sender === 'user' ? '0' : 'var(--radius-md)',
                    backgroundColor: msg.isError
                      ? 'rgba(255, 0, 85, 0.08)'
                      : msg.sender === 'user'
                        ? 'rgba(138, 43, 226, 0.1)'
                        : 'rgba(255,255,255,0.02)',
                    borderColor: msg.isError
                      ? 'rgba(255, 0, 85, 0.3)'
                      : msg.sender === 'user'
                        ? 'rgba(138, 43, 226, 0.3)'
                        : 'var(--panel-border)',
                    fontSize: '0.9rem',
                    lineHeight: '1.5',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-line'
                  }}>
                    {msg.text}
                  </div>

                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isThinking && (
              <div style={{ display: 'flex', gap: '0.75rem', alignSelf: 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(0, 240, 255, 0.05)',
                  border: '1px solid rgba(0, 240, 255, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Bot size={16} className="text-cyan" />
                </div>
                <div className="glass-panel" style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(5, 4, 10, 0.9)',
                  border: '1px solid rgba(0, 240, 255, 0.25)',
                  fontSize: '0.75rem',
                  color: 'var(--accent-cyan)'
                }}>
                  Processing...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--panel-border)', paddingTop: '1rem' }}>
            <input
              type="text"
              className="glass-input"
              style={{ flexGrow: 1, borderRadius: 'var(--radius-md)' }}
              placeholder="Ask Motasem AI anything or type /command..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend(input)}
              disabled={isThinking}
            />
            <button
              onClick={() => handleSend(input)}
              className="glass-btn btn-cyan"
              style={{ borderRadius: 'var(--radius-md)', padding: '0.75rem 1.25rem' }}
              disabled={isThinking || !input.trim()}
            >
              <Send size={16} /> Send
            </button>
          </div>
        </div>

        <div className="glass-panel" style={{
          borderLeft: '1px solid var(--panel-border)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          overflowY: 'auto'
        }}>
          <div>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              Creative Presets
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {templates.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(t.query)}
                  className="glass-btn"
                  style={{
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.75rem',
                    textAlign: 'left',
                    borderRadius: 'var(--radius-sm)',
                    justifyContent: 'flex-start',
                    gap: '0.35rem',
                    lineHeight: '1.3'
                  }}
                  disabled={isThinking}
                >
                  <Sparkles size={12} className="text-cyan" />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '1rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              Active Environment
            </h3>
            <div className="mono" style={{ fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <div>
                <span className="text-cyan">PROJECTS:</span> {projects.length} Total ({projects.filter(p=>p.status==='in_progress').length} Active)
              </div>
              <div>
                <span className="text-cyan">CRM CLIENTS:</span> {clients.length} Active
              </div>
              <div>
                <span className="text-cyan">BRAIN NOTES:</span> {finances.length > 0 ? 'Data available' : 'Empty'}
              </div>
              <div>
                <span className="text-cyan">NET BALANCE:</span> ${finances.reduce((s,f)=>s+f.amount,0).toLocaleString()}
              </div>
            </div>
          </div>

          {!hasApiConfig && (
            <div style={{
              borderTop: '1px solid var(--panel-border)',
              paddingTop: '1rem',
              marginTop: 'auto',
              background: 'rgba(255, 0, 85, 0.02)',
              border: '1px solid rgba(255, 0, 85, 0.1)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.75rem'
            }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-magenta)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '0.35rem' }}>
                <AlertCircle size={12} /> Setup Required
              </h4>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                AI keys are server-side only. Set VITE_API_BASE_URL and configure Gemini or Hermes in your backend.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
