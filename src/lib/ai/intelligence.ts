import type {
  AgentRun,
  CalendarEvent,
  Client,
  FinanceEntry,
  Goal,
  HealthEntry,
  JournalEntry,
  MemoryItem,
  Opportunity,
  PlannerTask,
  Project,
  TimeBlock
} from '../../context/AppContext';

export interface OperatingSystemSnapshot {
  projects: Project[];
  clients: Client[];
  finances: FinanceEntry[];
  memoryItems: MemoryItem[];
  goals: Goal[];
  calendarEvents: CalendarEvent[];
  plannerTasks: PlannerTask[];
  journalEntries: JournalEntry[];
  healthEntries: HealthEntry[];
  opportunities: Opportunity[];
  timeBlocks: TimeBlock[];
  agentRuns: AgentRun[];
}

const dayMs = 24 * 60 * 60 * 1000;

export const scoreOpportunity = (opportunity: Opportunity) => {
  const upside = opportunity.revenuePotential * 1.4;
  const cost = opportunity.difficulty * 0.55 + opportunity.timeRequired * 0.45 + opportunity.risk * 0.75;
  return Math.max(0, Math.min(100, Math.round((upside - cost + 8) * 7)));
};

export const getProjectProgress = (project: Project) => {
  if (project.tasks.length === 0) return 0;
  return Math.round((project.tasks.filter(task => task.completed).length / project.tasks.length) * 100);
};

export const getMonthlyRevenue = (finances: FinanceEntry[]) => {
  const now = new Date();
  return finances
    .filter(entry => {
      const date = new Date(entry.date);
      return entry.type === 'income' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, entry) => sum + entry.amount, 0);
};

export const getImportantTasks = (tasks: PlannerTask[]) => {
  const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
  return [...tasks]
    .filter(task => task.status !== 'done')
    .sort((a, b) => {
      const priorityDelta = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDelta !== 0) return priorityDelta;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 6);
};

export const getUpcomingMeetings = (events: CalendarEvent[]) => {
  const now = Date.now();
  return [...events]
    .filter(event => new Date(event.start).getTime() >= now - dayMs)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);
};

export const getAtRiskClients = (clients: Client[], projects: Project[], finances: FinanceEntry[]) => {
  return clients
    .filter(client => client.status === 'active')
    .map(client => {
      const clientProjects = projects.filter(project => project.clientId === client.id);
      const revenue = finances.filter(entry => entry.clientId === client.id && entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0);
      const overdue = clientProjects.some(project => project.status !== 'completed' && new Date(project.deadline).getTime() < Date.now());
      const riskScore = overdue ? 78 : clientProjects.length === 0 ? 62 : revenue > 2000 ? 24 : 45;
      return { client, riskScore, revenue, overdue };
    })
    .sort((a, b) => b.riskScore - a.riskScore);
};

export const searchMemory = (query: string, memoryItems: MemoryItem[]) => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return memoryItems.slice(0, 8);

  return memoryItems
    .map(item => {
      const haystack = `${item.title} ${item.content} ${item.tags.join(' ')} ${item.type}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0) + item.importanceScore / 100;
      return { item, score };
    })
    .filter(result => result.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .map(result => result.item)
    .slice(0, 12);
};

export const generateAIBriefing = (snapshot: OperatingSystemSnapshot) => {
  const importantTasks = getImportantTasks(snapshot.plannerTasks);
  const topTask = importantTasks[0];
  const topOpportunity = [...snapshot.opportunities].sort((a, b) => scoreOpportunity(b) - scoreOpportunity(a))[0];
  const atRiskClient = getAtRiskClients(snapshot.clients, snapshot.projects, snapshot.finances)[0];
  const activeProject = [...snapshot.projects]
    .filter(project => project.status === 'in_progress')
    .sort((a, b) => getProjectProgress(a) - getProjectProgress(b))[0];
  const latestHealth = snapshot.healthEntries[0];
  const meeting = getUpcomingMeetings(snapshot.calendarEvents)[0];

  return {
    focus: topTask
      ? `Focus on "${topTask.title}" first. It is ${topTask.priority} priority, due ${topTask.dueDate}, and directly supports your goal system.`
      : activeProject
        ? `Move "${activeProject.title}" forward. It is active and currently at ${getProjectProgress(activeProject)}% completion.`
        : 'Use the first deep-work block to define one high-value outcome for today.',
    opportunity: topOpportunity
      ? `"${topOpportunity.title}" has the strongest upside-to-effort score at ${scoreOpportunity(topOpportunity)}/100. Package it into a next action, not just an idea.`
      : 'Create one monetizable opportunity from your strongest project proof this week.',
    risk: atRiskClient && atRiskClient.riskScore > 60
      ? `${atRiskClient.client.company} is the clearest relationship risk. ${atRiskClient.overdue ? 'There is overdue project pressure.' : 'There is low recent activity.'}`
      : latestHealth && latestHealth.energy <= 5
        ? `Energy is the biggest risk today. Keep the schedule lighter and protect recovery.`
        : meeting
          ? `The next meeting can fragment the day. Prepare the decision points before "${meeting.title}".`
          : 'The main risk is scattered execution. Keep today anchored to one task, one client move, and one learning loop.'
  };
};

export const forecastSavings = (finances: FinanceEntry[]) => {
  const income = finances.filter(entry => entry.type === 'income').reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = finances.filter(entry => entry.type === 'expense').reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
  const net = income - expenses;
  return {
    currentNet: net,
    projectedQuarter: Math.round(net * 3),
    savingsRisk: expenses > income * 0.45 ? 'High burn relative to income' : 'Healthy burn ratio'
  };
};

export const buildIdealSchedule = (tasks: PlannerTask[], events: CalendarEvent[], health: HealthEntry[]) => {
  const energy = health[0]?.energy ?? 7;
  const deepWorkStart = energy >= 7 ? '08:30' : '10:00';
  const criticalTask = getImportantTasks(tasks)[0];
  const nextMeeting = getUpcomingMeetings(events)[0];

  return [
    { time: deepWorkStart, title: criticalTask ? criticalTask.title : 'Define today\'s highest leverage outcome', mode: 'Deep work' },
    { time: '11:30', title: 'Review AI briefing and update project/goal links', mode: 'Operating review' },
    { time: '13:00', title: nextMeeting ? `Prepare for ${nextMeeting.title}` : 'Client follow-up block', mode: 'Admin' },
    { time: '15:00', title: 'Opportunity or revenue sprint', mode: 'Growth' },
    { time: '17:30', title: 'Journal wins, lessons, decisions, and tomorrow risk', mode: 'Review' }
  ];
};
