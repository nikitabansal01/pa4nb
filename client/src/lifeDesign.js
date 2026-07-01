/** Designing Your Life — domain model for PA for NB */

export const LIFE_AREAS = [
  {
    id: 'health',
    label: 'Health',
    description: 'Mind, body, and spirit — the foundation everything else runs on.',
    color: '#22C55E',
  },
  {
    id: 'work',
    label: 'Work',
    description: 'All contribution, paid and unpaid — including your job search.',
    color: '#3B82F6',
  },
  {
    id: 'play',
    label: 'Play',
    description: 'Activities done purely for joy, not outcomes or competition.',
    color: '#F59E0B',
  },
  {
    id: 'love',
    label: 'Love',
    description: 'Relationships — family, friends, community, and connection.',
    color: '#EC4899',
  },
];

export const WORK_SUB_AREAS = [
  {
    id: 'compass-workview',
    label: 'Workview',
    description: 'Your philosophy of work — why you work and what good work means.',
  },
  {
    id: 'job-search',
    label: 'Job search',
    description: 'Pipeline, voice dumps, and company tracking.',
  },
];

export const DEFAULT_LIFE_DESIGN = {
  dashboard: { health: 50, work: 50, play: 50, love: 50 },
  dashboardNotes: { health: '', work: '', play: '', love: '' },
  workview: '',
  lifeview: '',
};

export const WORKVIEW_PROMPTS = [
  'Why do you work?',
  'What defines good or worthwhile work?',
  'What does money have to do with it?',
  'What do experience, growth, and fulfillment have to do with it?',
];

export const LIFEVIEW_PROMPTS = [
  'What is the meaning or purpose of life?',
  'What matters most in a life well lived?',
  'Where do family, community, and the wider world fit in?',
  'What role do joy, love, and struggle play in life?',
];
