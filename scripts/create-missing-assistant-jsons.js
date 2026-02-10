#!/usr/bin/env node
/**
 * Create missing assistant.json files for builtin assistants
 * Run this after migration if assistant.json files are missing
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Assistant presets (copied from src/common/presets/assistantPresets.ts)
const ASSISTANT_PRESETS = [
  {
    id: 'cowork',
    avatar: 'cowork.svg',
    presetAgentType: 'gemini',
    defaultEnabledSkills: ['skill-creator', 'pptx', 'docx', 'pdf', 'xlsx'],
    nameI18n: {
      'en-US': 'Cowork',
      'zh-CN': 'Cowork',
    },
    descriptionI18n: {
      'en-US': 'Autonomous task execution with file operations, document processing, and multi-step workflow planning.',
      'zh-CN': '具有文件操作、文档处理和多步骤工作流规划的自主任务执行助手。',
    },
  },
  {
    id: 'pptx-generator',
    avatar: '📊',
    presetAgentType: 'gemini',
    nameI18n: {
      'en-US': 'PPTX Generator',
      'zh-CN': 'PPTX 生成器',
    },
    descriptionI18n: {
      'en-US': 'Generate local PPTX assets and structure for pptxgenjs.',
      'zh-CN': '生成本地 PPTX 资产与结构（pptxgenjs）。',
    },
  },
  {
    id: 'pdf-to-ppt',
    avatar: '📄',
    presetAgentType: 'gemini',
    nameI18n: {
      'en-US': 'PDF to PPT',
      'zh-CN': 'PDF 转 PPT',
    },
    descriptionI18n: {
      'en-US': 'Convert PDF to PPT with watermark removal rules.',
      'zh-CN': 'PDF 转 PPT 并去除水印规则',
    },
  },
  {
    id: 'game-3d',
    avatar: '🎮',
    presetAgentType: 'gemini',
    nameI18n: {
      'en-US': '3D Game',
      'zh-CN': '3D 游戏生成',
    },
    descriptionI18n: {
      'en-US': 'Generate a complete 3D platform collection game in one HTML file.',
      'zh-CN': '用单个 HTML 文件生成完整的 3D 平台收集游戏。',
    },
  },
  {
    id: 'ui-ux-pro-max',
    avatar: '🎨',
    presetAgentType: 'gemini',
    nameI18n: {
      'en-US': 'UI/UX Pro Max',
      'zh-CN': 'UI/UX 专业设计师',
    },
    descriptionI18n: {
      'en-US': 'Professional UI/UX design intelligence with 57 styles, 95 color palettes, 56 font pairings, and stack-specific best practices.',
      'zh-CN': '专业 UI/UX 设计智能助手，包含 57 种风格、95 个配色方案、56 个字体配对及技术栈最佳实践。',
    },
  },
  {
    id: 'planning-with-files',
    avatar: '📋',
    presetAgentType: 'gemini',
    nameI18n: {
      'en-US': 'Planning with Files',
      'zh-CN': '文件规划助手',
    },
    descriptionI18n: {
      'en-US': 'Manus-style file-based planning for complex tasks. Uses task_plan.md, findings.md, and progress.md to maintain persistent context.',
      'zh-CN': 'Manus 风格的文件规划，用于复杂任务。使用 task_plan.md、findings.md 和 progress.md 维护持久化上下文。',
    },
  },
  {
    id: 'human-3-coach',
    avatar: '🧭',
    presetAgentType: 'gemini',
    nameI18n: {
      'en-US': 'HUMAN 3.0 Coach',
      'zh-CN': 'HUMAN 3.0 教练',
    },
    descriptionI18n: {
      'en-US': 'Personal development coach based on HUMAN 3.0 framework: 4 Quadrants (Mind/Body/Spirit/Vocation), 3 Levels, 3 Growth Phases.',
      'zh-CN': '基于 HUMAN 3.0 框架的个人发展教练：4 象限（思维/身体/精神/职业）、3 层次、3 成长阶段。',
    },
  },
  {
    id: 'social-job-publisher',
    avatar: '📣',
    presetAgentType: 'gemini',
    defaultEnabledSkills: ['xiaohongshu-recruiter', 'x-recruiter'],
    nameI18n: {
      'en-US': 'Social Job Publisher',
      'zh-CN': '社交招聘发布助手',
    },
    descriptionI18n: {
      'en-US': 'Expand hiring requests into a full JD, images, and publish to social platforms via connectors.',
      'zh-CN': '扩写招聘需求为完整 JD 与图片，并通过 connector 发布到社交平台。',
    },
  },
  {
    id: 'moltbook',
    avatar: '🦞',
    presetAgentType: 'gemini',
    defaultEnabledSkills: ['moltbook'],
    nameI18n: {
      'en-US': 'moltbook',
      'zh-CN': 'moltbook',
    },
    descriptionI18n: {
      'en-US': 'The social network for AI agents. Post, comment, upvote, and create communities.',
      'zh-CN': 'AI 代理的社交网络。发帖、评论、投票、创建社区。',
    },
  },
  {
    id: 'beautiful-mermaid',
    avatar: '📈',
    presetAgentType: 'gemini',
    defaultEnabledSkills: ['mermaid'],
    nameI18n: {
      'en-US': 'Beautiful Mermaid',
      'zh-CN': 'Beautiful Mermaid',
    },
    descriptionI18n: {
      'en-US': 'Create flowcharts, sequence diagrams, state diagrams, class diagrams, and ER diagrams with beautiful themes.',
      'zh-CN': '创建流程图、时序图、状态图、类图和 ER 图，支持多种精美主题。',
    },
  },
];

// Get assistants directory path
function getAssistantsDir() {
  const platform = os.platform();
  let userDataPath;

  if (platform === 'darwin') {
    userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'AionUi');
  } else if (platform === 'win32') {
    userDataPath = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'AionUi');
  } else {
    userDataPath = path.join(os.homedir(), '.config', 'AionUi');
  }

  return path.join(userDataPath, 'config', 'assistants');
}

// Create assistant.json files
function createAssistantJsonFiles() {
  const assistantsDir = getAssistantsDir();
  console.log(`Assistants directory: ${assistantsDir}`);

  if (!fs.existsSync(assistantsDir)) {
    console.error(`Assistants directory does not exist: ${assistantsDir}`);
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const preset of ASSISTANT_PRESETS) {
    const assistantDir = path.join(assistantsDir, `builtin-${preset.id}`);
    const configPath = path.join(assistantDir, 'assistant.json');

    if (!fs.existsSync(assistantDir)) {
      console.log(`⚠️  Directory not found: builtin-${preset.id}`);
      continue;
    }

    if (fs.existsSync(configPath)) {
      console.log(`✓ Already exists: builtin-${preset.id}/assistant.json`);
      skipped++;
      continue;
    }

    // Create assistant.json
    const config = {
      id: `builtin-${preset.id}`,
      name: preset.nameI18n['en-US'],
      nameI18n: preset.nameI18n,
      description: preset.descriptionI18n['en-US'],
      descriptionI18n: preset.descriptionI18n,
      avatar: preset.avatar,
      presetAgentType: preset.presetAgentType || 'gemini',
      enabledSkills: preset.defaultEnabledSkills || [],
      enabled: preset.id === 'cowork', // Only Cowork enabled by default
      isBuiltin: true,
      isPreset: true,
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`✓ Created: builtin-${preset.id}/assistant.json`);
    created++;
  }

  console.log(`\nSummary:`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total: ${created + skipped}`);
}

// Run the script
createAssistantJsonFiles();
