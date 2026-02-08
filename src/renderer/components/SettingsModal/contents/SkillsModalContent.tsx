/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button, Collapse, Drawer, Empty, Input, Message, Modal, Spin, Switch, Tag, Typography } from '@arco-design/web-react';
import { Close, Download, SettingOne, UploadOne } from '@icon-park/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ipcBridge } from '@/common';
import { ConfigStorage } from '@/common/storage';
import AionScrollArea from '@/renderer/components/base/AionScrollArea';
import SkillBrowseModal from '@/renderer/pages/settings/components/SkillBrowseModal';
import { useSettingsViewMode } from '../settingsViewContext';

interface SkillInfo {
  name: string;
  description: string;
  location: string;
  isCustom: boolean;
}

type MessageInstance = ReturnType<typeof Message.useMessage>[0];

// ============================================================================
// Skill Management (follows AssistantManagement pattern)
// ============================================================================
interface SkillManagementProps {
  message: MessageInstance;
}

const SkillManagement: React.FC<SkillManagementProps> = ({ message }) => {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [disabledSkills, setDisabledSkills] = useState<string[]>([]);

  // Modal/Drawer states
  const [browseVisible, setBrowseVisible] = useState(false);
  const [detailSkill, setDetailSkill] = useState<SkillInfo | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [deleteSkillName, setDeleteSkillName] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState(500);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const updateDrawerWidth = () => {
      if (typeof window === 'undefined') return;
      const nextWidth = Math.min(500, Math.max(320, Math.floor(window.innerWidth - 32)));
      setDrawerWidth(nextWidth);
    };
    updateDrawerWidth();
    window.addEventListener('resize', updateDrawerWidth);
    return () => window.removeEventListener('resize', updateDrawerWidth);
  }, []);

  // Load disabled skills from storage
  useEffect(() => {
    void (async () => {
      const savedDisabledSkills = await ConfigStorage.get('skills.disabledSkills');
      if (savedDisabledSkills) setDisabledSkills(savedDisabledSkills);
    })();
  }, []);

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

  const handleToggleEnabled = useCallback(
    (skillName: string, enabled: boolean) => {
      let updated: string[];
      if (enabled) {
        updated = disabledSkills.filter((s) => s !== skillName);
      } else {
        updated = [...disabledSkills, skillName];
      }
      setDisabledSkills(updated);
      void ConfigStorage.set('skills.disabledSkills', updated);
    },
    [disabledSkills]
  );

  const handleDeleteSkill = useCallback(async () => {
    if (!deleteSkillName) return;
    setDeleting(true);
    try {
      const response = await ipcBridge.fs.deleteCustomSkill.invoke({ skillName: deleteSkillName });
      if (response.success) {
        message.success(t('settings.skillDeleteSuccess', { name: deleteSkillName, defaultValue: `Skill "${deleteSkillName}" deleted` }));
        setDetailVisible(false);
        setDetailSkill(null);
        void loadSkills();
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
  }, [deleteSkillName, message, t, loadSkills]);

  const handleUpload = useCallback(async () => {
    try {
      const result = await ipcBridge.dialog.showOpen.invoke({
        properties: ['openFile'],
        filters: [{ name: 'Zip Files', extensions: ['zip'] }],
      });

      if (!result || result.length === 0) return;

      const zipPath = result[0];
      setUploading(true);

      const response = await ipcBridge.fs.importSkillZip.invoke({ zipPath });
      if (response.success && response.data) {
        const { skillNames, skipped } = response.data;
        const skippedText = skipped > 0 ? ` (${skipped} skipped)` : '';
        message.success(
          t('settings.skillZipImportSuccess', {
            count: skillNames.length,
            skipped: skippedText,
            defaultValue: `${skillNames.length} skill(s) imported${skippedText}`,
          })
        );
        void loadSkills();
      } else {
        message.error(response.msg || t('settings.skillZipImportFailed', { defaultValue: 'Failed to import skills from zip' }));
      }
    } catch (error) {
      console.error('Failed to upload skill zip:', error);
      message.error(t('settings.skillZipImportFailed', { defaultValue: 'Failed to import skills from zip' }));
    } finally {
      setUploading(false);
    }
  }, [message, t, loadSkills]);

  const handleViewDetail = useCallback((skill: SkillInfo) => {
    setDetailSkill(skill);
    setDetailVisible(true);
  }, []);

  const installedSkillNames = skills.map((s) => s.name);

  return (
    <div>
      {/* ================================================================ */}
      {/* Installed Skills Collapse.Item */}
      {/* ================================================================ */}
      <Collapse.Item
        header={
          <div className='flex items-center justify-between w-full'>
            <span>{t('settings.skills', { defaultValue: 'Skills' })}</span>
          </div>
        }
        name='installed-skills'
        extra={
          <div className='flex items-center gap-6px'>
            <Button
              type='text'
              size='small'
              style={{ color: 'var(--text-primary)' }}
              icon={<UploadOne size={14} fill='currentColor' />}
              loading={uploading}
              onClick={(e) => {
                e.stopPropagation();
                void handleUpload();
              }}
            >
              {t('settings.uploadSkill', { defaultValue: 'Upload' })}
            </Button>
            <Button
              type='text'
              size='small'
              style={{ color: 'var(--text-primary)' }}
              icon={<Download size={14} fill='currentColor' />}
              onClick={(e) => {
                e.stopPropagation();
                setBrowseVisible(true);
              }}
            >
              {t('settings.installFromSkillsSh', { defaultValue: 'Install from skills.sh' })}
            </Button>
          </div>
        }
      >
        <div className='py-2'>
          <div className='bg-fill-2 rounded-2xl p-20px'>
            <div className='text-14px text-t-secondary mb-12px'>{t('settings.skillsAvailable', { defaultValue: 'Available skills' })}</div>
            {loading ? (
              <div className='flex items-center justify-center py-40px'>
                <Spin size={24} />
              </div>
            ) : skills.length > 0 ? (
              <div className='space-y-12px'>
                {skills.map((skill) => {
                  const isEnabled = !disabledSkills.includes(skill.name);
                  return (
                    <div key={skill.name} className='group bg-fill-0 rounded-lg px-16px py-12px flex items-center justify-between cursor-pointer hover:bg-fill-1 transition-colors' onClick={() => handleViewDetail(skill)}>
                      <div className='flex items-center gap-12px min-w-0'>
                        <div className='min-w-0'>
                          <div className='flex items-center gap-6px'>
                            <div className='font-medium text-t-primary truncate'>{skill.name}</div>
                            <Tag size='small' color={skill.isCustom ? 'orangered' : 'arcoblue'} className='text-10px flex-shrink-0'>
                              {skill.isCustom ? t('settings.skillTypeCustom', { defaultValue: 'Custom' }) : t('settings.skillTypeBuiltin', { defaultValue: 'Builtin' })}
                            </Tag>
                          </div>
                          {skill.description && <div className='text-12px text-t-secondary truncate'>{skill.description}</div>}
                        </div>
                      </div>
                      <div className='flex items-center gap-12px text-t-secondary'>
                        {skill.isCustom && (
                          <span
                            className='invisible group-hover:visible text-12px text-red-500 cursor-pointer hover:underline transition-all'
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteSkillName(skill.name);
                            }}
                          >
                            {t('common.delete', { defaultValue: 'Delete' })}
                          </span>
                        )}
                        <Switch
                          size='small'
                          checked={isEnabled}
                          onChange={(checked) => {
                            handleToggleEnabled(skill.name, checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          type='text'
                          size='small'
                          icon={<SettingOne size={16} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(skill);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className='text-center py-20px'>
                <Empty description={t('settings.skillsNoneInstalled', { defaultValue: 'No skills installed yet. Browse SkillsMP or upload a skill zip file.' })} />
                <div className='mt-16px flex items-center justify-center gap-12px'>
                  <Button type='outline' size='small' icon={<UploadOne size={14} />} loading={uploading} onClick={() => void handleUpload()}>
                    {t('settings.uploadSkill', { defaultValue: 'Upload' })}
                  </Button>
                  <Button type='primary' size='small' icon={<Download size={14} />} onClick={() => setBrowseVisible(true)}>
                    {t('settings.installFromSkillsSh', { defaultValue: 'Install from skills.sh' })}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Collapse.Item>

      {/* ================================================================ */}
      {/* SkillsMP API Key Collapse.Item */}
      {/* ================================================================ */}
      <SkillsmpApiKeySection message={message} />

      {/* ================================================================ */}
      {/* Skill Detail Drawer */}
      {/* ================================================================ */}
      <Drawer
        title={
          <>
            <span>{t('settings.skillDetailTitle', { defaultValue: 'Skill Details' })}</span>
            <div
              onClick={(e) => {
                e.stopPropagation();
                setDetailVisible(false);
              }}
              className='absolute right-4 top-2 cursor-pointer text-t-secondary hover:text-t-primary transition-colors p-1'
              style={{ zIndex: 10, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            >
              <Close size={18} />
            </div>
          </>
        }
        closable={false}
        visible={detailVisible}
        placement='right'
        width={drawerWidth}
        zIndex={1200}
        autoFocus={false}
        onCancel={() => {
          setDetailVisible(false);
          setDetailSkill(null);
        }}
        headerStyle={{ background: 'var(--color-bg-1)' }}
        bodyStyle={{ background: 'var(--color-bg-1)' }}
        footer={
          detailSkill?.isCustom ? (
            <div className='flex items-center justify-between w-full'>
              <div />
              <Button
                status='danger'
                onClick={() => {
                  if (detailSkill) setDeleteSkillName(detailSkill.name);
                }}
                className='rounded-[100px]'
                style={{ backgroundColor: 'rgb(var(--danger-1))' }}
              >
                {t('common.delete', { defaultValue: 'Delete' })}
              </Button>
            </div>
          ) : null
        }
      >
        {detailSkill && (
          <div className='flex flex-col h-full overflow-hidden'>
            <div className='flex flex-col flex-1 gap-16px bg-fill-2 rounded-16px p-20px overflow-y-auto'>
              {/* Name & Type */}
              <div className='flex-shrink-0'>
                <Typography.Text bold>{t('settings.skillDetailName', { defaultValue: 'Name' })}</Typography.Text>
                <div className='mt-10px flex items-center gap-8px'>
                  <span className='text-14px text-t-primary font-medium'>{detailSkill.name}</span>
                  <Tag size='small' color={detailSkill.isCustom ? 'orangered' : 'arcoblue'}>
                    {detailSkill.isCustom ? t('settings.skillTypeCustom', { defaultValue: 'Custom' }) : t('settings.skillTypeBuiltin', { defaultValue: 'Builtin' })}
                  </Tag>
                </div>
              </div>

              {/* Description */}
              {detailSkill.description && (
                <div className='flex-shrink-0'>
                  <Typography.Text bold>{t('settings.skillDetailDescription', { defaultValue: 'Description' })}</Typography.Text>
                  <div className='mt-10px text-13px text-t-secondary whitespace-pre-wrap'>{detailSkill.description}</div>
                </div>
              )}

              {/* Location */}
              {detailSkill.location && (
                <div className='flex-shrink-0'>
                  <Typography.Text bold>{t('settings.skillDetailLocation', { defaultValue: 'Location' })}</Typography.Text>
                  <div className='mt-10px text-12px text-t-quaternary break-all font-mono bg-bg-1 p-8px rounded-8px'>{detailSkill.location}</div>
                </div>
              )}

              {/* Enabled Toggle */}
              <div className='flex-shrink-0 flex items-center justify-between'>
                <Typography.Text bold>{t('settings.skillDetailEnabled', { defaultValue: 'Enabled' })}</Typography.Text>
                <Switch checked={!disabledSkills.includes(detailSkill.name)} onChange={(enabled) => handleToggleEnabled(detailSkill.name, enabled)} />
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* ================================================================ */}
      {/* Browse / Install Modal (unified skills.sh + SkillsMP) */}
      {/* ================================================================ */}
      <SkillBrowseModal
        visible={browseVisible}
        onClose={() => setBrowseVisible(false)}
        message={message}
        installedSkillNames={installedSkillNames}
        onInstalled={() => {
          void loadSkills();
        }}
      />

      {/* ================================================================ */}
      {/* Delete Confirmation Modal */}
      {/* ================================================================ */}
      <Modal title={t('settings.skillDeleteTitle', { defaultValue: 'Delete Skill' })} visible={deleteSkillName !== null} onCancel={() => setDeleteSkillName(null)} onOk={handleDeleteSkill} okButtonProps={{ status: 'danger', loading: deleting }} okText={t('common.delete', { defaultValue: 'Delete' })} cancelText={t('common.cancel', { defaultValue: 'Cancel' })} className='w-[90vw] md:w-[400px]' wrapStyle={{ zIndex: 10000 }} maskStyle={{ zIndex: 9999 }}>
        <p>
          {t('settings.skillDeleteConfirm', {
            name: deleteSkillName,
            defaultValue: `Are you sure you want to delete "${deleteSkillName}"? This will remove the skill files from disk.`,
          })}
        </p>
        {deleteSkillName && (
          <div className='mt-12px p-12px bg-fill-2 rounded-lg flex items-center gap-12px'>
            <div>
              <div className='font-medium'>{deleteSkillName}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

// ============================================================================
// SkillsMP API Key Section (extracted for clarity)
// ============================================================================
interface SkillsmpApiKeySectionProps {
  message: MessageInstance;
}

const SkillsmpApiKeySection: React.FC<SkillsmpApiKeySectionProps> = ({ message }) => {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    void (async () => {
      const savedApiKey = await ConfigStorage.get('skillsmp.apiKey');
      if (savedApiKey) setApiKey(savedApiKey);
    })();
  }, []);

  const handleSaveApiKey = useCallback(() => {
    void ConfigStorage.set('skillsmp.apiKey', apiKey.trim());
    message.success(t('settings.skillsmpApiKeySaved', { defaultValue: 'SkillsMP API key saved' }));
  }, [apiKey, message, t]);

  return (
    <Collapse.Item
      header={
        <div className='flex items-center justify-between w-full'>
          <span>{t('settings.skillsmpApiKeyTitle', { defaultValue: 'SkillsMP API Key' })}</span>
        </div>
      }
      name='skillsmp-api-key'
    >
      <div className='py-2'>
        <div className='bg-fill-2 rounded-2xl p-20px'>
          <div className='flex items-center gap-8px mb-8px'>
            <div className='text-12px text-t-secondary'>{t('settings.skillsmpApiKeyDesc', { defaultValue: 'Enter your SkillsMP API key to search the skill marketplace. Get one free at skillsmp.com.' })}</div>
            <span className='text-11px text-primary cursor-pointer hover:underline flex-shrink-0' onClick={() => void ipcBridge.shell.openExternal.invoke('https://skillsmp.com/docs/api')}>
              {t('settings.skillsmpGetKey', { defaultValue: 'Get API key' })}
            </span>
          </div>
          <div className='flex items-center gap-8px'>
            <Input.Password value={apiKey} onChange={setApiKey} placeholder='sk_live_...' className='flex-1' />
            <Button type='primary' onClick={handleSaveApiKey}>
              {t('common.save', { defaultValue: 'Save' })}
            </Button>
          </div>
        </div>
      </div>
    </Collapse.Item>
  );
};

// ============================================================================
// Main Skills Page Content (follows AgentModalContent pattern)
// ============================================================================
const SkillsModalContent: React.FC = () => {
  const [message, messageContext] = Message.useMessage({ maxCount: 10 });
  const viewMode = useSettingsViewMode();
  const isPageMode = viewMode === 'page';

  return (
    <div className='flex flex-col h-full w-full'>
      {messageContext}

      <AionScrollArea className='flex-1 min-h-0 pb-16px scrollbar-hide' disableOverflow={isPageMode}>
        <Collapse defaultActiveKey={['installed-skills']}>
          <SkillManagement message={message} />
        </Collapse>
      </AionScrollArea>
    </div>
  );
};

export default SkillsModalContent;
