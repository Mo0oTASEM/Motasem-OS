import React, { useState } from 'react';
import { useApp } from '../context/useApp';
import type { WikiNote } from '../context/AppContext';
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  Edit3, 
  Eye, 
  FileText, 
  Tag, 
  Folder, 
  FileCode, 
  Terminal,
  Save,
  Search,
  Network,
  Database,
  Sparkles
} from 'lucide-react';
import { PageHeader } from '../components/system/Layout';
import { cloudRunClient } from '../lib/api/cloudRunClient';
import { usePersistentState } from '../lib/uiPersistence';

type DurableMemoryResult = {
  id: string;
  title: string;
  content: string;
  type: string;
  tags?: string[];
  source?: string;
  entityType?: string;
  entityId?: string;
  importance?: number;
  score?: number;
  snippet?: string;
};

const durableMemoryTypes = [
  'all',
  'user_preference',
  'project_summary',
  'goal_update',
  'crm_note',
  'finance_summary',
  'content_idea',
  'portfolio_note',
  'decision',
  'journal_reflection'
];

const noteCategoryToMemoryType: Record<string, string> = {
  business: 'decision',
  ideas: 'content_idea',
  knowledge: 'decision',
  research: 'decision',
  voice_memos: 'journal_reflection',
  general: 'decision'
};

