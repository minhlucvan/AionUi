/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { mkdirSync as _mkdirSync, existsSync, readdirSync, readFileSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import { application } from '../common/ipcBridge';
import type { TMessage } from '@/common/chatLib';
import { ASSISTANT_PRESETS, type AssistantPreset } from '@/common/presets/assistantPresets';
import type { AssistantMetadata } from '@/assistant/types';
import type { IChatConversationRefer, IConfigStorageRefer, IEnvStorageRefer, IMcpServer, TChatConversation, TProviderWithModel } from '../common/storage';
import { ChatMessageStorage, ChatStorage, ConfigStorage, EnvStorage } from '../common/storage';
import { copyDirectoryRecursively, getConfigPath, getDataPath, getTempPath, verifyDirectoryFiles } from './utils';
import { getDatabase } from './database/export';
import type { AcpBackendConfig } from '@/types/acpTypes';
// Platform and architecture types (moved from deleted updateConfig)
type PlatformType = 'win32' | 'darwin' | 'linux';
type ArchitectureType = 'x64' | 'arm64' | 'ia32' | 'arm';

const nodePath = path;

const STORAGE_PATH = {
  config: 'aionui-config.txt',
  chatMessage: 'aionui-chat-message.txt',
  chat: 'aionui-chat.txt',
  env: '.aionui-env',
  assistants: 'assistants',
  skills: 'skills',
};

const getHomePage = getConfigPath;

const mkdirSync = (path: string) => {
  return _mkdirSync(path, { recursive: true });
};

/**
 * 迁移老版本数据从temp目录到userData/config目录
 */
const migrateLegacyData = async () => {
  const oldDir = getTempPath(); // 老的temp目录
  const newDir = getConfigPath(); // 新的userData/config目录

  try {
    // 检查新目录是否为空（不存在或者存在但无内容）
    const isNewDirEmpty =
      !existsSync(newDir) ||
      (() => {
        try {
          return existsSync(newDir) && readdirSync(newDir).length === 0;
        } catch (error) {
          console.warn('[AionUi] Warning: Could not read new directory during migration check:', error);
          return false; // 假设非空以避免迁移覆盖
        }
      })();

    // 检查迁移条件：老目录存在且新目录为空
    if (existsSync(oldDir) && isNewDirEmpty) {
      // 创建目标目录
      mkdirSync(newDir);

      // 复制所有文件和文件夹
      await copyDirectoryRecursively(oldDir, newDir);

      // 验证迁移是否成功
      const isVerified = await verifyDirectoryFiles(oldDir, newDir);
      if (isVerified) {
        // 确保不会删除相同的目录
        if (path.resolve(oldDir) !== path.resolve(newDir)) {
          try {
            await fs.rm(oldDir, { recursive: true });
          } catch (cleanupError) {
            console.warn('[AionUi] 原目录清理失败，请手动删除:', oldDir, cleanupError);
          }
        }
      }

      return true;
    }
  } catch (error) {
    console.error('[AionUi] 数据迁移失败:', error);
  }

  return false;
};

const WriteFile = (path: string, data: string) => {
  return fs.writeFile(path, data);
};

const ReadFile = (path: string) => {
  return fs.readFile(path);
};

const RmFile = (path: string) => {
  return fs.rm(path, { recursive: true });
};

const CopyFile = (src: string, dest: string) => {
  return fs.copyFile(src, dest);
};

const FileBuilder = (file: string) => {
  const stack: (() => Promise<unknown>)[] = [];
  let isRunning = false;
  const run = () => {
    if (isRunning || !stack.length) return;
    isRunning = true;
    void stack
      .shift()?.()
      .finally(() => {
        isRunning = false;
        run();
      });
  };
  const pushStack = <R>(fn: () => Promise<R>) => {
    return new Promise<R>((resolve, reject) => {
      stack.push(() => fn().then(resolve).catch(reject));
      run();
    });
  };
  return {
    path: file,
    write(data: string) {
      return pushStack(() => WriteFile(file, data));
    },
    read() {
      return pushStack(() =>
        ReadFile(file).then((data) => {
          return data.toString();
        })
      );
    },
    copy(dist: string) {
      return pushStack(() => CopyFile(file, dist));
    },
    rm() {
      return pushStack(() => RmFile(file));
    },
  };
};

const JsonFileBuilder = <S extends object = Record<string, unknown>>(path: string) => {
  const file = FileBuilder(path);
  const encode = (data: unknown) => {
    return btoa(encodeURIComponent(String(data)));
  };

  const decode = (base64: string) => {
    return decodeURIComponent(atob(base64));
  };

  const toJson = async (): Promise<S> => {
    try {
      const result = await file.read();
      if (!result) return {} as S;

      // 验证文件内容不为空且不是损坏的base64
      if (result.trim() === '') {
        console.warn(`[Storage] Empty file detected: ${path}`);
        return {} as S;
      }

      const decoded = decode(result);
      if (!decoded || decoded.trim() === '') {
        console.warn(`[Storage] Empty or corrupted content after decode: ${path}`);
        return {} as S;
      }

      const parsed = JSON.parse(decoded) as S;

      // 额外验证：如果是聊天历史文件且解析结果为空对象，警告用户
      if (path.includes('chat.txt') && Object.keys(parsed).length === 0) {
        console.warn(`[Storage] Chat history file appears to be empty: ${path}`);
      }

      return parsed;
    } catch (e) {
      // console.error(`[Storage] Error reading/parsing file ${path}:`, e);
      return {} as S;
    }
  };

  const setJson = async (data: S): Promise<S> => {
    try {
      await file.write(encode(JSON.stringify(data)));
      return data;
    } catch (e) {
      return Promise.reject(e);
    }
  };

  const toJsonSync = (): S => {
    try {
      return JSON.parse(decode(readFileSync(path).toString())) as S;
    } catch (e) {
      return {} as S;
    }
  };

  return {
    toJson,
    setJson,
    toJsonSync,
    async set<K extends keyof S>(key: K, value: Awaited<S>[K]): Promise<Awaited<S>[K]> {
      const data = await toJson();
      data[key] = value;
      await setJson(data);
      return value;
    },
    async get<K extends keyof S>(key: K): Promise<Awaited<S>[K]> {
      const data = await toJson();
      return data[key] as Awaited<S>[K];
    },
    async remove<K extends keyof S>(key: K) {
      const data = await toJson();
      delete data[key];
      return setJson(data);
    },
    clear() {
      return setJson({} as S);
    },
    getSync<K extends keyof S>(key: K): S[K] {
      const data = toJsonSync();
      return data[key];
    },
    update<K extends keyof S>(key: K, updateFn: (value: S[K], data: S) => Promise<S[K]>) {
      return toJson().then((data) => {
        return updateFn(data[key], data).then((value) => {
          data[key] = value;
          return setJson(data);
        });
      });
    },
    backup(fullName: string) {
      const dir = nodePath.dirname(fullName);
      if (!existsSync(dir)) {
        mkdirSync(dir);
      }
      return file.copy(fullName).then(() => file.rm());
    },
  };
};

const envFile = JsonFileBuilder<IEnvStorageRefer>(path.join(getHomePage(), STORAGE_PATH.env));

const dirConfig = envFile.getSync('aionui.dir');

const cacheDir = dirConfig?.cacheDir || getHomePage();

const configFile = JsonFileBuilder<IConfigStorageRefer>(path.join(cacheDir, STORAGE_PATH.config));
type ConversationHistoryData = Record<string, TMessage[]>;

const _chatMessageFile = JsonFileBuilder<ConversationHistoryData>(path.join(cacheDir, STORAGE_PATH.chatMessage));
const _chatFile = JsonFileBuilder<IChatConversationRefer>(path.join(cacheDir, STORAGE_PATH.chat));

// 创建带字段迁移的聊天历史代理
const isGeminiConversation = (conversation: TChatConversation): conversation is Extract<TChatConversation, { type: 'gemini' }> => {
  return conversation.type === 'gemini';
};

const chatFile = {
  ..._chatFile,
  async get<K extends keyof IChatConversationRefer>(key: K): Promise<IChatConversationRefer[K]> {
    const data = await _chatFile.get(key);

    // 特别处理 chat.history 的字段迁移
    if (key === 'chat.history' && Array.isArray(data)) {
      const history = data as IChatConversationRefer['chat.history'];
      return history.map((conversation: TChatConversation) => {
        // 只有 Gemini 会话带有 model 字段，需要将旧格式 selectedModel 迁移为 useModel
        if (isGeminiConversation(conversation) && conversation.model) {
          // 使用 Record 类型处理旧格式迁移
          const modelRecord = conversation.model as unknown as Record<string, unknown>;
          if ('selectedModel' in modelRecord && !('useModel' in modelRecord)) {
            modelRecord['useModel'] = modelRecord['selectedModel'];
            delete modelRecord['selectedModel'];
            conversation.model = modelRecord as TProviderWithModel;
          }
        }
        return conversation;
      }) as IChatConversationRefer[K];
    }

    return data;
  },
  async set<K extends keyof IChatConversationRefer>(key: K, value: IChatConversationRefer[K]): Promise<IChatConversationRefer[K]> {
    return await _chatFile.set(key, value);
  },
};

const buildMessageListStorage = (conversation_id: string, dir: string) => {
  const fullName = path.join(dir, 'aionui-chat-history', conversation_id + '.txt');
  if (!existsSync(fullName)) {
    mkdirSync(path.join(dir, 'aionui-chat-history'));
  }
  return JsonFileBuilder<TMessage[]>(path.join(dir, 'aionui-chat-history', conversation_id + '.txt'));
};

const conversationHistoryProxy = (options: typeof _chatMessageFile, dir: string) => {
  return {
    ...options,
    async set(key: string, data: TMessage[]) {
      const conversation_id = key;
      const storage = buildMessageListStorage(conversation_id, dir);
      return await storage.setJson(data);
    },
    async get(key: string): Promise<TMessage[]> {
      const conversation_id = key;
      const storage = buildMessageListStorage(conversation_id, dir);
      const data = await storage.toJson();
      if (Array.isArray(data)) return data;
      return [];
    },
    backup(conversation_id: string) {
      const storage = buildMessageListStorage(conversation_id, dir);
      return storage.backup(path.join(dir, 'aionui-chat-history', 'backup', conversation_id + '_' + Date.now() + '.txt'));
    },
  };
};

const chatMessageFile = conversationHistoryProxy(_chatMessageFile, cacheDir);

/**
 * 获取助手规则目录路径
 * Get assistant rules directory path
 */
const getAssistantsDir = () => {
  return path.join(cacheDir, STORAGE_PATH.assistants);
};

/**
 * 获取技能脚本目录路径
 * Get skills scripts directory path
 */
const getSkillsDir = () => {
  return path.join(cacheDir, STORAGE_PATH.skills);
};

/**
 * 获取内置技能目录路径（_builtin 子目录）
 * Get builtin skills directory path (_builtin subdirectory)
 * Skills in this directory are automatically injected for ALL agents and scenarios
 */
const getBuiltinSkillsDir = () => {
  return path.join(getSkillsDir(), '_builtin');
};

/**
 * Scan assistant/ source directory for directories containing assistant.json.
 * Builds AssistantPreset entries using metadata from assistant.json and
 * convention-based file detection (e.g. {id}.md, {id}.zh-CN.md, {id}-skills.md).
 *
 * @param resolveDir - function to resolve a relative path to an absolute source path
 * @returns auto-discovered presets (excludes IDs already in ASSISTANT_PRESETS)
 */
const scanAssistantSourcePresets = (resolveDir: (dirPath: string) => string): AssistantPreset[] => {
  const scanned: AssistantPreset[] = [];
  const staticIds = new Set(ASSISTANT_PRESETS.map((p) => p.id));

  const assistantSourceDir = resolveDir('assistant');
  if (!existsSync(assistantSourceDir)) {
    return scanned;
  }

  const entries = readdirSync(assistantSourceDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const dirName = entry.name;
    // Skip if already in static ASSISTANT_PRESETS
    if (staticIds.has(dirName)) continue;

    const dirPath = path.join(assistantSourceDir, dirName);
    const configPath = path.join(dirPath, 'assistant.json');

    if (!existsSync(configPath)) continue;

    try {
      const configContent = readFileSync(configPath, 'utf-8');
      const meta: AssistantMetadata = JSON.parse(configContent);

      // Auto-detect rule files by convention: {id}.md, {id}.{locale}.md
      let ruleFiles: Record<string, string> = {};
      if (meta.ruleFiles) {
        ruleFiles = meta.ruleFiles;
      } else {
        const files = readdirSync(dirPath);
        const defaultRule = `${dirName}.md`;
        if (files.includes(defaultRule)) {
          ruleFiles['en-US'] = defaultRule;
          // Also use as zh-CN fallback
          ruleFiles['zh-CN'] = defaultRule;
        }
        // Check for locale-specific overrides
        for (const file of files) {
          const localeMatch = file.match(new RegExp(`^${dirName}\\.([a-z]{2}-[A-Z]{2})\\.md$`));
          if (localeMatch) {
            ruleFiles[localeMatch[1]] = file;
          }
        }
      }

      // Auto-detect skill files by convention: {id}-skills.md, {id}-skills.{locale}.md
      let skillFiles: Record<string, string> | undefined;
      if (meta.skillFiles) {
        skillFiles = meta.skillFiles;
      } else {
        const files = readdirSync(dirPath);
        const detected: Record<string, string> = {};
        const defaultSkill = `${dirName}-skills.md`;
        if (files.includes(defaultSkill)) {
          detected['en-US'] = defaultSkill;
          detected['zh-CN'] = defaultSkill;
        }
        for (const file of files) {
          const localeMatch = file.match(new RegExp(`^${dirName}-skills\\.([a-z]{2}-[A-Z]{2})\\.md$`));
          if (localeMatch) {
            detected[localeMatch[1]] = file;
          }
        }
        if (Object.keys(detected).length > 0) {
          skillFiles = detected;
        }
      }

      const preset: AssistantPreset = {
        id: dirName,
        avatar: meta.avatar || '🤖',
        presetAgentType: meta.presetAgentType || 'gemini',
        resourceDir: `assistant/${dirName}`,
        ruleFiles,
        skillFiles,
        defaultEnabledSkills: meta.defaultEnabledSkills,
        nameI18n: meta.nameI18n || { 'en-US': meta.name || dirName },
        descriptionI18n: meta.descriptionI18n || { 'en-US': meta.description || '' },
        promptsI18n: meta.promptsI18n,
      };

      scanned.push(preset);
      console.log(`[AionUi] Auto-discovered assistant preset: ${dirName}`);
    } catch (error) {
      console.warn(`[AionUi] Failed to read assistant.json for ${dirName}:`, error);
    }
  }

  return scanned;
};

/**
 * Get all assistant presets: static ASSISTANT_PRESETS merged with auto-scanned ones.
 * Static entries take precedence (by ID) over auto-scanned entries.
 */
let _cachedAllPresets: AssistantPreset[] | null = null;
const getAllAssistantPresets = (resolveDir: (dirPath: string) => string): AssistantPreset[] => {
  if (_cachedAllPresets) return _cachedAllPresets;
  const scanned = scanAssistantSourcePresets(resolveDir);
  _cachedAllPresets = [...ASSISTANT_PRESETS, ...scanned];
  return _cachedAllPresets;
};

/**
 * 初始化内置助手的规则和技能文件到用户目录
 * Initialize builtin assistant rule and skill files to user directory
 */
const initBuiltinAssistantRules = async (): Promise<void> => {
  const assistantsDir = getAssistantsDir();

  // 开发模式下使用项目根目录，生产模式使用 app.getAppPath()
  // In development, use project root. In production, use app.getAppPath()
  // When packaged, resources are in asarUnpack, so they're at app.asar.unpacked/
  // 打包后，资源在 asarUnpack 中，所以在 app.asar.unpacked/ 目录下
  const resolveBuiltinDir = (dirPath: string): string => {
    const appPath = app.getAppPath();
    let candidates: string[];
    if (app.isPackaged) {
      // asarUnpack extracts files to app.asar.unpacked directory
      // asarUnpack 会将文件解压到 app.asar.unpacked 目录
      const unpackedPath = appPath.replace('app.asar', 'app.asar.unpacked');
      candidates = [
        path.join(unpackedPath, dirPath), // Unpacked location (preferred)
        path.join(appPath, dirPath), // Fallback to asar path
      ];
    } else {
      candidates = [path.join(appPath, dirPath), path.join(appPath, '..', dirPath), path.join(appPath, '..', '..', dirPath), path.join(appPath, '..', '..', '..', dirPath), path.join(process.cwd(), dirPath)];
    }

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    console.warn(`[AionUi] Could not find builtin ${dirPath} directory, tried:`, candidates);
    return candidates[0];
  };

  const rulesDir = resolveBuiltinDir('rules');
  const builtinSkillsDir = resolveBuiltinDir('skills');
  const userSkillsDir = getSkillsDir();

  // 复制技能脚本目录到用户配置目录
  // Copy skills scripts directory to user config directory
  if (existsSync(builtinSkillsDir)) {
    try {
      // 确保用户技能目录存在
      if (!existsSync(userSkillsDir)) {
        mkdirSync(userSkillsDir);
      }
      // 复制内置技能到用户目录（不覆盖已存在的文件）
      await copyDirectoryRecursively(builtinSkillsDir, userSkillsDir, { overwrite: false });
    } catch (error) {
      console.warn(`[AionUi] Failed to copy skills directory:`, error);
    }
  }

  // 确保助手目录存在 / Ensure assistants directory exists
  if (!existsSync(assistantsDir)) {
    mkdirSync(assistantsDir);
  }

  // Use merged presets: static ASSISTANT_PRESETS + auto-discovered from assistant/ directory
  const allPresets = getAllAssistantPresets(resolveBuiltinDir);

  for (const preset of allPresets) {
    const assistantId = `builtin-${preset.id}`;

    // 如果设置了 resourceDir，使用该目录；否则使用默认的 rules/ 目录
    // If resourceDir is set, use that directory; otherwise use default rules/ directory
    const presetRulesDir = preset.resourceDir ? resolveBuiltinDir(preset.resourceDir) : rulesDir;
    const presetSkillsDir = preset.resourceDir ? resolveBuiltinDir(preset.resourceDir) : builtinSkillsDir;

    // 复制规则文件 / Copy rule files
    const hasRuleFiles = Object.keys(preset.ruleFiles).length > 0;
    if (hasRuleFiles) {
      for (const [locale, ruleFile] of Object.entries(preset.ruleFiles)) {
        try {
          const sourceRulesPath = path.join(presetRulesDir, ruleFile);
          // 目标文件名格式：{assistantId}/{assistantId}.{locale}.md
          // Target file name format: {assistantId}/{assistantId}.{locale}.md
          const assistantSubDir = path.join(assistantsDir, assistantId);
          // 确保助手子目录存在 / Ensure assistant subdirectory exists
          if (!existsSync(assistantSubDir)) {
            mkdirSync(assistantSubDir);
          }
          const targetFileName = `${assistantId}.${locale}.md`;
          const targetPath = path.join(assistantSubDir, targetFileName);

          // 检查源文件是否存在 / Check if source file exists
          if (!existsSync(sourceRulesPath)) {
            console.warn(`[AionUi] Source rule file not found: ${sourceRulesPath}`);
            continue;
          }

          // 内置助手规则文件始终强制覆盖，确保用户获得最新版本
          // Always overwrite builtin assistant rule files to ensure users get the latest version
          let content = await fs.readFile(sourceRulesPath, 'utf-8');
          // 替换相对路径为绝对路径，确保 AI 能找到正确的脚本位置
          // Replace relative paths with absolute paths so AI can find scripts correctly
          content = content.replace(/skills\//g, userSkillsDir + '/');
          await fs.writeFile(targetPath, content, 'utf-8');
        } catch (error) {
          // 忽略缺失的语言文件 / Ignore missing locale files
          console.warn(`[AionUi] Failed to copy rule file ${ruleFile}:`, error);
        }
      }
    } else {
      // 如果助手没有 ruleFiles 配置，删除旧的 rules 缓存文件
      // If assistant has no ruleFiles config, delete old rules cache files
      const assistantSubDir = path.join(assistantsDir, assistantId);
      if (existsSync(assistantSubDir)) {
        const rulesFilePattern = new RegExp(`^${assistantId}\\..*\\.md$`);
        try {
          const files = readdirSync(assistantSubDir);
          for (const file of files) {
            if (rulesFilePattern.test(file)) {
              const filePath = path.join(assistantSubDir, file);
              await fs.unlink(filePath);
            }
          }
        } catch (error) {
          // 忽略删除失败 / Ignore deletion failure
        }
      }
    }

    // 复制技能文件 / Copy skill files (if preset has skills)
    if (preset.skillFiles) {
      for (const [locale, skillFile] of Object.entries(preset.skillFiles)) {
        try {
          const sourceSkillsPath = path.join(presetSkillsDir, skillFile);
          // 目标文件名格式：{assistantId}/{assistantId}-skills.{locale}.md
          // Target file name format: {assistantId}/{assistantId}-skills.{locale}.md
          const assistantSubDir = path.join(assistantsDir, assistantId);
          // 确保助手子目录存在 / Ensure assistant subdirectory exists
          if (!existsSync(assistantSubDir)) {
            mkdirSync(assistantSubDir);
          }
          const targetFileName = `${assistantId}-skills.${locale}.md`;
          const targetPath = path.join(assistantSubDir, targetFileName);

          // 检查源文件是否存在 / Check if source file exists
          if (!existsSync(sourceSkillsPath)) {
            console.warn(`[AionUi] Source skill file not found: ${sourceSkillsPath}`);
            continue;
          }

          // 内置助手技能文件始终强制覆盖，确保用户获得最新版本
          // Always overwrite builtin assistant skill files to ensure users get the latest version
          let content = await fs.readFile(sourceSkillsPath, 'utf-8');
          // 替换相对路径为绝对路径，确保 AI 能找到正确的脚本位置
          // Replace relative paths with absolute paths so AI can find scripts correctly
          content = content.replace(/skills\//g, userSkillsDir + '/');
          await fs.writeFile(targetPath, content, 'utf-8');
        } catch (error) {
          // 忽略缺失的技能文件 / Ignore missing skill files
          console.warn(`[AionUi] Failed to copy skill file ${skillFile}:`, error);
        }
      }
    } else {
      // 如果助手没有 skillFiles 配置，删除旧的 skills 缓存文件
      // If assistant has no skillFiles config, delete old skills cache files
      // 这样可以确保迁移到 SkillManager 后不会读取到旧的 presetSkills
      // This ensures old presetSkills won't be read after migrating to SkillManager
      const assistantSubDir = path.join(assistantsDir, assistantId);
      if (existsSync(assistantSubDir)) {
        const skillsFilePattern = new RegExp(`^${assistantId}-skills\\..*\\.md$`);
        try {
          const files = readdirSync(assistantSubDir);
          for (const file of files) {
            if (skillsFilePattern.test(file)) {
              const filePath = path.join(assistantSubDir, file);
              await fs.unlink(filePath);
            }
          }
        } catch (error) {
          // 忽略删除失败 / Ignore deletion failure
        }
      }
    }
  }
};

/**
 * 获取内置助手配置（不包含 context，context 从文件读取）
 * Get built-in assistant configurations (without context, context is read from files)
 */
/**
 * Scan assistants directory and load all assistant configurations
 * This unified function replaces preset-based initialization
 * Works for both builtin and custom assistants
 */
const getBuiltinAssistants = (): AcpBackendConfig[] => {
  const assistants: AcpBackendConfig[] = [];

  try {
    // Use dynamic import to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getAssistantsDir } = require('./migrations/assistantMigration');
    const assistantsDir = getAssistantsDir();

    // Check if directory exists
    if (!existsSync(assistantsDir)) {
      console.warn(`[AionUi] Assistants directory not found: ${assistantsDir}`);
      return assistants;
    }

    // Scan directory for all assistant folders
    const entries = readdirSync(assistantsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith('.')) continue; // Skip hidden directories

      const assistantPath = path.join(assistantsDir, entry.name);
      const configPath = path.join(assistantPath, 'assistant.json');

      // Try to load from assistant.json if it exists
      if (existsSync(configPath)) {
        try {
          const configContent = readFileSync(configPath, 'utf-8');
          const config = JSON.parse(configContent);

          assistants.push({
            id: entry.name,
            name: config.name || entry.name,
            nameI18n: config.nameI18n,
            description: config.description || '',
            descriptionI18n: config.descriptionI18n,
            avatar: config.avatar || '🤖',
            enabled: config.enabled !== false,
            isPreset: config.isPreset || false,
            isBuiltin: config.isBuiltin || false,
            presetAgentType: config.presetAgentType || 'gemini',
            enabledSkills: config.enabledSkills || [],
            customSkillNames: config.customSkillNames || [],
            assistantPath,
            workspacePath: config.workspacePath,
          });
          continue;
        } catch (error) {
          console.error(`[AionUi] Failed to load assistant.json for ${entry.name}:`, error);
        }
      }

      // Fallback: Generate config from all presets (static + auto-discovered) if no assistant.json
      // This supports assistants that only have markdown files (migrated from resources/assistant/)
      const presetId = entry.name.startsWith('builtin-') ? entry.name.slice(8) : entry.name;
      const allPresets = _cachedAllPresets || ASSISTANT_PRESETS;
      const preset = allPresets.find((p) => p.id === presetId);

      if (preset) {
        const locale = 'en-US'; // Default locale
        assistants.push({
          id: entry.name,
          name: preset.nameI18n[locale] || preset.nameI18n['en-US'] || presetId,
          nameI18n: preset.nameI18n,
          description: preset.descriptionI18n[locale] || preset.descriptionI18n['en-US'] || '',
          descriptionI18n: preset.descriptionI18n,
          avatar: preset.avatar || '🤖',
          enabled: presetId === 'cowork', // Only Cowork enabled by default
          isPreset: true,
          isBuiltin: true,
          presetAgentType: preset.presetAgentType || 'gemini',
          enabledSkills: preset.defaultEnabledSkills || [],
          customSkillNames: [],
          assistantPath,
        });
      } else {
        console.warn(`[AionUi] No assistant.json or preset found for: ${entry.name}`);
      }
    }

    console.log(`[AionUi] Loaded ${assistants.length} assistants from filesystem`);
  } catch (error) {
    console.error('[AionUi] Failed to scan assistants directory:', error);
  }

  return assistants;
};

/**
 * 创建默认的 MCP 服务器配置
 */
const getDefaultMcpServers = (): IMcpServer[] => {
  const now = Date.now();
  const defaultConfig = {
    mcpServers: {
      'chrome-devtools': {
        command: 'npx',
        args: ['-y', 'chrome-devtools-mcp@latest'],
      },
    },
  };

  return Object.entries(defaultConfig.mcpServers).map(([name, config], index) => ({
    id: `mcp_default_${now}_${index}`,
    name,
    description: `Default MCP server: ${name}`,
    enabled: false, // 默认不启用，让用户手动开启
    transport: {
      type: 'stdio' as const,
      command: config.command,
      args: config.args,
    },
    createdAt: now,
    updatedAt: now,
    originalJson: JSON.stringify({ [name]: config }, null, 2),
  }));
};

const initStorage = async () => {
  console.log('[AionUi] Starting storage initialization...');

  // 1. 先执行数据迁移（在任何目录创建之前）
  await migrateLegacyData();

  // 2. 创建必要的目录（迁移后再创建，确保迁移能正常进行）
  if (!existsSync(getHomePage())) {
    mkdirSync(getHomePage());
  }
  if (!existsSync(getDataPath())) {
    mkdirSync(getDataPath());
  }

  // 3. 初始化存储系统
  ConfigStorage.interceptor(configFile);
  ChatStorage.interceptor(chatFile);
  ChatMessageStorage.interceptor(chatMessageFile);
  EnvStorage.interceptor(envFile);

  // 4. 初始化 MCP 配置（为所有用户提供默认配置）
  try {
    const existingMcpConfig = await configFile.get('mcp.config').catch((): undefined => undefined);

    // 仅当配置不存在或为空时，写入默认值（适用于新用户和老用户）
    if (!existingMcpConfig || !Array.isArray(existingMcpConfig) || existingMcpConfig.length === 0) {
      const defaultServers = getDefaultMcpServers();
      await configFile.set('mcp.config', defaultServers);
      console.log('[AionUi] Default MCP servers initialized');
    }
  } catch (error) {
    console.error('[AionUi] Failed to initialize default MCP servers:', error);
  }
  // 5. 初始化内置助手（Assistants）
  try {
    // 5.1 初始化内置助手的规则文件到用户目录
    // Initialize builtin assistant rule files to user directory
    await initBuiltinAssistantRules();

    // 5.2 初始化助手配置（只包含元数据，不包含 context）
    // Initialize assistant config (metadata only, no context)
    const existingAgents = (await configFile.get('acp.customAgents').catch((): undefined => undefined)) || [];
    const builtinAssistants = getBuiltinAssistants();

    // 5.2.1 检查是否需要迁移：修复老版本中所有助手都默认启用的问题
    // Check if migration needed: fix old version where all assistants were enabled by default
    const ASSISTANT_ENABLED_MIGRATION_KEY = 'migration.assistantEnabledFixed';
    const migrationDone = await configFile.get(ASSISTANT_ENABLED_MIGRATION_KEY).catch(() => false);
    const needsMigration = !migrationDone && existingAgents.length > 0;

    // 5.2.2 检查是否需要迁移：为内置助手添加默认启用的技能
    // Check if migration needed: add default enabled skills for builtin assistants
    const BUILTIN_SKILLS_MIGRATION_KEY = 'migration.builtinDefaultSkillsAdded_v2';
    const builtinSkillsMigrationDone = await configFile.get(BUILTIN_SKILLS_MIGRATION_KEY).catch(() => false);
    const needsBuiltinSkillsMigration = !builtinSkillsMigrationDone;

    // 更新或添加内置助手配置
    // Update or add built-in assistant configurations
    const updatedAgents = [...existingAgents];
    let hasChanges = false;

    for (const builtin of builtinAssistants) {
      const index = updatedAgents.findIndex((a: AcpBackendConfig) => a.id === builtin.id);
      if (index >= 0) {
        // 更新现有内置助手配置
        // Update existing built-in assistant config
        const existing = updatedAgents[index];
        // 只有当关键字段不同时才更新，避免不必要的写入
        // Update only if key fields are different to avoid unnecessary writes
        // 注意：enabled 和 presetAgentType 字段由用户控制，不参与 shouldUpdate 判断
        // Note: enabled and presetAgentType are user-controlled, not included in shouldUpdate check
        const shouldUpdate = existing.name !== builtin.name || existing.description !== builtin.description || existing.avatar !== builtin.avatar || existing.isPreset !== builtin.isPreset || existing.isBuiltin !== builtin.isBuiltin;
        // 当 enabled 是 undefined 或需要迁移时，设置默认值（Cowork 启用，其他禁用）
        // When enabled is undefined or migration needed, set default value (Cowork enabled, others disabled)
        const needsEnabledFix = existing.enabled === undefined || needsMigration;
        // 迁移时强制使用默认值，否则保留用户设置
        // Force default value during migration, otherwise preserve user setting
        const resolvedEnabled = needsEnabledFix ? builtin.enabled : existing.enabled;
        // presetAgentType 由用户控制，未设置时使用内置默认值
        // presetAgentType is user-controlled, use builtin default if not set
        const resolvedPresetAgentType = existing.presetAgentType ?? builtin.presetAgentType;

        // 为有 defaultEnabledSkills 配置的内置助手添加默认技能（仅在迁移时且用户未设置 enabledSkills 时）
        // Add default enabled skills for builtin assistants with defaultEnabledSkills (only during migration and if user hasn't set enabledSkills)
        let resolvedEnabledSkills = existing.enabledSkills;
        const needsSkillsMigration = needsBuiltinSkillsMigration && builtin.enabledSkills && (!existing.enabledSkills || existing.enabledSkills.length === 0);
        if (needsSkillsMigration) {
          resolvedEnabledSkills = builtin.enabledSkills;
        }

        if (shouldUpdate || needsEnabledFix || (needsSkillsMigration && resolvedEnabledSkills !== existing.enabledSkills)) {
          // 保留用户已设置的 enabled 和 presetAgentType / Preserve user-set enabled and presetAgentType
          updatedAgents[index] = {
            ...existing,
            ...builtin,
            enabled: resolvedEnabled,
            presetAgentType: resolvedPresetAgentType,
            enabledSkills: resolvedEnabledSkills,
          };
          hasChanges = true;
        }
      } else {
        // 添加新的内置助手
        // Add new built-in assistant
        updatedAgents.unshift(builtin);
        hasChanges = true;
      }
    }

    // Remove legacy non-prefixed duplicates of builtin assistants
    // Old migrations may have created entries like "cowork" alongside "builtin-cowork"
    const builtinIds = new Set(builtinAssistants.map((b) => b.id));
    const lengthBefore = updatedAgents.length;
    for (let i = updatedAgents.length - 1; i >= 0; i--) {
      const agent = updatedAgents[i];
      const prefixedId = `builtin-${agent.id}`;
      if (!builtinIds.has(agent.id) && builtinIds.has(prefixedId)) {
        // This is a legacy entry (e.g. "cowork") that has a builtin counterpart ("builtin-cowork")
        updatedAgents.splice(i, 1);
      }
    }
    if (updatedAgents.length !== lengthBefore) {
      console.log(`[AionUi] Removed ${lengthBefore - updatedAgents.length} legacy duplicate assistant(s)`);
      hasChanges = true;
    }

    if (hasChanges) {
      await configFile.set('acp.customAgents', updatedAgents);
    }

    // 标记迁移完成 / Mark migration as done
    if (needsMigration) {
      await configFile.set(ASSISTANT_ENABLED_MIGRATION_KEY, true);
    }
    if (needsBuiltinSkillsMigration) {
      await configFile.set(BUILTIN_SKILLS_MIGRATION_KEY, true);
    }
  } catch (error) {
    console.error('[AionUi] Failed to initialize builtin assistants:', error);
  }

  // 6. 初始化数据库（better-sqlite3）
  try {
    getDatabase();
  } catch (error) {
    console.error('[InitStorage] Database initialization failed, falling back to file-based storage:', error);
  }

  application.systemInfo.provider(() => {
    return Promise.resolve(getSystemDir());
  });
};

export const ProcessConfig = configFile;

export const ProcessChat = chatFile;

export const ProcessChatMessage = chatMessageFile;

export const ProcessEnv = envFile;

export const getSystemDir = () => {
  return {
    cacheDir: cacheDir,
    // getDataPath() returns CLI-safe path (symlink on macOS) to avoid spaces
    // getDataPath() 返回 CLI 安全路径（macOS 上的符号链接）以避免空格问题
    workDir: dirConfig?.workDir || getDataPath(),
    platform: process.platform as PlatformType,
    arch: process.arch as ArchitectureType,
  };
};

/**
 * 获取助手规则目录路径（供其他模块使用）
 * Get assistant rules directory path (for use by other modules)
 */
export { getAssistantsDir, getSkillsDir, getBuiltinSkillsDir };

/**
 * Skills 内容缓存，避免重复从文件系统读取
 * Skills content cache to avoid repeated file system reads
 */
const skillsContentCache = new Map<string, string>();

/**
 * 加载指定 skills 的内容（带缓存）
 * Load content of specified skills (with caching)
 * @param enabledSkills - skill 名称列表 / list of skill names
 * @returns 合并后的 skills 内容 / merged skills content
 */
export const loadSkillsContent = async (enabledSkills: string[]): Promise<string> => {
  if (!enabledSkills || enabledSkills.length === 0) {
    return '';
  }

  // 使用排序后的 skill 名称作为缓存 key，确保相同组合命中缓存
  // Use sorted skill names as cache key to ensure same combinations hit cache
  const cacheKey = [...enabledSkills].sort().join(',');
  const cached = skillsContentCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const skillsDir = getSkillsDir();
  const builtinSkillsDir = getBuiltinSkillsDir();
  const skillContents: string[] = [];

  for (const skillName of enabledSkills) {
    // 优先尝试内置 skills 目录：_builtin/{skillName}/SKILL.md
    // First try builtin skills directory: _builtin/{skillName}/SKILL.md
    const builtinSkillFile = path.join(builtinSkillsDir, skillName, 'SKILL.md');
    // 然后尝试目录结构：{skillName}/SKILL.md（与 aioncli-core 的 loadSkillsFromDir 一致）
    // Then try directory structure: {skillName}/SKILL.md (consistent with aioncli-core's loadSkillsFromDir)
    const skillDirFile = path.join(skillsDir, skillName, 'SKILL.md');
    // 向后兼容：扁平结构 {skillName}.md
    // Backward compatible: flat structure {skillName}.md
    const skillFlatFile = path.join(skillsDir, `${skillName}.md`);

    try {
      let content: string | null = null;

      if (existsSync(builtinSkillFile)) {
        content = await fs.readFile(builtinSkillFile, 'utf-8');
      } else if (existsSync(skillDirFile)) {
        content = await fs.readFile(skillDirFile, 'utf-8');
      } else if (existsSync(skillFlatFile)) {
        content = await fs.readFile(skillFlatFile, 'utf-8');
      }

      if (content && content.trim()) {
        skillContents.push(`## Skill: ${skillName}\n${content}`);
      }
    } catch (error) {
      console.warn(`[AionUi] Failed to load skill ${skillName}:`, error);
    }
  }

  const result = skillContents.length === 0 ? '' : `[Available Skills]\n${skillContents.join('\n\n')}`;

  // 缓存结果 / Cache result
  skillsContentCache.set(cacheKey, result);

  return result;
};

/**
 * 清除 skills 缓存（在 skills 文件更新后调用）
 * Clear skills cache (call after skills files are updated)
 */
export const clearSkillsCache = (): void => {
  skillsContentCache.clear();
};

export default initStorage;
