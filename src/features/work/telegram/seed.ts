import type { TelegramCommandExample } from './types';

export const telegramCommandExamples: TelegramCommandExample[] = [
  {
    id: 'tg-crm-new-lead',
    category: 'CRM',
    english: 'Add a new lead named Ahmad from Instagram interested in logo animation',
    arabic: 'ضيف lead جديد اسمه أحمد من Instagram مهتم بـ logo animation',
    workflow: 'crm.createLead',
    requiresApproval: false,
    mockResult: 'Created draft CRM lead: Ahmad, source Instagram, service Logo Animation.'
  },
  {
    id: 'tg-crm-followups',
    category: 'CRM',
    english: 'Show me leads I need to follow up with today',
    arabic: 'اعطيني leads لازم أتابع معهم اليوم',
    workflow: 'crm.getLeadsForFollowUp',
    requiresApproval: false,
    mockResult: '3 leads need follow-up today: Ahmad, Lina, Omar.'
  },
  {
    id: 'tg-outreach-followup',
    category: 'Outreach',
    english: 'Write a follow-up for Mohammad',
    arabic: 'اكتب follow-up لمحمد',
    workflow: 'outreach.generateFollowUpDraft',
    requiresApproval: true,
    mockResult: 'Generated a follow-up draft. Approval required before any send action.'
  },
  {
    id: 'tg-content-week',
    category: 'Content',
    english: 'Prepare a content plan for next week',
    arabic: 'جهز خطة محتوى للأسبوع الجاي',
    workflow: 'content.createWeeklyPlan',
    requiresApproval: false,
    mockResult: 'Created a 5-item weekly content plan across Instagram, YouTube, Facebook, Dribbble, and portfolio.'
  },
  {
    id: 'tg-content-repurpose',
    category: 'Content',
    english: 'Turn the latest project into posts for every platform',
    arabic: 'حول المشروع الأخير إلى بوستات لكل المنصات',
    workflow: 'content.repurposeProject',
    requiresApproval: false,
    mockResult: 'Generated repurposed post ideas for Instagram, YouTube, Behance, Pinterest, Dribbble, and website.'
  },
  {
    id: 'tg-portfolio-case',
    category: 'Portfolio',
    english: 'Generate a Behance case study for the latest motion project',
    arabic: 'جهز case study على Behance لآخر مشروع موشن',
    workflow: 'portfolio.generateBehanceCopy',
    requiresApproval: false,
    mockResult: 'Generated Behance description, problem/solution structure, and tags.'
  },
  {
    id: 'tg-upwork-monitor',
    category: 'Upwork',
    english: 'Monitor suitable Upwork opportunities',
    arabic: 'راقب فرص Upwork المناسبة',
    workflow: 'upwork.monitorMatches',
    requiresApproval: false,
    mockResult: 'Found 2 high-fit Upwork jobs. Reminder: keep communication inside Upwork.'
  },
  {
    id: 'tg-reports-today',
    category: 'Reports',
    english: 'Give me today work report',
    arabic: 'اعطيني تقرير الشغل اليوم',
    workflow: 'reports.dailyWorkSummary',
    requiresApproval: false,
    mockResult: 'Today: 3 lead actions, 2 drafts created, 1 content item approved, 2 Upwork jobs reviewed.'
  },
  {
    id: 'tg-task-create',
    category: 'Task',
    english: 'Remind me tomorrow to follow up with Lina',
    arabic: 'ذكرني بكرة أتابع مع لينا',
    workflow: 'tasks.createReminder',
    requiresApproval: false,
    mockResult: 'Created reminder for tomorrow: follow up with Lina.'
  }
];
