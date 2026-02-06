/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button, Collapse, Empty, Input, Message, Modal, Tag, Typography, Spin } from '@arco-design/web-react';
import { Delete, FolderOpen, Plus, Search, Star, Download } from '@icon-park/react';
import classNames from 'classnames';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';
import { ConfigStorage } from '@/common/storage';
import AionScrollArea from '@/renderer/components/base/AionScrollArea';
import { useSettingsViewMode } from '../settingsViewContext';

interface SkillInfo {
  name: string;
  description: string;
  location: string;
  isCustom: boolean;
}

interface SkillsMPSkill {
  id: string;
  name: string;
  description: string;
  author?: string;
  stars?: number;
  updatedAt?: number;
  tags?: string[];
  githubUrl?: string;
  skillUrl?: string;
}

type MessageInstance = ReturnType<typeof Message.useMessage>[0];

// ============================================================================
// Installed Skills Section
// ============================================================================
const InstalledSkillsSection: React.FC<{
  message: MessageInstance;
  skills: SkillInfo[];
  loading: boolean;
  onRefresh: () => void;
  isPageMode?: boolean;
}> = ({ message, skills, loading, onRefresh, isPageMode }) => {
  const { t } = useTranslation();
  const [deleteSkillName, setDeleteSkillName] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const builtinSkills = skills.filter((s) => !s.isCustom);
  const customSkills = skills.filter((s) => s.isCustom);

  const handleDelete = useCallback(async () => {
    if (!deleteSkillName) return;
    setDeleting(true);
    try {
      const response = await ipcBridge.fs.deleteCustomSkill.invoke({ skillName: deleteSkillName });
      if (response.success) {
        message.success(t('settings.skillDeleteSuccess', { name: deleteSkillName, defaultValue: `Skill "${deleteSkillName}" deleted` }));
        onRefresh();
      } else {
        message.error(response.msg || t('settings.skillDeleteFailed', { defaultValue: 'Failed to delete skill' }));
      }
    } catch (error) {
      console.error('Failed to delete skill:', error);
      message.error(t('settings.skillDeleteFailed', { defaultValue: 'Failed to delete skill' }));
    } finally {
      setDeleting(false);
      setDeleteSkillName(null);
    }
  }, [deleteSkillName, message, t, onRefresh]);

  return (
    <div className='flex flex-col gap-16px min-h-0'>
      <div className='flex gap-8px items-center justify-between'>
        <div className='text-14px text-t-primary'>{t('settings.skillsInstalledTitle', { defaultValue: 'Installed Skills' })}</div>
        <div className='text-12px text-t-secondary'>
          {t('settings.skillsInstalledCount', { count: skills.length, defaultValue: `${skills.length} skills` })}
        </div>
      </div>

      {loading ? (
        <div className='flex items-center justify-center py-40px'>
          <Spin size={24} />
        </div>
      ) : skills.length === 0 ? (
        <div className='py-24px text-center text-t-secondary text-14px border border-dashed border-border-2 rd-12px'>
          {t('settings.skillsNoneInstalled', { defaultValue: 'No skills installed yet. Browse SkillsMP or import from a local folder.' })}
        </div>
      ) : (
        <AionScrollArea className={classNames('max-h-500px', isPageMode && 'max-h-none')} disableOverflow={isPageMode}>
          <Collapse defaultActiveKey={['custom-skills', 'builtin-skills']}>
            {customSkills.length > 0 && (
              <Collapse.Item
                header={<span className='text-13px font-medium'>{t('settings.customSkills', { defaultValue: 'Custom Skills' })}</span>}
                name='custom-skills'
                extra={<span className='text-12px text-t-secondary'>{customSkills.length}</span>}
              >
                <div className='space-y-4px'>
                  {customSkills.map((skill) => (
                    <div key={skill.name} className='flex items-start gap-10px p-10px hover:bg-fill-1 rounded-8px group transition-colors'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-6px'>
                          <div className='text-13px font-medium text-t-primary'>{skill.name}</div>
                          <Tag size='small' color='orangered' className='text-10px'>
                            Custom
                          </Tag>
                        </div>
                        {skill.description && <div className='text-12px text-t-secondary mt-2px line-clamp-2'>{skill.description}</div>}
                        <div className='text-11px text-t-quaternary mt-4px truncate'>{skill.location}</div>
                      </div>
                      <button
                        className='opacity-0 group-hover:opacity-100 transition-opacity p-4px hover:bg-fill-2 rounded-4px flex-shrink-0'
                        onClick={() => setDeleteSkillName(skill.name)}
                        title={t('common.delete', { defaultValue: 'Delete' })}
                      >
                        <Delete size={16} fill='var(--color-text-3)' />
                      </button>
                    </div>
                  ))}
                </div>
              </Collapse.Item>
            )}
            <Collapse.Item
              header={<span className='text-13px font-medium'>{t('settings.builtinSkills', { defaultValue: 'Builtin Skills' })}</span>}
              name='builtin-skills'
              extra={<span className='text-12px text-t-secondary'>{builtinSkills.length}</span>}
            >
              {builtinSkills.length > 0 ? (
                <div className='space-y-4px'>
                  {builtinSkills.map((skill) => (
                    <div key={skill.name} className='flex items-start gap-10px p-10px hover:bg-fill-1 rounded-8px transition-colors'>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-6px'>
                          <div className='text-13px font-medium text-t-primary'>{skill.name}</div>
                          <Tag size='small' color='arcoblue' className='text-10px'>
                            Builtin
                          </Tag>
                        </div>
                        {skill.description && <div className='text-12px text-t-secondary mt-2px line-clamp-2'>{skill.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='text-center text-t-secondary text-12px py-16px'>
                  {t('settings.noBuiltinSkills', { defaultValue: 'No builtin skills available' })}
                </div>
              )}
            </Collapse.Item>
          </Collapse>
        </AionScrollArea>
      )}

      {/* Delete Confirmation */}
      <Modal
        visible={deleteSkillName !== null}
        onCancel={() => setDeleteSkillName(null)}
        title={t('settings.skillDeleteTitle', { defaultValue: 'Delete Skill' })}
        okButtonProps={{ status: 'danger', loading: deleting }}
        okText={t('common.delete', { defaultValue: 'Delete' })}
        cancelText={t('common.cancel', { defaultValue: 'Cancel' })}
        onOk={handleDelete}
        style={{ width: 400 }}
      >
        <p>
          {t('settings.skillDeleteConfirm', {
            name: deleteSkillName,
            defaultValue: `Are you sure you want to delete "${deleteSkillName}"? This will remove the skill files from disk.`,
          })}
        </p>
      </Modal>
    </div>
  );
};

// ============================================================================
// SkillsMP Browse Section
// ============================================================================
const SkillsMPBrowseSection: React.FC<{
  message: MessageInstance;
  onInstalled: () => void;
  installedSkillNames: string[];
  isPageMode?: boolean;
}> = ({ message, onInstalled, installedSkillNames, isPageMode }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SkillsMPSkill[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const handleSearch = useCallback(
    async (pageNum = 1, sortBy?: 'stars' | 'recent') => {
      const query = searchQuery.trim();
      if (!query) return;

      setLoading(true);
      setHasSearched(true);
      try {
        const apiKey = ConfigStorage.get('skillsmp.apiKey') || '';
        const response = await ipcBridge.fs.searchSkillsMPSkills.invoke({
          query,
          page: pageNum,
          perPage: 20,
          sortBy,
          apiKey: apiKey || undefined,
        });
        if (response.success && response.data) {
          if (pageNum === 1) {
            setResults(response.data.items);
          } else {
            setResults((prev) => [...prev, ...response.data!.items]);
          }
          setTotalCount(response.data.total_count);
          setPage(pageNum);
          setHasNext(response.data.hasNext ?? false);
        } else {
          message.error(response.msg || t('settings.skillBrowseSearchFailed', { defaultValue: 'Search failed' }));
        }
      } catch {
        message.error(t('settings.skillBrowseSearchFailed', { defaultValue: 'Search failed' }));
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, message, t]
  );

  const handleInstall = useCallback(
    async (skill: SkillsMPSkill) => {
      if (!skill.githubUrl) {
        message.error(t('settings.skillBrowseNoGitHub', { defaultValue: 'No GitHub URL available for this skill' }));
        return;
      }
      const cloneUrl = skill.githubUrl.endsWith('.git') ? skill.githubUrl : `${skill.githubUrl}.git`;
      setInstalling(skill.id);
      try {
        const response = await ipcBridge.fs.installSkillFromGitHub.invoke({
          cloneUrl,
          repoName: skill.name,
        });
        if (response.success && response.data) {
          message.success(
            t('settings.skillBrowseInstallSuccess', {
              name: response.data.skillName,
              defaultValue: `Skill "${response.data.skillName}" installed successfully`,
            })
          );
          onInstalled();
        } else {
          message.error(response.msg || t('settings.skillBrowseInstallFailed', { defaultValue: 'Installation failed' }));
        }
      } catch {
        message.error(t('settings.skillBrowseInstallFailed', { defaultValue: 'Installation failed' }));
      } finally {
        setInstalling(null);
      }
    },
    [message, t, onInstalled]
  );

  const handleTagClick = useCallback(
    (query: string, sortBy?: 'stars' | 'recent') => {
      setSearchQuery(query);
      setLoading(true);
      setHasSearched(true);
      void (async () => {
        try {
          const apiKey = ConfigStorage.get('skillsmp.apiKey') || '';
          const response = await ipcBridge.fs.searchSkillsMPSkills.invoke({
            query,
            page: 1,
            perPage: 20,
            sortBy,
            apiKey: apiKey || undefined,
          });
          if (response.success && response.data) {
            setResults(response.data.items);
            setTotalCount(response.data.total_count);
            setPage(1);
            setHasNext(response.data.hasNext ?? false);
          }
        } catch {
          // ignore
        } finally {
          setLoading(false);
        }
      })();
    },
    []
  );

  const formatStars = (count?: number) => {
    if (!count) return '0';
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  return (
    <div className='flex flex-col gap-16px min-h-0'>
      <div className='flex items-center gap-8px'>
        <div className='text-14px text-t-primary'>{t('settings.skillBrowseTitle', { defaultValue: 'Browse Skills on SkillsMP' })}</div>
        <span
          className='text-11px text-primary cursor-pointer hover:underline'
          onClick={() => void ipcBridge.shell.openExternal.invoke('https://skillsmp.com')}
        >
          skillsmp.com
        </span>
      </div>

      {/* Search bar */}
      <div className='flex gap-8px'>
        <Input
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={t('settings.skillBrowseSearchPlaceholder', { defaultValue: 'Search 145k+ agent skills...' })}
          onPressEnter={() => void handleSearch(1)}
          prefix={<Search size={16} />}
          className='flex-1'
          allowClear
        />
        <Button type='primary' loading={loading && !results.length} onClick={() => void handleSearch(1)}>
          {t('common.search', { defaultValue: 'Search' })}
        </Button>
      </div>

      {/* Category presets */}
      <div className='flex flex-wrap gap-6px'>
        {[
          { label: 'Popular', query: 'SKILL.md', sortBy: 'stars' as const },
          { label: 'Recent', query: 'SKILL.md', sortBy: 'recent' as const },
          { label: 'Claude', query: 'claude skills' },
          { label: 'Gemini', query: 'gemini skills' },
          { label: 'Coding', query: 'coding development' },
        ].map((preset) => (
          <Tag
            key={`${preset.query}-${preset.sortBy || ''}`}
            className='cursor-pointer'
            color='arcoblue'
            onClick={() => handleTagClick(preset.query, preset.sortBy)}
          >
            {preset.label}
          </Tag>
        ))}
      </div>

      {/* Results */}
      <AionScrollArea className={classNames('max-h-400px', isPageMode && 'max-h-none')} disableOverflow={isPageMode}>
        {loading && results.length === 0 ? (
          <div className='flex items-center justify-center py-40px'>
            <Spin size={24} />
          </div>
        ) : results.length > 0 ? (
          <div className='space-y-8px'>
            <div className='text-12px text-t-secondary mb-4px'>
              {t('settings.skillBrowseResultCount', { count: totalCount, defaultValue: `${totalCount} skills found` })}
            </div>
            {results.map((skill) => {
              const isInstalled = installedSkillNames.some((n) => n === skill.name);
              return (
                <div key={skill.id || skill.name} className='border border-border-2 rounded-8px p-12px hover:bg-fill-1 transition-colors'>
                  <div className='flex items-start gap-10px'>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-6px flex-wrap'>
                        <Typography.Text
                          bold
                          className='text-14px text-primary cursor-pointer hover:underline'
                          onClick={() => {
                            const url = skill.skillUrl || skill.githubUrl;
                            if (url) void ipcBridge.shell.openExternal.invoke(url);
                          }}
                        >
                          {skill.name}
                        </Typography.Text>
                        {skill.author && <span className='text-12px text-t-secondary'>by {skill.author}</span>}
                        {(skill.stars ?? 0) > 0 && (
                          <span className='flex items-center gap-2px text-12px text-t-secondary'>
                            <Star size={12} fill='var(--color-text-3)' />
                            {formatStars(skill.stars)}
                          </span>
                        )}
                        {skill.updatedAt && <span className='text-12px text-t-secondary'>{formatDate(skill.updatedAt)}</span>}
                      </div>
                      {skill.description && <div className='text-12px text-t-secondary mt-4px line-clamp-2'>{skill.description}</div>}
                      {skill.tags && skill.tags.length > 0 && (
                        <div className='flex flex-wrap gap-4px mt-6px'>
                          {skill.tags.slice(0, 6).map((tag) => (
                            <Tag key={tag} size='small' color='green' className='text-11px'>
                              {tag}
                            </Tag>
                          ))}
                          {skill.tags.length > 6 && (
                            <Tag size='small' color='gray' className='text-11px'>
                              +{skill.tags.length - 6}
                            </Tag>
                          )}
                        </div>
                      )}
                    </div>
                    {isInstalled ? (
                      <Tag color='green' size='small' className='flex-shrink-0'>
                        {t('settings.skillAlreadyInstalled', { defaultValue: 'Installed' })}
                      </Tag>
                    ) : (
                      <Button
                        type='outline'
                        size='small'
                        className='flex-shrink-0'
                        loading={installing === skill.id}
                        disabled={!skill.githubUrl}
                        icon={<Download size={14} />}
                        onClick={() => void handleInstall(skill)}
                      >
                        {t('settings.skillBrowseInstall', { defaultValue: 'Install' })}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {hasNext && (
              <div className='flex justify-center pt-8px'>
                <Button type='text' loading={loading} onClick={() => void handleSearch(page + 1)}>
                  {t('settings.skillBrowseLoadMore', { defaultValue: 'Load more' })}
                </Button>
              </div>
            )}
          </div>
        ) : hasSearched ? (
          <Empty description={t('settings.skillBrowseNoResults', { defaultValue: 'No skills found. Try different keywords.' })} className='py-40px' />
        ) : (
          <div className='text-center text-t-secondary py-32px text-13px'>
            {t('settings.skillBrowseHint', { defaultValue: 'Search 145k+ community skills on SkillsMP, or click a category above to browse.' })}
          </div>
        )}
      </AionScrollArea>
    </div>
  );
};

// ============================================================================
// Import from Folder Section
// ============================================================================
const ImportFolderSection: React.FC<{
  message: MessageInstance;
  onImported: () => void;
}> = ({ message, onImported }) => {
  const { t } = useTranslation();
  const [skillPath, setSkillPath] = useState('');
  const [commonPaths, setCommonPaths] = useState<Array<{ name: string; path: string }>>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const response = await ipcBridge.fs.detectCommonSkillPaths.invoke();
        if (response.success && response.data) {
          setCommonPaths(response.data);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleImport = useCallback(async () => {
    const paths = skillPath
      .trim()
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (paths.length === 0) {
      message.warning(t('settings.pleaseSelectSkillPath', { defaultValue: 'Please select a skill folder path' }));
      return;
    }

    setImporting(true);
    try {
      let totalAdded = 0;
      let totalSkipped = 0;

      for (const p of paths) {
        const scanResult = await ipcBridge.fs.scanForSkills.invoke({ folderPath: p });
        if (!scanResult.success || !scanResult.data || scanResult.data.length === 0) continue;

        for (const skill of scanResult.data) {
          const importResult = await ipcBridge.fs.importSkill.invoke({ skillPath: skill.path });
          if (importResult.success) {
            totalAdded++;
          } else {
            totalSkipped++;
          }
        }
      }

      if (totalAdded > 0) {
        const skippedText = totalSkipped > 0 ? ` (${totalSkipped} skipped)` : '';
        message.success(t('settings.skillsImported', { count: totalAdded, skipped: skippedText, defaultValue: `${totalAdded} skills imported${skippedText}` }));
        setSkillPath('');
        onImported();
      } else if (totalSkipped > 0) {
        message.warning(t('settings.allSkillsExist', { defaultValue: 'All found skills already exist' }));
      } else {
        message.warning(t('settings.noSkillsFound', { defaultValue: 'No valid skills found in the selected path(s)' }));
      }
    } catch (error) {
      console.error('Failed to import skills:', error);
      message.error(t('settings.skillScanFailed', { defaultValue: 'Failed to scan skills' }));
    } finally {
      setImporting(false);
    }
  }, [skillPath, message, t, onImported]);

  return (
    <div className='flex flex-col gap-16px min-h-0'>
      <div className='text-14px text-t-primary'>{t('settings.skillsImportTitle', { defaultValue: 'Import from Folder' })}</div>

      {commonPaths.length > 0 && (
        <div>
          <div className='text-12px text-t-secondary mb-8px'>{t('settings.quickScan', { defaultValue: 'Quick Scan Common Paths' })}</div>
          <div className='flex flex-wrap gap-8px'>
            {commonPaths.map((cp) => (
              <Button
                key={cp.path}
                size='small'
                type='secondary'
                className='rounded-[100px] bg-fill-2 hover:bg-fill-3'
                onClick={() => {
                  if (skillPath.includes(cp.path)) return;
                  setSkillPath(skillPath ? `${skillPath}, ${cp.path}` : cp.path);
                }}
              >
                {cp.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className='space-y-12px'>
        <Typography.Text>{t('settings.skillFolderPath', { defaultValue: 'Skill Folder Path' })}</Typography.Text>
        <div className='flex items-center gap-8px'>
          <Input
            value={skillPath}
            onChange={(value) => setSkillPath(value)}
            placeholder={t('settings.skillPathPlaceholder', { defaultValue: 'Enter or browse skill folder path' })}
            className='flex-1'
          />
          <Button
            type='outline'
            icon={<FolderOpen size={16} />}
            onClick={async () => {
              try {
                const result = await ipcBridge.dialog.showOpen.invoke({
                  properties: ['openDirectory', 'multiSelections'],
                });
                if (result && result.length > 0) {
                  setSkillPath(result.join(', '));
                }
              } catch (error) {
                console.error('Failed to open directory dialog:', error);
              }
            }}
          >
            {t('common.browse', { defaultValue: 'Browse' })}
          </Button>
          <Button type='primary' loading={importing} onClick={() => void handleImport()}>
            {t('settings.skillsImportBtn', { defaultValue: 'Import' })}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// API Key Section
// ============================================================================
const ApiKeySection: React.FC<{ message: MessageInstance }> = ({ message }) => {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState(() => ConfigStorage.get('skillsmp.apiKey') || '');

  const handleSave = useCallback(() => {
    ConfigStorage.set('skillsmp.apiKey', apiKey.trim());
    message.success(t('settings.skillsmpApiKeySaved', { defaultValue: 'SkillsMP API key saved' }));
  }, [apiKey, message, t]);

  return (
    <div className='flex flex-col gap-12px min-h-0'>
      <div className='flex items-center gap-8px'>
        <div className='text-14px text-t-primary'>{t('settings.skillsmpApiKeyTitle', { defaultValue: 'SkillsMP API Key' })}</div>
        <span
          className='text-11px text-primary cursor-pointer hover:underline'
          onClick={() => void ipcBridge.shell.openExternal.invoke('https://skillsmp.com/docs/api')}
        >
          {t('settings.skillsmpGetKey', { defaultValue: 'Get API key' })}
        </span>
      </div>
      <div className='text-12px text-t-secondary'>
        {t('settings.skillsmpApiKeyDesc', { defaultValue: 'Enter your SkillsMP API key to search the skill marketplace. Get one free at skillsmp.com.' })}
      </div>
      <div className='flex items-center gap-8px'>
        <Input.Password
          value={apiKey}
          onChange={setApiKey}
          placeholder='sk_live_...'
          className='flex-1'
        />
        <Button type='primary' onClick={handleSave}>
          {t('common.save', { defaultValue: 'Save' })}
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// Main Skills Page Content
// ============================================================================
const SkillsModalContent: React.FC = () => {
  const { t } = useTranslation();
  const [message, messageContext] = Message.useMessage({ maxCount: 10 });
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const viewMode = useSettingsViewMode();
  const isPageMode = viewMode === 'page';

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      const skillsList = await ipcBridge.fs.listAvailableSkills.invoke();
      setSkills(skillsList);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  const installedSkillNames = skills.map((s) => s.name);

  return (
    <div className='flex flex-col h-full w-full'>
      {messageContext}

      <AionScrollArea className='flex-1 min-h-0 pb-16px' disableOverflow={isPageMode}>
        <div className='space-y-16px'>
          {/* Installed Skills */}
          <div className='px-[12px] md:px-[32px] py-[24px] bg-2 rd-12px md:rd-16px flex flex-col min-h-0 border border-border-2'>
            <InstalledSkillsSection message={message} skills={skills} loading={loading} onRefresh={loadSkills} isPageMode={isPageMode} />
          </div>

          {/* Browse SkillsMP */}
          <div className='px-[12px] md:px-[32px] py-[24px] bg-2 rd-12px md:rd-16px flex flex-col min-h-0 border border-border-2'>
            <SkillsMPBrowseSection message={message} onInstalled={loadSkills} installedSkillNames={installedSkillNames} isPageMode={isPageMode} />
          </div>

          {/* Import from Folder */}
          <div className='px-[12px] md:px-[32px] py-[24px] bg-2 rd-12px md:rd-16px flex flex-col min-h-0 border border-border-2'>
            <ImportFolderSection message={message} onImported={loadSkills} />
          </div>

          {/* SkillsMP API Key */}
          <div className='px-[12px] md:px-[32px] py-[24px] bg-2 rd-12px md:rd-16px flex flex-col min-h-0 border border-border-2'>
            <ApiKeySection message={message} />
          </div>
        </div>
      </AionScrollArea>
    </div>
  );
};

export default SkillsModalContent;
