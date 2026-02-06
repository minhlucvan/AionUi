/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button, Empty, Input, Message, Modal, Spin, Tag, Typography } from '@arco-design/web-react';
import { Download, Star, Search } from '@icon-park/react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';
import { ConfigStorage } from '@/common/storage';

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

interface SkillBrowseModalProps {
  visible: boolean;
  onClose: () => void;
  onInstalled: (skillName: string) => void;
  message: ReturnType<typeof Message.useMessage>[0];
}

const SEARCH_PRESETS = [
  { label: 'Popular', query: 'SKILL.md', sortBy: 'stars' as const },
  { label: 'Recent', query: 'SKILL.md', sortBy: 'recent' as const },
  { label: 'Claude', query: 'claude skills' },
  { label: 'Gemini', query: 'gemini skills' },
  { label: 'Coding', query: 'coding development' },
];

const SkillBrowseModal: React.FC<SkillBrowseModalProps> = ({ visible, onClose, onInstalled, message }) => {
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
    async (query: string, pageNum = 1, sortBy?: 'stars' | 'recent') => {
      const q = query.trim();
      if (!q) return;

      setLoading(true);
      setHasSearched(true);
      try {
        const apiKey = ConfigStorage.get('skillsmp.apiKey') || '';
        const response = await ipcBridge.fs.searchSkillsMPSkills.invoke({
          query: q,
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
    [message, t]
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
          onInstalled(response.data.skillName);
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
    <Modal
      visible={visible}
      onCancel={onClose}
      title={t('settings.skillBrowseTitle', { defaultValue: 'Browse Skills on SkillsMP' })}
      footer={null}
      style={{ width: 640 }}
      wrapStyle={{ zIndex: 10001 }}
      maskStyle={{ zIndex: 10000 }}
      unmountOnExit
    >
      <div className='space-y-16px'>
        {/* Search bar */}
        <div className='flex gap-8px'>
          <Input
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('settings.skillBrowseSearchPlaceholder', {
              defaultValue: 'Search 145k+ agent skills...',
            })}
            onPressEnter={() => void handleSearch(searchQuery, 1)}
            prefix={<Search size={16} />}
            className='flex-1'
            allowClear
          />
          <Button type='primary' loading={loading} onClick={() => void handleSearch(searchQuery, 1)}>
            {t('common.search', { defaultValue: 'Search' })}
          </Button>
        </div>

        {/* Category presets */}
        <div className='flex flex-wrap gap-6px'>
          {SEARCH_PRESETS.map((preset) => (
            <Tag
              key={`${preset.query}-${preset.sortBy || ''}`}
              className='cursor-pointer'
              color='arcoblue'
              onClick={() => {
                setSearchQuery(preset.query);
                void handleSearch(preset.query, 1, preset.sortBy);
              }}
            >
              {preset.label}
            </Tag>
          ))}
        </div>

        {/* Results */}
        <div className='max-h-[400px] overflow-y-auto space-y-8px'>
          {loading && results.length === 0 ? (
            <div className='flex items-center justify-center py-40px'>
              <Spin size={24} />
            </div>
          ) : results.length > 0 ? (
            <>
              <div className='text-12px text-t-secondary mb-4px'>
                {t('settings.skillBrowseResultCount', { count: totalCount, defaultValue: `${totalCount} results found` })}
              </div>
              {results.map((skill) => (
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
                          {skill.tags.slice(0, 5).map((tag) => (
                            <Tag key={tag} size='small' color='green' className='text-11px'>
                              {tag}
                            </Tag>
                          ))}
                          {skill.tags.length > 5 && (
                            <Tag size='small' color='gray' className='text-11px'>
                              +{skill.tags.length - 5}
                            </Tag>
                          )}
                        </div>
                      )}
                    </div>
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
                  </div>
                </div>
              ))}
              {hasNext && (
                <div className='flex justify-center pt-8px'>
                  <Button type='text' loading={loading} onClick={() => void handleSearch(searchQuery, page + 1)}>
                    {t('settings.skillBrowseLoadMore', { defaultValue: 'Load more' })}
                  </Button>
                </div>
              )}
            </>
          ) : hasSearched ? (
            <Empty description={t('settings.skillBrowseNoResults', { defaultValue: 'No skills found. Try different keywords.' })} className='py-40px' />
          ) : (
            <div className='text-center text-t-secondary py-32px text-13px'>
              {t('settings.skillBrowseHint', {
                defaultValue: 'Search 145k+ community skills on SkillsMP, or click a category above to browse.',
              })}
            </div>
          )}
        </div>

        {/* SkillsMP attribution */}
        <div className='text-center text-11px text-t-quaternary'>
          {t('settings.skillBrowsePoweredBy', { defaultValue: 'Powered by' })}{' '}
          <span className='cursor-pointer hover:underline text-primary' onClick={() => void ipcBridge.shell.openExternal.invoke('https://skillsmp.com')}>
            skillsmp.com
          </span>
        </div>
      </div>
    </Modal>
  );
};

export default SkillBrowseModal;
