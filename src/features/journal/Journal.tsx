import React, { useState } from 'react';
import { BookOpen, CalendarDays, Plus } from 'lucide-react';
import { PageHeader, Panel } from '../../components/system/Layout';
import { useApp } from '../../context/useApp';

export const Journal: React.FC = () => {
  const { journalEntries, addJournalEntry } = useApp();
  const [wins, setWins] = useState('');
  const [lessons, setLessons] = useState('');
  const [mistakes, setMistakes] = useState('');
  const [ideas, setIdeas] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    addJournalEntry({
      date: new Date().toISOString().split('T')[0],
      wins,
      lessons,
      mistakes,
      ideas,
      tags: ['journal', 'reflection'],
      importanceScore: 70
    });
    setWins('');
    setLessons('');
    setMistakes('');
    setIdeas('');
  };

  const latest = journalEntries[0];

  return (
    <div>
      <PageHeader title="Journal" description="Capture wins, lessons, mistakes, and ideas. Turn life into memory.">
        <span className="badge badge-teal"><CalendarDays size={12} /> Review engine</span>
      </PageHeader>

      <div className="page-body os-grid-2">
        <Panel title="Daily Reflection" icon={Plus}>
          <form onSubmit={handleSubmit} className="journal-grid">
            <textarea className="glass-input" value={wins} onChange={event => setWins(event.target.value)} placeholder="Wins..." />
            <textarea className="glass-input" value={lessons} onChange={event => setLessons(event.target.value)} placeholder="Lessons..." />
            <textarea className="glass-input" value={mistakes} onChange={event => setMistakes(event.target.value)} placeholder="Mistakes..." />
            <textarea className="glass-input" value={ideas} onChange={event => setIdeas(event.target.value)} placeholder="Ideas..." />
            <button className="glass-btn btn-cyan" type="submit">Save Reflection</button>
          </form>
        </Panel>

        <Panel title="AI Review Draft" icon={BookOpen}>
          {latest && (
            <div className="review-card">
              <h3>Weekly Review Signal</h3>
              <p>Your latest reflection shows progress around: {latest.wins || 'execution clarity'}.</p>
              <p>Lesson to carry forward: {latest.lessons || 'protect focus and reduce scope drag'}.</p>
              <p>Watch item: {latest.mistakes || 'context switching'}.</p>
            </div>
          )}
          <div className="os-list">
            {journalEntries.map(entry => (
              <article key={entry.id} className="memory-result">
                <strong>{entry.date}</strong>
                <p>{entry.wins || entry.lessons || entry.ideas}</p>
              </article>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
};
