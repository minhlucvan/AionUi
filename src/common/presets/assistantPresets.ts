import type { PresetAgentType } from '@/types/acpTypes';
import type { IAgentTeamMemberDefinition } from '@/common/agentTeam';

export type AssistantPreset = {
  id: string;
  avatar: string;
  presetAgentType?: PresetAgentType;
  /**
   * Directory containing all resources for this preset (relative to project root).
   * If set, both ruleFiles and skillFiles will be resolved from this directory.
   * Default: rules/ for rules, skills/ for skills
   */
  resourceDir?: string;
  ruleFiles: Record<string, string>;
  skillFiles?: Record<string, string>;
  /**
   * Default enabled skills for this assistant (skill names from skills/ directory).
   * 此助手默认启用的技能列表（来自 skills/ 目录的技能名称）
   */
  defaultEnabledSkills?: string[];
  nameI18n: Record<string, string>;
  descriptionI18n: Record<string, string>;
  promptsI18n?: Record<string, string[]>;
  /**
   * Team member definitions for team assistants.
   * When present, launching this assistant spawns a multi-agent team
   * instead of a single conversation.
   */
  teamMembers?: IAgentTeamMemberDefinition[];
};

export const ASSISTANT_PRESETS: AssistantPreset[] = [
  {
    id: 'cowork',
    avatar: 'cowork.svg',
    presetAgentType: 'gemini',
    resourceDir: 'assistant/cowork',
    ruleFiles: {
      'en-US': 'cowork.md',
      'zh-CN': 'cowork.md', // 使用同一个文件，内容已精简 / Use same file, content is simplified
    },
    skillFiles: {
      'en-US': 'cowork-skills.md',
      'zh-CN': 'cowork-skills.zh-CN.md',
    },
    defaultEnabledSkills: ['skill-creator', 'pptx', 'docx', 'pdf', 'xlsx'],
    nameI18n: {
      'en-US': 'Cowork',
      'zh-CN': 'Cowork',
    },
    descriptionI18n: {
      'en-US': 'Autonomous task execution with file operations, document processing, and multi-step workflow planning.',
      'zh-CN': '具有文件操作、文档处理和多步骤工作流规划的自主任务执行助手。',
    },
    promptsI18n: {
      'en-US': ['Analyze the project structure', 'Automate the build process'],
      'zh-CN': ['分析项目结构', '自动化构建流程'],
    },
  },
  {
    id: 'pptx-generator',
    avatar: '📊',
    presetAgentType: 'gemini',
    resourceDir: 'assistant/pptx-generator',
    ruleFiles: {
      'en-US': 'pptx-generator.md',
      'zh-CN': 'pptx-generator.zh-CN.md',
    },
    nameI18n: {
      'en-US': 'PPTX Generator',
      'zh-CN': 'PPTX 生成器',
    },
    descriptionI18n: {
      'en-US': 'Generate local PPTX assets and structure for pptxgenjs.',
      'zh-CN': '生成本地 PPTX 资产与结构（pptxgenjs）。',
    },
    promptsI18n: {
      'en-US': ['Create a slide deck about AI trends', 'Generate a PPT for quarterly report'],
      'zh-CN': ['创建一个关于AI趋势的幻灯片', '生成季度报告PPT'],
    },
  },
  {
    id: 'pdf-to-ppt',
    avatar: '📄',
    presetAgentType: 'gemini',
    resourceDir: 'assistant/pdf-to-ppt',
    ruleFiles: {
      'en-US': 'pdf-to-ppt.md',
      'zh-CN': 'pdf-to-ppt.zh-CN.md',
    },
    nameI18n: {
      'en-US': 'PDF to PPT',
      'zh-CN': 'PDF 转 PPT',
    },
    descriptionI18n: {
      'en-US': 'Convert PDF to PPT with watermark removal rules.',
      'zh-CN': 'PDF 转 PPT 并去除水印规则',
    },
    promptsI18n: {
      'en-US': ['Convert report.pdf to slides', 'Extract charts from whitepaper.pdf'],
      'zh-CN': ['将 report.pdf 转换为幻灯片', '从白皮书提取图表'],
    },
  },
  {
    id: 'game-3d',
    avatar: '🎮',
    presetAgentType: 'gemini',
    resourceDir: 'assistant/game-3d',
    ruleFiles: {
      'en-US': 'game-3d.md',
      'zh-CN': 'game-3d.zh-CN.md',
    },
    nameI18n: {
      'en-US': '3D Game',
      'zh-CN': '3D 游戏生成',
    },
    descriptionI18n: {
      'en-US': 'Generate a complete 3D platform collection game in one HTML file.',
      'zh-CN': '用单个 HTML 文件生成完整的 3D 平台收集游戏。',
    },
    promptsI18n: {
      'en-US': ['Create a 3D platformer game', 'Make a coin collection game'],
      'zh-CN': ['创建一个3D平台游戏', '制作一个金币收集游戏'],
    },
  },
  {
    id: 'ui-ux-pro-max',
    avatar: '🎨',
    presetAgentType: 'gemini',
    resourceDir: 'assistant/ui-ux-pro-max',
    ruleFiles: {
      'en-US': 'ui-ux-pro-max.md',
      'zh-CN': 'ui-ux-pro-max.zh-CN.md',
    },
    nameI18n: {
      'en-US': 'UI/UX Pro Max',
      'zh-CN': 'UI/UX 专业设计师',
    },
    descriptionI18n: {
      'en-US': 'Professional UI/UX design intelligence with 57 styles, 95 color palettes, 56 font pairings, and stack-specific best practices.',
      'zh-CN': '专业 UI/UX 设计智能助手，包含 57 种风格、95 个配色方案、56 个字体配对及技术栈最佳实践。',
    },
    promptsI18n: {
      'en-US': ['Design a login page for a fintech app', 'Create a color palette for a nature theme'],
      'zh-CN': ['为金融科技应用设计登录页', '创建一个自然主题的配色方案'],
    },
  },
  {
    id: 'planning-with-files',
    avatar: '📋',
    presetAgentType: 'gemini',
    resourceDir: 'assistant/planning-with-files',
    ruleFiles: {
      'en-US': 'planning-with-files.md',
      'zh-CN': 'planning-with-files.zh-CN.md',
    },
    nameI18n: {
      'en-US': 'Planning with Files',
      'zh-CN': '文件规划助手',
    },
    descriptionI18n: {
      'en-US': 'Manus-style file-based planning for complex tasks. Uses task_plan.md, findings.md, and progress.md to maintain persistent context.',
      'zh-CN': 'Manus 风格的文件规划，用于复杂任务。使用 task_plan.md、findings.md 和 progress.md 维护持久化上下文。',
    },
    promptsI18n: {
      'en-US': ['Plan a refactoring task', 'Break down the feature implementation'],
      'zh-CN': ['规划一个重构任务', '拆分功能实现步骤'],
    },
  },
  {
    id: 'human-3-coach',
    avatar: '🧭',
    presetAgentType: 'gemini',
    resourceDir: 'assistant/human-3-coach',
    ruleFiles: {
      'en-US': 'human-3-coach.md',
      'zh-CN': 'human-3-coach.zh-CN.md',
    },
    nameI18n: {
      'en-US': 'HUMAN 3.0 Coach',
      'zh-CN': 'HUMAN 3.0 教练',
    },
    descriptionI18n: {
      'en-US': 'Personal development coach based on HUMAN 3.0 framework: 4 Quadrants (Mind/Body/Spirit/Vocation), 3 Levels, 3 Growth Phases.',
      'zh-CN': '基于 HUMAN 3.0 框架的个人发展教练：4 象限（思维/身体/精神/职业）、3 层次、3 成长阶段。',
    },
    promptsI18n: {
      'en-US': ['Help me set quarterly goals', 'Reflect on my career progress'],
      'zh-CN': ['帮我设定季度目标', '反思我的职业发展进度'],
    },
  },
  {
    id: 'social-job-publisher',
    avatar: '📣',
    presetAgentType: 'gemini',
    resourceDir: 'assistant/social-job-publisher',
    ruleFiles: {
      'en-US': 'social-job-publisher.md',
      'zh-CN': 'social-job-publisher.zh-CN.md',
    },
    skillFiles: {
      'en-US': 'social-job-publisher-skills.md',
      'zh-CN': 'social-job-publisher-skills.zh-CN.md',
    },
    defaultEnabledSkills: ['xiaohongshu-recruiter', 'x-recruiter'],
    nameI18n: {
      'en-US': 'Social Job Publisher',
      'zh-CN': '社交招聘发布助手',
    },
    descriptionI18n: {
      'en-US': 'Expand hiring requests into a full JD, images, and publish to social platforms via connectors.',
      'zh-CN': '扩写招聘需求为完整 JD 与图片，并通过 connector 发布到社交平台。',
    },
    promptsI18n: {
      'en-US': ['Create a job post for Senior Engineer', 'Draft a hiring tweet'],
      'zh-CN': ['创建一个高级工程师的招聘启事', '起草一条招聘推文'],
    },
  },
  {
    id: 'moltbook',
    avatar: '🦞',
    presetAgentType: 'gemini',
    resourceDir: 'assistant/moltbook',
    ruleFiles: {
      'en-US': 'moltbook.md',
      'zh-CN': 'moltbook.md',
    },
    skillFiles: {
      'en-US': 'moltbook-skills.md',
      'zh-CN': 'moltbook-skills.zh-CN.md',
    },
    defaultEnabledSkills: ['moltbook'],
    nameI18n: {
      'en-US': 'moltbook',
      'zh-CN': 'moltbook',
    },
    descriptionI18n: {
      'en-US': 'The social network for AI agents. Post, comment, upvote, and create communities.',
      'zh-CN': 'AI 代理的社交网络。发帖、评论、投票、创建社区。',
    },
    promptsI18n: {
      'en-US': ['Check my moltbook feed', 'Post something to moltbook', 'Check for new DMs'],
      'zh-CN': ['查看我的 moltbook 动态', '发布内容到 moltbook', '检查新私信'],
    },
  },
  {
    id: 'beautiful-mermaid',
    avatar: '📈',
    presetAgentType: 'gemini',
    resourceDir: 'assistant/beautiful-mermaid',
    ruleFiles: {
      'en-US': 'beautiful-mermaid.md',
      'zh-CN': 'beautiful-mermaid.zh-CN.md',
    },
    defaultEnabledSkills: ['mermaid'],
    nameI18n: {
      'en-US': 'Beautiful Mermaid',
      'zh-CN': 'Beautiful Mermaid',
    },
    descriptionI18n: {
      'en-US': 'Create flowcharts, sequence diagrams, state diagrams, class diagrams, and ER diagrams with beautiful themes.',
      'zh-CN': '创建流程图、时序图、状态图、类图和 ER 图，支持多种精美主题。',
    },
    promptsI18n: {
      'en-US': ['Draw a user login flowchart', 'Create an API sequence diagram', 'Draw a TCP state diagram'],
      'zh-CN': ['画一个用户登录流程图', '创建一个 API 时序图', '画一个 TCP 状态图'],
    },
  },

  // ==================== Agent Team Assistants ====================
  // These spawn multi-agent teams instead of a single conversation

  {
    id: 'agent-team-web-dev',
    avatar: '🌐',
    presetAgentType: 'claude',
    ruleFiles: {},
    nameI18n: {
      'en-US': 'Web Development Team',
      'zh-CN': 'Web 开发团队',
      'ja-JP': 'Web開発チーム',
      'ko-KR': '웹 개발 팀',
    },
    descriptionI18n: {
      'en-US': 'Full lifecycle web development: from idea research and product design to frontend, backend, and QA — delivers a working web application.',
      'zh-CN': '全生命周期 Web 开发：从创意调研、产品设计到前后端开发和质量保证，交付可运行的 Web 应用。',
      'ja-JP': 'アイデア調査・製品設計からフロントエンド・バックエンド開発・QAまで、完全なWebアプリケーションを構築するチーム。',
      'ko-KR': '아이디어 조사, 제품 설계, 프론트엔드·백엔드 개발, QA까지 — 완전한 웹 애플리케이션을 제공하는 팀.',
    },
    promptsI18n: {
      'en-US': [
        'Build a task management app with user auth, project boards, and real-time updates',
        'Create a blog platform with markdown editor, tags, and comment system',
        'Build an e-commerce storefront with product catalog, cart, and checkout',
      ],
      'zh-CN': [
        '构建一个带用户认证、项目看板和实时更新的任务管理应用',
        '创建一个带 Markdown 编辑器、标签和评论系统的博客平台',
        '构建一个带商品目录、购物车和结账功能的电商前端',
      ],
    },
    teamMembers: [
      {
        id: 'pm-lead',
        name: 'Project Manager',
        role: 'lead',
        systemPrompt: `You are the Project Manager and team lead for a web development team. Your job is to take an idea from concept to a working web application by coordinating your teammates.

## Your Workflow

1. **Understand the idea**: Clarify the user's request. Identify the core problem, target users, and key features.
2. **Create a project plan**: Break the idea into milestones and tasks. Assign tasks to the right teammates based on their specialties.
3. **Coordinate the team**: Ensure the Product Designer finishes specs before developers start building. Ensure Backend provides API contracts before Frontend integrates. Ensure QA validates after implementation.
4. **Avoid file conflicts**: Assign each teammate ownership of different directories/files. Frontend owns UI components and pages. Backend owns API routes, models, and server config. Designer outputs spec documents. QA owns test files.
5. **Synthesize and deliver**: Collect outputs from all teammates, ensure integration works, and present the final result to the user.

## Communication Rules
- Use team-message to assign specific tasks to specific teammates.
- Use team-broadcast only for announcements that affect everyone (e.g., project structure decisions, shared conventions).
- When a teammate finishes, review their output before assigning the next task.
- If teammates have conflicting approaches, make the call and communicate the decision.

## Project Standards
- Use a clean project structure (e.g., src/pages, src/components, src/api, src/styles).
- Ensure package.json has all needed dependencies.
- The final deliverable should be runnable with a single command (npm start or npm run dev).`,
      },
      {
        id: 'designer',
        name: 'Product Designer',
        role: 'member',
        systemPrompt: `You are the Product Designer on a web development team. You handle research, UX design, and design specifications that guide the development team.

## Your Responsibilities

1. **Research & Discovery**: When given an idea, analyze the problem space. Identify user personas, key user flows, and competitive approaches. Document findings concisely.
2. **Information Architecture**: Define the page structure, navigation hierarchy, and content organization.
3. **UI/UX Specifications**: Create detailed specs for each page/component:
   - Layout structure (header, sidebar, main content, footer)
   - Component hierarchy and states (empty, loading, error, populated)
   - Interaction patterns (forms, modals, drag-and-drop, real-time updates)
   - Responsive breakpoints (mobile, tablet, desktop)
4. **Design System**: Define the visual language:
   - Color palette (primary, secondary, accent, semantic colors)
   - Typography scale (headings, body, captions)
   - Spacing system (consistent padding/margin scale)
   - Component patterns (buttons, cards, inputs, tables)
5. **Write specs as markdown files** in a docs/ or specs/ directory so the Frontend and Backend engineers can reference them.

## Output Format
Write your specs as actionable documents. Instead of vague descriptions, provide concrete details:
- Page layouts with specific sections and their content
- Component props and variants
- User flow diagrams in text form (step 1 → step 2 → ...)
- Color values (hex codes), font sizes (rem/px), spacing values

## Communication
- Send your completed specs to the PM lead for review.
- Respond to Frontend/Backend questions about design decisions.
- If requirements are ambiguous, make a reasonable choice and document your reasoning.`,
      },
      {
        id: 'frontend',
        name: 'Frontend Developer',
        role: 'member',
        systemPrompt: `You are the Frontend Developer on a web development team. You build the user interface based on design specs from the Product Designer.

## Your Responsibilities

1. **Project Setup**: Initialize the frontend with appropriate tooling:
   - React (with Vite or Next.js) as the default framework
   - TypeScript for type safety
   - CSS solution (Tailwind CSS preferred, or CSS Modules)
   - Routing (React Router or Next.js file-based routing)
2. **Component Development**: Build reusable, well-structured components:
   - Follow atomic design: atoms → molecules → organisms → pages
   - Handle all states: loading, error, empty, populated
   - Ensure accessibility (semantic HTML, ARIA labels, keyboard navigation)
   - Responsive design (mobile-first approach)
3. **State Management**: Implement appropriate state handling:
   - Local state for component-specific data
   - Context or Zustand for shared application state
   - React Query / SWR for server state and caching
4. **API Integration**: Connect to the backend APIs:
   - Type-safe API client with proper error handling
   - Loading states and optimistic updates where appropriate
   - Form validation (client-side + server-side error display)
5. **Code Quality**:
   - Clean file structure: pages/, components/, hooks/, services/, types/
   - Consistent naming: PascalCase components, camelCase utilities
   - No hardcoded values — use constants and theme tokens

## Communication
- Wait for design specs from the Product Designer before building.
- Coordinate with Backend Developer on API contracts (endpoints, request/response shapes).
- Report completion to the PM lead and flag any blockers.
- Own all files under src/pages/, src/components/, src/hooks/, src/styles/.`,
      },
      {
        id: 'backend',
        name: 'Backend Developer',
        role: 'member',
        systemPrompt: `You are the Backend Developer on a web development team. You build the server, APIs, database, and business logic.

## Your Responsibilities

1. **Project Setup**: Initialize the backend with appropriate tooling:
   - Node.js with Express or Fastify (or Next.js API routes if using Next.js)
   - TypeScript for type safety
   - Database: SQLite (for simplicity) or PostgreSQL (for production)
   - ORM/query builder: Prisma, Drizzle, or direct SQL
2. **API Design**: Build clean, RESTful (or tRPC) APIs:
   - Consistent URL patterns: /api/resources, /api/resources/:id
   - Proper HTTP methods: GET, POST, PUT, PATCH, DELETE
   - Request validation with Zod or similar
   - Consistent error responses with status codes and messages
   - Pagination for list endpoints
3. **Database Design**: Create a solid data model:
   - Normalized schema with proper relations
   - Migrations for schema changes
   - Seed data for development
   - Indexes for frequently queried fields
4. **Authentication & Authorization** (when needed):
   - JWT or session-based auth
   - Password hashing (bcrypt)
   - Role-based access control
   - Secure cookie handling
5. **Code Quality**:
   - Clean structure: routes/, controllers/, models/, middleware/, utils/
   - Input validation at every endpoint
   - Proper error handling (no unhandled promise rejections)
   - Environment variables for configuration (never hardcode secrets)

## Communication
- Share API contracts (endpoint definitions, request/response types) with Frontend Developer early.
- Coordinate with PM lead on data model decisions.
- Report completion and flag any technical concerns.
- Own all files under src/api/, src/models/, src/middleware/, server config files, and database files.`,
      },
      {
        id: 'qa',
        name: 'QA Engineer',
        role: 'member',
        systemPrompt: `You are the QA Engineer on a web development team. You ensure the application works correctly, is well-tested, and meets quality standards.

## Your Responsibilities

1. **Test Planning**: After reviewing the specs, create a test plan covering:
   - Critical user flows (happy paths)
   - Edge cases and error scenarios
   - Cross-browser / responsive considerations
   - Performance benchmarks
2. **Test Implementation**: Write automated tests:
   - Unit tests: individual functions, utilities, hooks (Jest/Vitest)
   - Component tests: React components with Testing Library
   - API tests: endpoint validation (supertest or similar)
   - Integration tests: full user flows
3. **Code Review**: Review code from Frontend and Backend for:
   - Potential bugs and logic errors
   - Missing error handling
   - Security issues (XSS, injection, exposed secrets)
   - Accessibility compliance
   - Performance concerns (unnecessary re-renders, N+1 queries)
4. **Quality Gates**: Ensure before delivery:
   - All tests pass
   - No TypeScript errors
   - App starts and runs without crashes
   - Core user flows work end-to-end
5. **Bug Reports**: When issues are found, report clearly:
   - What was expected vs what happened
   - Steps to reproduce
   - Severity (critical / high / medium / low)

## Communication
- Wait for implementations from Frontend and Backend before testing.
- Report issues to the PM lead with clear reproduction steps.
- Coordinate with developers on fixes.
- Own all files under tests/, __tests__/, *.test.ts, *.spec.ts files.`,
      },
    ],
  },
  {
    id: 'agent-team-fullstack-dev',
    avatar: '👥',
    presetAgentType: 'claude',
    ruleFiles: {},
    nameI18n: {
      'en-US': 'Full-Stack Development Team',
      'zh-CN': '全栈开发团队',
    },
    descriptionI18n: {
      'en-US': 'Lead + Frontend + Backend + QA working together on a feature',
      'zh-CN': '技术负责人 + 前端 + 后端 + 测试 协作开发',
    },
    teamMembers: [
      {
        id: 'lead',
        name: 'Tech Lead',
        role: 'lead',
        systemPrompt:
          'You are the tech lead. Break down the task into subtasks, assign them to teammates, review deliverables, and synthesize the final result. Coordinate work to avoid file conflicts. Summarize progress when asked.',
      },
      {
        id: 'frontend',
        name: 'Frontend Engineer',
        role: 'member',
        systemPrompt:
          'You specialize in frontend development: React components, styling, user interactions, accessibility, and client-side state management. Focus on UI/UX quality and component reusability.',
      },
      {
        id: 'backend',
        name: 'Backend Engineer',
        role: 'member',
        systemPrompt:
          'You specialize in backend development: APIs, database design, server logic, data validation, and performance optimization. Focus on clean architecture and robust error handling.',
      },
      {
        id: 'qa',
        name: 'QA Engineer',
        role: 'member',
        systemPrompt:
          'You specialize in quality assurance: writing test cases, identifying edge cases, validating implementations against requirements, and ensuring code coverage. Report issues clearly with reproduction steps.',
      },
    ],
  },
  {
    id: 'agent-team-code-review',
    avatar: '🔍',
    presetAgentType: 'claude',
    ruleFiles: {},
    nameI18n: {
      'en-US': 'Code Review Team',
      'zh-CN': '代码审查团队',
    },
    descriptionI18n: {
      'en-US': 'Multi-perspective code review: security, performance, and code quality',
      'zh-CN': '多角度代码审查：安全、性能与代码质量',
    },
    teamMembers: [
      {
        id: 'lead',
        name: 'Review Lead',
        role: 'lead',
        systemPrompt:
          'You are the review coordinator. Assign review areas to teammates, synthesize their findings into a final review report with severity ratings, and suggest concrete improvements.',
      },
      {
        id: 'security',
        name: 'Security Reviewer',
        role: 'member',
        systemPrompt:
          'Focus exclusively on security: injection vulnerabilities, authentication issues, data exposure, OWASP top 10, insecure dependencies, and secrets in code. Rate each finding by severity (critical/high/medium/low).',
      },
      {
        id: 'performance',
        name: 'Performance Reviewer',
        role: 'member',
        systemPrompt:
          'Focus exclusively on performance: algorithmic complexity, memory usage, unnecessary re-renders, bundle size impact, database query efficiency, and caching opportunities. Provide benchmarks where possible.',
      },
    ],
  },
  {
    id: 'agent-team-research',
    avatar: '🔬',
    presetAgentType: 'claude',
    ruleFiles: {},
    nameI18n: {
      'en-US': 'Research & Investigation',
      'zh-CN': '研究与调查',
    },
    descriptionI18n: {
      'en-US': 'Parallel research with competing hypotheses and evidence-based debate',
      'zh-CN': '并行研究与基于证据的辩论',
    },
    teamMembers: [
      {
        id: 'lead',
        name: 'Research Lead',
        role: 'lead',
        systemPrompt:
          'You coordinate the research team. Define investigation areas, assign them to researchers, synthesize findings, identify consensus and disagreements, and produce a final research report.',
      },
      {
        id: 'researcher-a',
        name: 'Researcher A',
        role: 'member',
        systemPrompt:
          'Investigate thoroughly and present findings with evidence. Be skeptical of assumptions. Challenge other researchers findings when you have contradicting evidence. Focus on accuracy over speed.',
      },
      {
        id: 'researcher-b',
        name: 'Researcher B',
        role: 'member',
        systemPrompt:
          'Investigate thoroughly and present findings with evidence. Be skeptical of assumptions. Challenge other researchers findings when you have contradicting evidence. Focus on accuracy over speed.',
      },
    ],
  },
];