export const SecondBrain: React.FC = () => {
  const { notes, memoryItems, memoryEdges, addNote, updateNote, deleteNote } = useApp();
  
  // States
  const [selectedNoteId, setSelectedNoteId] = usePersistentState<string | null>('nova_brain_selected_note_v1', notes[0]?.id || null, 'session');
  const [activeCategory, setActiveCategory] = usePersistentState<string>('nova_brain_active_category_v1', 'all');
  const [isEditMode, setIsEditMode] = usePersistentState<boolean>('nova_brain_edit_mode_v1', false, 'session');
  const [searchQuery, setSearchQuery] = usePersistentState('nova_brain_search_v1', '', 'session');
  const [memoryTypeFilter, setMemoryTypeFilter] = usePersistentState('nova_brain_memory_type_filter_v1', 'all', 'session');
  const [brainStatus, setBrainStatus] = useState('');
  const [backendMemoryResults, setBackendMemoryResults] = useState<DurableMemoryResult[]>([]);
  const initialEditorNote = notes.find(n => n.id === selectedNoteId);

  // Editor states
  const [title, setTitle] = useState(initialEditorNote?.title || '');
  const [content, setContent] = useState(initialEditorNote?.content || '');
  const [category, setCategory] = useState<WikiNote['category']>(initialEditorNote?.category || 'general');
  const [tagsInput, setTagsInput] = useState(initialEditorNote?.tags.join(', ') || '');

  const activeNote = notes.find(n => n.id === selectedNoteId);

  // Handle note selection
  const handleSelectNote = (note: WikiNote) => {
    setSelectedNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setTagsInput(note.tags.join(', '));
    setIsEditMode(false);
  };

  // Create empty note
  const handleCreateNote = () => {
    const newNote = {
      title: 'Untitled Intel Note',
      category: 'general' as const,
      tags: ['draft'],
      content: '### New Note\n\nType your markdown here...'
    };
    
    // We add note to context
    const id = `n-${Date.now()}`;
    addNote(newNote);
    
    // Select it
    setSelectedNoteId(id);
    setTitle(newNote.title);
    setContent(newNote.content);
    setCategory(newNote.category);
    setTagsInput('draft');
    setIsEditMode(true);
  };

  // Save changes
  const handleSaveChanges = () => {
    if (!selectedNoteId) return;
    const parsedTags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    updateNote(selectedNoteId, {
      title,
      content,
      category,
      tags: parsedTags
    });
    
    setIsEditMode(false);
  };

  // Delete note
  const handleDeleteNote = (id: string) => {
    deleteNote(id);
    if (selectedNoteId === id) {
      setSelectedNoteId(null);
    }
  };

  // Cheat Sheet Quick Injections
  const handleInjectCheatSheet = (type: 'unity_lerp' | 'ae_loop' | 'hlsl_normal') => {
    let csTitle = '';
    let csContent = '';
    let csCategory: WikiNote['category'] = 'general';
    let csTags: string[] = [];

    if (type === 'unity_lerp') {
      csTitle = 'Unity C# Smooth Lerping Script';
      csCategory = 'game_design';
      csTags = ['unity', 'c-sharp', 'lerp', 'gameplay'];
      csContent = `### Unity Smooth Value Lerping (C#)

This script template handles frame-rate independent smooth interpolations for floats, vectors, or quaternions.

\`\`\`csharp
using UnityEngine;

public class SmoothFollow : MonoBehaviour
{
    public Transform target;
    public float smoothSpeed = 5f; // Lerp factor
    
    void LateUpdate()
    {
        if (target == null) return;
        
        // Frame-rate independent lerp calculation:
        // Using (1 - e^(-speed * dt)) instead of (speed * dt) prevents speed-up at high frame rates.
        float lerpFactor = 1f - Mathf.Exp(-smoothSpeed * Time.deltaTime);
        
        transform.position = Vector3.Lerp(transform.position, target.position, lerpFactor);
    }
}
\`\`\`

#### Key Tips:
- Always run camera follow scripts in \`LateUpdate()\` to ensure player movement scripts in \`Update()\` or \`FixedUpdate()\` have finished calculating.`;
    } 
    else if (type === 'ae_loop') {
      csTitle = 'AE Expression: Seamless Cycle Loop';
      csCategory = 'motion_expressions';
      csTags = ['after-effects', 'expressions', 'loop'];
      csContent = `### After Effects Loop In & Out Expressions

Use these expressions to repeat keyframe sequences infinitely.

#### Loop Out (Cycles after last keyframe)
\`\`\`javascript
// Repeats the keyframe range from first to last keyframe
loopOut(type = "cycle");
\`\`\`

#### PingPong Loop (Bounces back and forth)
\`\`\`javascript
// Oscillates animation forward and backward
loopOut(type = "pingpong");
\`\`\`

#### Loop In (Repeats *before* the first keyframe)
\`\`\`javascript
// Loops initial keyframes prior to current timeline playhead
loopIn(type = "cycle");
\`\`\``;
    }
    else if (type === 'hlsl_normal') {
      csTitle = 'HLSL Normal Map unpacking';
      csCategory = 'shaders';
      csTags = ['hlsl', 'shaders', 'graphics'];
      csContent = `### Unpacking Tangent Space Normal Maps in HLSL

When sampling a normal map texture, you must decode it from compressed RGB channel space back to tangent unit vectors.

\`\`\`hlsl
// Sample normal map texture
float4 packedNormal = tex2D(_NormalMap, i.uv);

// Unpack normal map (remap from [0, 1] range to [-1, 1] range)
// Note: Unity provides UnpackNormal() function, but here is the raw math:
float3 tangentNormal;
tangentNormal.xy = packedNormal.wy * 2.0 - 1.0; // DXT5nm compression maps x to alpha (w), y to green (y)
tangentNormal.z = sqrt(1.0 - saturate(dot(tangentNormal.xy, tangentNormal.xy)));
\`\`\`

#### Shader settings:
- Ensure texture asset Import Type is set to "Normal map" in Unity inspector.`;
    }

    addNote({
      title: csTitle,
      category: csCategory,
      tags: csTags,
      content: csContent
    });
  };

  // --- Lightweight Markdown Parser ---
  const renderMarkdown = (md: string) => {
    if (!md) return <p style={{ color: 'var(--text-muted)' }}>Empty note.</p>;

    const lines = md.split('\n');
    let insideCodeBlock = false;
    let codeContent: string[] = [];

    return lines.map((line, idx) => {
      // Handle code block
      if (line.trim().startsWith('```')) {
        if (insideCodeBlock) {
          insideCodeBlock = false;
          const displayCode = codeContent.join('\n');
          codeContent = [];
          return (
            <pre key={idx} className="mono" style={{
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              overflowX: 'auto',
              fontSize: '0.8rem',
              color: 'var(--accent-cyan)',
              margin: '1rem 0'
            }}>
              <code>{displayCode}</code>
            </pre>
          );
        } else {
          insideCodeBlock = true;
          return null; // start code block, output nothing
        }
      }

      if (insideCodeBlock) {
        codeContent.push(line);
        return null;
      }

      // Headers
      if (line.startsWith('### ')) {
        return <h4 key={idx} style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--accent-purple)', margin: '1.25rem 0 0.5rem' }}>{parseInline(line.slice(4))}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-cyan)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem', margin: '1.5rem 0 0.75rem' }}>{parseInline(line.slice(3))}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={idx} style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', margin: '1.75rem 0 1rem' }}>{parseInline(line.slice(2))}</h2>;
      }

      // Bullet list
      if (line.startsWith('- ')) {
        return (
          <li key={idx} style={{ marginLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0.25rem 0' }}>
            {parseInline(line.slice(2))}
          </li>
        );
      }

      // Empty line
      if (line.trim() === '') {
        return <div key={idx} style={{ height: '0.75rem' }} />;
      }

      // Standard paragraph
      return <p key={idx} style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>{parseInline(line)}</p>;
    });
  };

  // Helper to parse bold (**text**) and code (`code`) inline
  const parseInline = (text: string) => {
    // Regex matching bold and inline code
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} style={{ color: '#fff', fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={index} className="mono" style={{ backgroundColor: 'rgba(255,255,255,0.08)', padding: '0.15rem 0.3rem', borderRadius: '3px', color: 'var(--accent-magenta)', fontSize: '0.8rem' }}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  const filteredNotes = notes.filter(n => {
    const matchesCategory = activeCategory === 'all' || n.category === activeCategory;
    const haystack = `${n.title} ${n.content} ${n.tags.join(' ')}`.toLowerCase();
    const matchesSearch = !searchQuery.trim() || haystack.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['all', 'ideas', 'knowledge', 'research', 'voice_memos', 'shaders', 'motion_expressions', 'game_design', 'business', 'general'];
  const graphItems = memoryItems.slice(0, 8);




  const handleSearchDurableMemory = async () => {
    if (!searchQuery.trim()) {
      setBrainStatus('Enter a memory search query first.');
      return;
    }
    setBrainStatus('Searching durable memory...');
    const result = await cloudRunClient.searchMemory({
      query: searchQuery,
      types: memoryTypeFilter === 'all' ? undefined : [memoryTypeFilter],
      limit: 12
    });
    if (result.error) {
      setBrainStatus(`Memory search failed: ${result.error}`);
      return;
    }
    setBackendMemoryResults(result.results || []);
    setBrainStatus(`Found ${(result.results || []).length} durable memory matches.`);
  };

  const handleRememberActiveNote = async () => {
    if (!activeNote) return;
    setBrainStatus('Saving note into durable memory...');
    const result = await cloudRunClient.createMemory({
      title: activeNote.title,
      content: activeNote.content,
      type: noteCategoryToMemoryType[activeNote.category] || 'decision',
      tags: activeNote.tags,
      source: 'second_brain_note',
      entityType: 'note',
      entityId: activeNote.id,
      importance: 58
    });
    if (result.error) {
      setBrainStatus(`Memory save failed: ${result.error}`);
      return;
    }
    setBrainStatus(`Remembered "${result.memory?.title || activeNote.title}" in durable memory.`);
  };

  const handleSummarizeActiveNote = async () => {
    if (!activeNote) return;
    setBrainStatus('Summarizing selected note into durable memory...');
    const result = await cloudRunClient.summarizeEntityMemory({
      entityType: 'note',
      entityId: activeNote.id,
      title: `Note summary: ${activeNote.title}`,
      content: activeNote.content,
      tags: activeNote.tags,
      source: 'second_brain_note',
      importance: 68
    });
    if (result.error) {
      setBrainStatus(`Memory summary failed: ${result.error}`);
      return;
    }
    setBrainStatus(`Created ${result.summarizer || 'fallback'} memory summary for "${activeNote.title}".`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
      {/* Header */}
      <PageHeader title="Second Brain" description="Ideas, notes, knowledge, research, voice memos, AI search, tags, and relationships.">
        <button 
          onClick={handleCreateNote} 
          className="glass-btn btn-cyan"
          style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} /> New Note
        </button>
      </PageHeader>

      {/* Main Area Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        flexGrow: 1,
        overflow: 'hidden',
        height: 'calc(100vh - 80px)'
      }}>
        {/* Left Side: Note List & folders */}
        <div className="glass-panel" style={{
          borderRight: '1px solid var(--panel-border)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          padding: '1rem 0.75rem',
          gap: '1rem',
          backgroundColor: 'rgba(0, 0, 0, 0.15)'
        }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>AI Memory Search</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Search size={14} className="text-cyan" />
              <input
                className="glass-input"
                style={{ width: '100%', padding: '0.4rem 0.55rem', fontSize: '0.75rem' }}
                placeholder="Search ideas, research, tags..."
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
              />
            </div>
            <select
              className="glass-input"
              value={memoryTypeFilter}
              onChange={event => setMemoryTypeFilter(event.target.value)}
              style={{ fontSize: '0.72rem', padding: '0.4rem 0.55rem', background: '#0a0814' }}
            >
              {durableMemoryTypes.map(type => (
                <option key={type} value={type}>{type === 'all' ? 'All memory types' : type.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <button className="glass-btn btn-cyan" onClick={handleSearchDurableMemory} style={{ justifyContent: 'flex-start', fontSize: '0.72rem' }}>
              <Search size={13} /> Search Durable Memory
            </button>
            {brainStatus && <p className="os-readable" style={{ fontSize: '0.72rem', margin: '0.35rem 0 0', color: 'var(--accent-cyan)' }}>{brainStatus}</p>}
          </div>

          {/* Quick injection cheat sheets */}
          <div>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Quick Cheat Injection</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <button onClick={() => handleInjectCheatSheet('unity_lerp')} className="glass-btn" style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', justifyContent: 'flex-start' }}>
                <FileCode size={12} className="text-purple" /> Unity Lerp (C#)
              </button>
              <button onClick={() => handleInjectCheatSheet('ae_loop')} className="glass-btn" style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', justifyContent: 'flex-start' }}>
                <Terminal size={12} className="text-magenta" /> AE Loop In/Out
              </button>
              <button onClick={() => handleInjectCheatSheet('hlsl_normal')} className="glass-btn" style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', justifyContent: 'flex-start' }}>
                <BookOpen size={12} className="text-cyan" /> HLSL Normal Map
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Wiki Folders</h3>
            
            {/* Category selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="glass-btn"
                  style={{
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.75rem',
                    justifyContent: 'flex-start',
                    borderRadius: '4px',
                    background: activeCategory === cat ? 'rgba(255,255,255,0.05)' : 'transparent',
                    borderColor: activeCategory === cat ? 'var(--panel-border)' : 'transparent',
                    color: activeCategory === cat ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                  }}
                >
                  <Folder size={12} style={{ marginRight: '0.35rem' }} />
                  {cat === 'all' ? 'All Folders' : cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Notes Log</h3>
            
            {/* Files log list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto', flexGrow: 1 }}>
              {filteredNotes.map(note => (
                <div 
                  key={note.id}
                  onClick={() => handleSelectNote(note)}
                  className="glass-btn"
                  style={{
                    padding: '0.5rem',
                    fontSize: '0.75rem',
                    justifyContent: 'flex-start',
                    borderRadius: '4px',
                    borderColor: selectedNoteId === note.id ? 'rgba(0, 240, 255, 0.25)' : 'transparent',
                    background: selectedNoteId === note.id ? 'rgba(0,240,255,0.02)' : 'transparent',
                    color: selectedNoteId === note.id ? 'var(--accent-cyan)' : 'var(--text-primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.2rem',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                    <FileText size={12} style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.title}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                    <span>{note.category}</span>
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Note Editor & Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1.5rem', overflowY: 'auto' }}>

          {backendMemoryResults.length > 0 && (
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                <Database size={16} className="text-purple" />
                <h3 style={{ fontSize: '1rem' }}>Durable Memory Results</h3>
                <span className="badge badge-purple" style={{ marginLeft: 'auto' }}>{backendMemoryResults.length} matches</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {backendMemoryResults.map(memory => (
                  <div key={memory.id} className="glass-panel" style={{ borderRadius: 'var(--radius-md)', padding: '0.85rem', background: 'rgba(255,255,255,0.025)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.45rem' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.62rem' }}>{memory.type.replace(/_/g, ' ')}</span>
                      <span className="mono" style={{ marginLeft: 'auto', fontSize: '0.62rem', color: 'var(--text-muted)' }}>{Math.round((memory.score || 0) * 10) / 10}</span>
                    </div>
                    <h4 style={{ fontSize: '0.86rem', marginBottom: '0.35rem' }}>{memory.title}</h4>
                    <p className="os-readable" style={{ fontSize: '0.75rem', margin: 0, lineHeight: 1.45 }}>{memory.snippet || memory.content.slice(0, 220)}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.55rem' }}>
                      {(memory.tags || []).slice(0, 4).map(tag => (
                        <span key={tag} className="mono" style={{ fontSize: '0.6rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '0.1rem 0.3rem', borderRadius: 3 }}>#{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeNote ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%' }}>
              
              {/* Note meta header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setIsEditMode(false)}
                    className="glass-btn"
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      borderColor: !isEditMode ? 'var(--accent-cyan)' : 'transparent',
                      color: !isEditMode ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                    }}
                  >
                    <Eye size={12} /> Live Preview
                  </button>
                  <button 
                    onClick={() => {
                      setTitle(activeNote.title);
                      setContent(activeNote.content);
                      setCategory(activeNote.category);
                      setTagsInput(activeNote.tags.join(', '));
                      setIsEditMode(true);
                    }}
                    className="glass-btn"
                    style={{
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.75rem',
                      borderColor: isEditMode ? 'var(--accent-cyan)' : 'transparent',
                      color: isEditMode ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                    }}
                  >
                    <Edit3 size={12} /> Edit Intel
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!isEditMode && (
                    <>
                      <button
                        onClick={handleRememberActiveNote}
                        className="glass-btn"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        <Database size={12} /> Remember
                      </button>
                      <button
                        onClick={handleSummarizeActiveNote}
                        className="glass-btn btn-cyan"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                      >
                        <Sparkles size={12} /> Summarize
                      </button>
                    </>
                  )}
                  {isEditMode && (
                    <button 
                      onClick={handleSaveChanges} 
                      className="glass-btn btn-cyan"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      <Save size={12} /> Save Note
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteNote(activeNote.id)} 
                    className="glass-btn"
                    style={{ padding: '0.35rem', background: 'rgba(255,0,85,0.05)', borderColor: 'rgba(255,0,85,0.1)' }}
                  >
                    <Trash2 size={12} className="text-magenta" />
                  </button>
                </div>
              </div>

              {/* EDITOR MODE */}
              {isEditMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flexGrow: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Note Title</label>
                      <input 
                        type="text" 
                        className="glass-input" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        required 
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Category Folder</label>
                      <select
                        className="glass-input"
                        style={{ background: '#0a0814' }}
                        value={category}
                        onChange={e => setCategory(e.target.value as WikiNote['category'])}
                      >
                        <option value="shaders">Shaders</option>
                        <option value="motion_expressions">Motion Expressions</option>
                        <option value="game_design">Game Design</option>
                        <option value="business">Business</option>
                        <option value="ideas">Ideas</option>
                        <option value="knowledge">Knowledge</option>
                        <option value="research">Research</option>
                        <option value="voice_memos">Voice Memos</option>
                        <option value="general">General</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Tags (comma separated)</label>
                    <input 
                      type="text" 
                      className="glass-input" 
                      value={tagsInput} 
                      onChange={e => setTagsInput(e.target.value)} 
                      placeholder="unity, hlsl, vertex, mesh"
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexGrow: 1 }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Markdown Source Code</label>
                    <textarea 
                      className="glass-input mono" 
                      style={{ 
                        flexGrow: 1, 
                        minHeight: '280px', 
                        fontSize: '0.85rem', 
                        fontFamily: 'var(--font-mono)',
                        lineHeight: '1.4',
                        resize: 'none'
                      }}
                      value={content} 
                      onChange={e => setContent(e.target.value)} 
                    />
                  </div>
                </div>
              ) : (
                /* PREVIEW MODE */
                <div style={{ flexGrow: 1 }}>
                  <div style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{activeNote.title}</h2>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{activeNote.category}</span>
                      <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                        <Tag size={10} className="text-secondary" />
                        {activeNote.tags.map((tag, idx) => (
                          <span key={idx} className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.03)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rendered HTML */}
                  <div style={{ color: 'var(--text-secondary)', paddingBottom: '2rem' }}>
                    {renderMarkdown(activeNote.content)}
                  </div>

                  <div className="glass-panel" style={{ borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <Network size={16} className="text-purple" />
                      <h3 style={{ fontSize: '0.95rem' }}>Knowledge Graph</h3>
                      <span className="badge badge-purple" style={{ marginLeft: 'auto' }}>{memoryEdges.length} relationships</span>
                    </div>
                    <div className="knowledge-graph">
                      {graphItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="graph-node"
                          style={{
                            left: `${12 + (index % 4) * 22}%`,
                            top: `${18 + Math.floor(index / 4) * 42}%`
                          }}
                        >
                          {item.title}
                        </div>
                      ))}
                      {memoryEdges.slice(0, 5).map((edge, index) => (
                        <span key={edge.id} className="graph-edge" style={{ left: `${18 + index * 12}%`, top: `${38 + (index % 2) * 22}%`, width: `${18 + index * 3}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', color: 'var(--text-muted)' }}>
              <BookOpen size={48} style={{ marginBottom: '1rem' }} />
              <p style={{ fontSize: '0.85rem' }}>Create or select an intel note to start reading.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
