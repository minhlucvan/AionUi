/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Avatar, Button, Empty, Input, Message, Modal, Spin, Tag, Typography } from '@arco-design/web-react';
import { Download, Star, Search } from '@icon-park/react';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';

interface GitHubRepo {
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  clone_url: string;
  stargazers_count: number;
  updated_at: string;
  owner: { login: string; avatar_url: string };
  topics: string[];
}

interface SkillBrowseModalProps {
  visible: boolean;
  onClose: () => void;
  onInstalled: (skillName: string) => void;
  message: ReturnType<typeof Message.useMessage>[0];
}

const SkillBrowseModal: React.FC<SkillBrowseModalProps> = ({ visible, onClose, onInstalled, message }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<GitHubRepo[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(1);

  const handleSearch = useCallback(
    async (pageNum = 1) => {
      const query = searchQuery.trim();
      if (!query) return;

      setLoading(true);
      setHasSearched(true);
      try {
        const response = await ipcBridge.fs.searchGitHubSkills.invoke({
          query,
          page: pageNum,
          perPage: 20,
        });
        if (response.success && response.data) {
          if (pageNum === 1) {
            setResults(response.data.items);
          } else {
            setResults((prev) => [...prev, ...response.data!.items]);
          }
          setTotalCount(response.data.total_count);
          setPage(pageNum);
        } else {
          message.error(response.msg || t('settings.skillBrowseSearchFailed', { defaultValue: 'Search failed' }));
        }
      } catch (error) {
        console.error('GitHub search failed:', error);
        message.error(t('settings.skillBrowseSearchFailed', { defaultValue: 'Search failed' }));
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, message, t]
  );

  const handleInstall = useCallback(
    async (repo: GitHubRepo) => {
      setInstalling(repo.full_name);
      try {
        const response = await ipcBridge.fs.installSkillFromGitHub.invoke({
          cloneUrl: repo.clone_url,
          repoName: repo.name,
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
      } catch (error) {
        console.error('Skill install failed:', error);
        message.error(t('settings.skillBrowseInstallFailed', { defaultValue: 'Installation failed' }));
      } finally {
        setInstalling(null);
      }
    },
    [message, t, onInstalled]
  );

  const formatStars = (count: number) => {
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return String(count);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('mcp.justNow', { defaultValue: 'Just now' });
    if (diffDays < 30) return `${diffDays}d ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  return (
    <Modal
      visible={visible}
      onCancel={onClose}
      title={t('settings.skillBrowseTitle', { defaultValue: 'Browse Skills on GitHub' })}
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
              defaultValue: 'Search skills (e.g. "pdf", "excel", "claude code skill")',
            })}
            onPressEnter={() => void handleSearch(1)}
            prefix={<Search size={16} />}
            className='flex-1'
            allowClear
          />
          <Button type='primary' loading={loading} onClick={() => void handleSearch(1)}>
            {t('common.search', { defaultValue: 'Search' })}
          </Button>
        </div>

        {/* Suggested topics */}
        <div className='flex flex-wrap gap-6px'>
          {['claude-code-skill', 'gemini-skill', 'ai-skill', 'aionui-skill'].map((topic) => (
            <Tag
              key={topic}
              className='cursor-pointer'
              color='arcoblue'
              onClick={() => {
                setSearchQuery(topic);
                void (async () => {
                  setLoading(true);
                  setHasSearched(true);
                  try {
                    const response = await ipcBridge.fs.searchGitHubSkills.invoke({ query: topic, page: 1, perPage: 20 });
                    if (response.success && response.data) {
                      setResults(response.data.items);
                      setTotalCount(response.data.total_count);
                      setPage(1);
                    }
                  } catch {
                    // ignore
                  } finally {
                    setLoading(false);
                  }
                })();
              }}
            >
              {topic}
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
                {t('settings.skillBrowseResultCount', {
                  count: totalCount,
                  defaultValue: `${totalCount} repositories found`,
                })}
              </div>
              {results.map((repo) => (
                <div key={repo.full_name} className='border border-border-2 rounded-8px p-12px hover:bg-fill-1 transition-colors'>
                  <div className='flex items-start gap-10px'>
                    <Avatar size={32} shape='circle' className='flex-shrink-0'>
                      <img src={repo.owner.avatar_url} alt={repo.owner.login} />
                    </Avatar>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-6px flex-wrap'>
                        <Typography.Text bold className='text-14px text-primary cursor-pointer hover:underline' onClick={() => void ipcBridge.shell.openExternal.invoke(repo.html_url)}>
                          {repo.full_name}
                        </Typography.Text>
                        <span className='flex items-center gap-2px text-12px text-t-secondary'>
                          <Star size={12} fill='var(--color-text-3)' />
                          {formatStars(repo.stargazers_count)}
                        </span>
                        <span className='text-12px text-t-secondary'>{formatDate(repo.updated_at)}</span>
                      </div>
                      {repo.description && <div className='text-12px text-t-secondary mt-4px line-clamp-2'>{repo.description}</div>}
                      {repo.topics.length > 0 && (
                        <div className='flex flex-wrap gap-4px mt-6px'>
                          {repo.topics.slice(0, 5).map((topic) => (
                            <Tag key={topic} size='small' color='gray' className='text-11px'>
                              {topic}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      type='outline'
                      size='small'
                      className='flex-shrink-0'
                      loading={installing === repo.full_name}
                      icon={<Download size={14} />}
                      onClick={() => void handleInstall(repo)}
                    >
                      {t('settings.skillBrowseInstall', { defaultValue: 'Install' })}
                    </Button>
                  </div>
                </div>
              ))}
              {results.length < totalCount && (
                <div className='flex justify-center pt-8px'>
                  <Button type='text' loading={loading} onClick={() => void handleSearch(page + 1)}>
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
                defaultValue: 'Search GitHub for community skills, or click a topic tag above to browse.',
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SkillBrowseModal;
