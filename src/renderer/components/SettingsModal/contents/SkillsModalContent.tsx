/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button, Drawer, Empty, Input, Message, Modal, Spin, Switch, Tag, Typography } from '@arco-design/web-react';
import { Close, Delete, FolderOpen, Search, SettingOne, UploadOne } from '@icon-park/react';
import classNames from 'classnames';
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
// Skill Detail Drawer
// ============================================================================
const SkillDetailDrawer: React.FC<{
  skill: SkillInfo | null;
  visible: boolean;
  onClose: () => void;
  onDelete: () => void;
  isEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
}> = ({ skill, visible, onClose, onDelete, isEnabled, onToggleEnabled }) => {
  const { t } = useTranslation();
  const [drawerWidth, setDrawerWidth] = useState(460);

  useEffect(() => {
    const updateWidth = () => {
      if (typeof window === 'undefined') return;
      setDrawerWidth(Math.min(460, Math.max(320, Math.floor(window.innerWidth - 32))));
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  if (!skill) return null;

  return (
    <Drawer
      title={
        <>
          <span>{t('settings.skillDetailTitle', { defaultValue: 'Skill Details' })}</span>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className='absolute right-4 top-2 cursor-pointer text-t-secondary hover:text-t-primary transition-colors p-1'
            style={{ zIndex: 10, WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <Close size={18} />
          </div>
        </>
      }
      closable={false}
      visible={visible}
      placement='right'
      width={drawerWidth}
      zIndex={1200}
      autoFocus={false}
      onCancel={onClose}
      headerStyle={{ background: 'var(--color-bg-1)' }}
      bodyStyle={{ background: 'var(--color-bg-1)' }}
      footer={
        skill.isCustom ? (
          <div className='flex items-center justify-between w-full'>
            <div />
            <Button status='danger' onClick={onDelete} className='rounded-[100px]' style={{ backgroundColor: 'rgb(var(--danger-1))' }}>
              <Delete size={14} className='mr-4px' />
              {t('common.delete', { defaultValue: 'Delete' })}
            </Button>
          </div>
        ) : null
      }
    >
      <div className='flex flex-col h-full overflow-hidden'>
        <div className='flex flex-col flex-1 gap-20px bg-fill-2 rounded-16px p-20px overflow-y-auto'>
          {/* Name & Type */}
          <div>
            <Typography.Text bold>{t('settings.skillDetailName', { defaultValue: 'Name' })}</Typography.Text>
            <div className='mt-8px flex items-center gap-8px'>
              <span className='text-14px text-t-primary font-medium'>{skill.name}</span>
              <Tag size='small' color={skill.isCustom ? 'orangered' : 'arcoblue'}>
                {skill.isCustom ? t('settings.skillTypeCustom', { defaultValue: 'Custom' }) : t('settings.skillTypeBuiltin', { defaultValue: 'Builtin' })}
              </Tag>
            </div>
          </div>

          {/* Description */}
          {skill.description && (
            <div>
              <Typography.Text bold>{t('settings.skillDetailDescription', { defaultValue: 'Description' })}</Typography.Text>
              <div className='mt-8px text-13px text-t-secondary'>{skill.description}</div>
            </div>
          )}

          {/* Location */}
          {skill.location && (
            <div>
              <Typography.Text bold>{t('settings.skillDetailLocation', { defaultValue: 'Location' })}</Typography.Text>
              <div className='mt-8px text-12px text-t-quaternary break-all font-mono bg-bg-1 p-8px rounded-8px'>{skill.location}</div>
            </div>
          )}

          {/* Enabled Toggle */}
          <div className='flex items-center justify-between'>
            <Typography.Text bold>{t('settings.skillDetailEnabled', { defaultValue: 'Enabled' })}</Typography.Text>
            <Switch checked={isEnabled} onChange={onToggleEnabled} />
          </div>
        </div>
      </div>
    </Drawer>
  );
};

// ============================================================================
// Import Skill Modal
// ============================================================================
const ImportSkillModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
  message: MessageInstance;
}> = ({ visible, onClose, onImported, message }) => {
  const { t } = useTranslation();
  const [skillPath, setSkillPath] = useState('');
  const [commonPaths, setCommonPaths] = useState<Array<{ name: string; path: string }>>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (visible) {
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
    }
  }, [visible]);

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
          if (importResult.success) totalAdded++;
          else totalSkipped++;
        }
      }

      if (totalAdded > 0) {
        const skippedText = totalSkipped > 0 ? ` (${totalSkipped} skipped)` : '';
        message.success(t('settings.skillsImported', { count: totalAdded, skipped: skippedText, defaultValue: `${totalAdded} skills imported${skippedText}` }));
        setSkillPath('');
        onImported();
        onClose();
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
  }, [skillPath, message, t, onImported, onClose]);

  return (
    <Modal
      visible={visible}
      onCancel={() => {
        setSkillPath('');
        onClose();
      }}
      title={t('settings.skillsImportTitle', { defaultValue: 'Import from Folder' })}
      okText={t('settings.skillsImportBtn', { defaultValue: 'Import' })}
      cancelText={t('common.cancel', { defaultValue: 'Cancel' })}
      onOk={() => void handleImport()}
      okButtonProps={{ loading: importing }}
      style={{ width: 500 }}
    >
      <div className='space-y-16px'>
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
          </div>
        </div>
      </div>
    </Modal>
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
        <span className='text-11px text-primary cursor-pointer hover:underline' onClick={() => void ipcBridge.shell.openExternal.invoke('https://skillsmp.com/docs/api')}>
          {t('settings.skillsmpGetKey', { defaultValue: 'Get API key' })}
        </span>
      </div>
      <div className='text-12px text-t-secondary'>
        {t('settings.skillsmpApiKeyDesc', { defaultValue: 'Enter your SkillsMP API key to search the skill marketplace. Get one free at skillsmp.com.' })}
      </div>
      <div className='flex items-center gap-8px'>
        <Input.Password value={apiKey} onChange={setApiKey} placeholder='sk_live_...' className='flex-1' />
        <Button type='primary' onClick={handleSave}>
          {t('common.save', { defaultValue: 'Save' })}
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// Skill List Item
// ============================================================================
const SkillListItem: React.FC<{
  skill: SkillInfo;
  isEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onClickDetail: () => void;
}> = ({ skill, isEnabled, onToggleEnabled, onClickDetail }) => {
  return (
    <div
      className='group bg-fill-0 rounded-lg px-16px py-12px flex items-center justify-between cursor-pointer hover:bg-fill-1 transition-colors'
      onClick={onClickDetail}
    >
      <div className='flex items-center gap-12px min-w-0 flex-1'>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-6px'>
            <span className='font-medium text-t-primary truncate'>{skill.name}</span>
            <Tag size='small' color={skill.isCustom ? 'orangered' : 'arcoblue'} className='text-10px flex-shrink-0'>
              {skill.isCustom ? 'Custom' : 'Builtin'}
            </Tag>
          </div>
          {skill.description && <div className='text-12px text-t-secondary truncate mt-2px'>{skill.description}</div>}
        </div>
      </div>
      <div className='flex items-center gap-12px text-t-secondary flex-shrink-0'>
        <Switch size='small' checked={isEnabled} onChange={(checked) => onToggleEnabled(checked)} onClick={(e) => e.stopPropagation()} />
        <Button
          type='text'
          size='small'
          icon={<SettingOne size={16} />}
          onClick={(e) => {
            e.stopPropagation();
            onClickDetail();
          }}
        />
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
  const [disabledSkills, setDisabledSkills] = useState<string[]>(() => {
    return ConfigStorage.get('skills.disabledSkills') || [];
  });

  // Modal/Drawer states
  const [browseVisible, setBrowseVisible] = useState(false);
  const [importVisible, setImportVisible] = useState(false);
  const [detailSkill, setDetailSkill] = useState<SkillInfo | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [deleteSkillName, setDeleteSkillName] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleToggleEnabled = useCallback(
    (skillName: string, enabled: boolean) => {
      let updated: string[];
      if (enabled) {
        updated = disabledSkills.filter((s) => s !== skillName);
      } else {
        updated = [...disabledSkills, skillName];
      }
      setDisabledSkills(updated);
      ConfigStorage.set('skills.disabledSkills', updated);
    },
    [disabledSkills]
  );

  const handleDelete = useCallback(async () => {
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

  const installedSkillNames = skills.map((s) => s.name);
  const customSkills = skills.filter((s) => s.isCustom);
  const builtinSkills = skills.filter((s) => !s.isCustom);

  return (
    <div className='flex flex-col h-full w-full'>
      {messageContext}

      <AionScrollArea className='flex-1 min-h-0 pb-16px' disableOverflow={isPageMode}>
        <div className='space-y-16px'>
          {/* Skills List Section */}
          <div className='px-[12px] md:px-[32px] py-[24px] bg-2 rd-12px md:rd-16px flex flex-col min-h-0 border border-border-2'>
            {/* Header */}
            <div className='flex items-center justify-between mb-16px'>
              <div className='flex items-center gap-8px'>
                <div className='text-14px text-t-primary font-medium'>{t('settings.skillsInstalledTitle', { defaultValue: 'Installed Skills' })}</div>
                <span className='text-12px text-t-secondary'>{t('settings.skillsInstalledCount', { count: skills.length, defaultValue: `${skills.length} skills` })}</span>
              </div>
              <div className='flex items-center gap-8px'>
                <Button size='small' type='outline' icon={<UploadOne size={14} />} onClick={() => setImportVisible(true)} className='rounded-[100px]'>
                  {t('settings.uploadSkill', { defaultValue: 'Upload' })}
                </Button>
                <Button size='small' type='outline' icon={<Search size={14} />} onClick={() => setBrowseVisible(true)} className='rounded-[100px]'>
                  {t('settings.browseSkillsMP', { defaultValue: 'Browse SkillsMP' })}
                </Button>
              </div>
            </div>

            {/* Skill List */}
            {loading ? (
              <div className='flex items-center justify-center py-40px'>
                <Spin size={24} />
              </div>
            ) : skills.length === 0 ? (
              <div className='py-32px text-center'>
                <Empty description={t('settings.skillsNoneInstalled', { defaultValue: 'No skills installed yet. Browse SkillsMP or import from a local folder.' })} />
                <div className='mt-16px flex items-center justify-center gap-12px'>
                  <Button type='outline' icon={<UploadOne size={14} />} onClick={() => setImportVisible(true)}>
                    {t('settings.uploadSkill', { defaultValue: 'Upload' })}
                  </Button>
                  <Button type='primary' icon={<Search size={14} />} onClick={() => setBrowseVisible(true)}>
                    {t('settings.browseSkillsMP', { defaultValue: 'Browse SkillsMP' })}
                  </Button>
                </div>
              </div>
            ) : (
              <div className='bg-fill-2 rounded-2xl p-20px'>
                <div className='space-y-8px'>
                  {/* Custom Skills */}
                  {customSkills.length > 0 && (
                    <>
                      <div className='text-12px text-t-secondary mb-4px'>
                        {t('settings.customSkills', { defaultValue: 'Custom Skills' })} ({customSkills.length})
                      </div>
                      {customSkills.map((skill) => (
                        <SkillListItem
                          key={skill.name}
                          skill={skill}
                          isEnabled={!disabledSkills.includes(skill.name)}
                          onToggleEnabled={(enabled) => handleToggleEnabled(skill.name, enabled)}
                          onClickDetail={() => {
                            setDetailSkill(skill);
                            setDetailVisible(true);
                          }}
                        />
                      ))}
                    </>
                  )}

                  {/* Builtin Skills */}
                  {builtinSkills.length > 0 && (
                    <>
                      <div className={classNames('text-12px text-t-secondary mb-4px', customSkills.length > 0 && 'mt-12px')}>
                        {t('settings.builtinSkills', { defaultValue: 'Builtin Skills' })} ({builtinSkills.length})
                      </div>
                      {builtinSkills.map((skill) => (
                        <SkillListItem
                          key={skill.name}
                          skill={skill}
                          isEnabled={!disabledSkills.includes(skill.name)}
                          onToggleEnabled={(enabled) => handleToggleEnabled(skill.name, enabled)}
                          onClickDetail={() => {
                            setDetailSkill(skill);
                            setDetailVisible(true);
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* API Key Section */}
          <div className='px-[12px] md:px-[32px] py-[24px] bg-2 rd-12px md:rd-16px flex flex-col min-h-0 border border-border-2'>
            <ApiKeySection message={message} />
          </div>
        </div>
      </AionScrollArea>

      {/* Skill Detail Drawer */}
      <SkillDetailDrawer
        skill={detailSkill}
        visible={detailVisible}
        onClose={() => {
          setDetailVisible(false);
          setDetailSkill(null);
        }}
        onDelete={() => {
          if (detailSkill) {
            setDeleteSkillName(detailSkill.name);
          }
        }}
        isEnabled={detailSkill ? !disabledSkills.includes(detailSkill.name) : true}
        onToggleEnabled={(enabled) => {
          if (detailSkill) handleToggleEnabled(detailSkill.name, enabled);
        }}
      />

      {/* Import Skill Modal */}
      <ImportSkillModal visible={importVisible} onClose={() => setImportVisible(false)} onImported={loadSkills} message={message} />

      {/* Browse SkillsMP Modal */}
      <SkillBrowseModal
        visible={browseVisible}
        onClose={() => setBrowseVisible(false)}
        message={message}
        installedSkillNames={installedSkillNames}
        onInstalled={() => {
          void loadSkills();
        }}
      />

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

export default SkillsModalContent;
