export type OnboardingSample = {
  id: string;
  title: string;
  category: string;
  description: string;
};

export const LEARNING_ONBOARDING_SAMPLES: OnboardingSample[] = [
  {
    id: "ai-agents",
    title: "How AI agents plan multi-step tasks",
    category: "ai",
    description: "Understand tool use, planning loops, and when agents fail.",
  },
  {
    id: "ai-rag",
    title: "RAG patterns for production apps",
    category: "ai",
    description: "Chunking, retrieval quality, and evaluation tradeoffs.",
  },
  {
    id: "culture-nordic",
    title: "Nordic parenting and school culture",
    category: "culture",
    description: "Practical context for daily life in Sweden.",
  },
  {
    id: "culture-japan",
    title: "Wabi-sabi and Japanese design philosophy",
    category: "culture",
    description: "How aesthetics shape habits and product decisions.",
  },
  {
    id: "product-experiments",
    title: "Designing low-risk product experiments",
    category: "product",
    description: "Turn ideas into measurable tests quickly.",
  },
  {
    id: "systems-caching",
    title: "Caching strategies in distributed systems",
    category: "engineering",
    description: "Latency, invalidation, and consistency patterns.",
  },
  {
    id: "career-writing",
    title: "Technical writing for senior engineers",
    category: "career",
    description: "Write docs and proposals people actually use.",
  },
  {
    id: "finance-family",
    title: "Family budgeting and recurring expense review",
    category: "finance",
    description: "Build lightweight monthly routines.",
  },
  {
    id: "health-sleep",
    title: "Sleep routines for high-performing parents",
    category: "health",
    description: "Small behavior changes with compounding impact.",
  },
  {
    id: "learning-memory",
    title: "How memory techniques improve learning speed",
    category: "learning",
    description: "Spaced repetition and recall-first habits.",
  },
  {
    id: "communication-feedback",
    title: "Giving effective feedback in teams",
    category: "communication",
    description: "Frameworks for clarity without friction.",
  },
  {
    id: "gardening-seasonal",
    title: "Seasonal gardening planning in Stockholm",
    category: "home",
    description: "What to do now vs later in the season.",
  },
];
