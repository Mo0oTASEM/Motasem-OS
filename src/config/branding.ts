export const branding = {
  productName: 'Motasem OS',
  shortName: 'Motasem',
  aiName: 'Motasem AI',
  assistantName: 'Motasem Assistant',
  tagline: 'AI-Native Personal Operating System',
  description: 'A premium, glassmorphic AI-native personal operating system for game developers, motion designers, and freelance creators.',
  headerMono: 'MOTASEM',
  sidebarTitle: 'MOTASEM // OS',
  sidebarSubtitle: 'KERNEL ONLINE v1.0.0',
  version: '1.0.0',
  loginTitle: 'Motasem OS',
  loginTagline: 'Your AI Operating System',
  consoleGreeting: `Greetings, Operator. I am Motasem AI, your workspace engine. I can help you manage your projects, draft code, write After Effects expressions, analyze finances, or create new tasks.`,
  consoleSetupRequired: `**Setup Required**\n\nMotasem AI requires a backend API with a configured AI provider. To enable this feature:\n1. Set \`VITE_API_BASE_URL\` in your \`.env\` file\n2. Configure \`GEMINI_API_KEY\` or \`HERMES_API_KEY\` on your backend\n3. Restart the application`,
  errorReloadLabel: 'Reload Motasem OS',
  loadingMessage: 'Fetching the latest Motasem OS data...',
  storageKeyPrefix: 'motasem',
} as const;

export type Branding = typeof branding;
