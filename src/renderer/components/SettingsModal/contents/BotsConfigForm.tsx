/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { IChannelPairingRequest, IChannelPluginStatus, IChannelUser, IMezonBotConfig } from '@/channels/types';
import { channel, shell } from '@/common/ipcBridge';
import type { IProvider, TProviderWithModel } from '@/common/storage';
import { ConfigStorage } from '@/common/storage';
import { uuid } from '@/common/utils';
import { hasSpecificModelCapability } from '@/renderer/utils/modelCapabilities';
import { Button, Dropdown, Input, Menu, Message, Modal, Select, Spin, Switch, Tooltip } from '@arco-design/web-react';
import { CheckOne, CloseOne, Copy, Delete, Down, Plus, Refresh, Robot, SettingOne } from '@icon-park/react';
import type { AcpBackendConfig } from '@/types/acpTypes';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Get available primary models for a provider (supports function calling)
 */
const getAvailableModels = (provider: IProvider): string[] => {
  const result: string[] = [];
  for (const modelName of provider.model || []) {
    const functionCalling = hasSpecificModelCapability(provider, modelName, 'function_calling');
    const excluded = hasSpecificModelCapability(provider, modelName, 'excludeFromPrimary');

    if ((functionCalling === true || functionCalling === undefined) && excluded !== true) {
      result.push(modelName);
    }
  }
  return result;
};

/**
 * Preference row component
 */
const PreferenceRow: React.FC<{
  label: string;
  description?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, description, required, children }) => (
  <div className='flex items-center justify-between gap-24px py-12px'>
    <div className='flex-1'>
      <div className='flex items-center gap-8px'>
        <span className='text-14px text-t-primary'>
          {label}
          {required && <span className='text-red-500 ml-2px'>*</span>}
        </span>
      </div>
      {description && <div className='text-12px text-t-tertiary mt-2px'>{description}</div>}
    </div>
    <div className='flex items-center'>{children}</div>
  </div>
);

interface BotsConfigFormProps {
  pluginStatus: IChannelPluginStatus | null;
  modelList: IProvider[];
  selectedModel: TProviderWithModel | null;
  onStatusChange: (status: IChannelPluginStatus | null) => void;
  onModelChange: (model: TProviderWithModel | null) => void;
}

const BotsConfigForm: React.FC<BotsConfigFormProps> = ({ modelList, onStatusChange }) => {
  const { t } = useTranslation();

  // Bot list state
  const [bots, setBots] = useState<IMezonBotConfig[]>([]);
  const [assistants, setAssistants] = useState<AcpBackendConfig[]>([]);
  const [pluginStatuses, setPluginStatuses] = useState<IChannelPluginStatus[]>([]);

  // Edit modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editingBot, setEditingBot] = useState<IMezonBotConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Edit form fields
  const [editName, setEditName] = useState('');
  const [editToken, setEditToken] = useState('');
  const [editBotId, setEditBotId] = useState('');
  const [editAssistantId, setEditAssistantId] = useState<string | undefined>(undefined);
  const [editModel, setEditModel] = useState<{ id: string; useModel: string } | undefined>(undefined);

  // Other state
  const [testLoading, setTestLoading] = useState(false);
  const [credentialsTested, setCredentialsTested] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [botToDelete, setBotToDelete] = useState<IMezonBotConfig | null>(null);
  const [setupGuideExpanded, setSetupGuideExpanded] = useState(false);

  // Pairing state (shown per-bot)
  const [activeBotId, setActiveBotId] = useState<string | null>(null);
  const [pairingLoading, setPairingLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [pendingPairings, setPendingPairings] = useState<IChannelPairingRequest[]>([]);
  const [authorizedUsers, setAuthorizedUsers] = useState<IChannelUser[]>([]);

  // Load bots from ConfigStorage
  const loadBots = useCallback(async () => {
    try {
      const savedBots = await ConfigStorage.get('mezon.bots');
      setBots(savedBots || []);
    } catch (error) {
      console.error('[BotsConfig] Failed to load bots:', error);
    }
  }, []);

  // Load assistants from ConfigStorage
  const loadAssistants = useCallback(async () => {
    try {
      const agents = (await ConfigStorage.get('acp.customAgents')) || [];
      setAssistants(agents.filter((a) => a.isPreset && a.enabled !== false));
    } catch (error) {
      console.error('[BotsConfig] Failed to load assistants:', error);
    }
  }, []);

  // Load plugin statuses
  const loadPluginStatuses = useCallback(async () => {
    try {
      const result = await channel.getPluginStatus.invoke();
      if (result.success && result.data) {
        setPluginStatuses(result.data.filter((p) => p.type === 'mezon'));
      }
    } catch (error) {
      console.error('[BotsConfig] Failed to load plugin statuses:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void loadBots();
    void loadAssistants();
    void loadPluginStatuses();
  }, [loadBots, loadAssistants, loadPluginStatuses]);

  // Listen for plugin status changes
  useEffect(() => {
    const unsubscribe = channel.pluginStatusChanged.on(({ status }) => {
      if (status.type === 'mezon') {
        setPluginStatuses((prev) => {
          const idx = prev.findIndex((p) => p.id === status.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = status;
            return updated;
          }
          return [...prev, status];
        });
        onStatusChange(status);
      }
    });
    return () => unsubscribe();
  }, [onStatusChange]);

  // Load pending pairings
  const loadPendingPairings = useCallback(async () => {
    setPairingLoading(true);
    try {
      const result = await channel.getPendingPairings.invoke();
      if (result.success && result.data) {
        setPendingPairings(result.data.filter((p) => p.platformType === 'mezon'));
      }
    } catch (error) {
      console.error('[BotsConfig] Failed to load pending pairings:', error);
    } finally {
      setPairingLoading(false);
    }
  }, []);

  // Load authorized users
  const loadAuthorizedUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const result = await channel.getAuthorizedUsers.invoke();
      if (result.success && result.data) {
        setAuthorizedUsers(result.data.filter((u) => u.platformType === 'mezon'));
      }
    } catch (error) {
      console.error('[BotsConfig] Failed to load authorized users:', error);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // Listen for pairing requests
  useEffect(() => {
    const unsubscribe = channel.pairingRequested.on((request) => {
      if (request.platformType !== 'mezon') return;
      setPendingPairings((prev) => {
        const exists = prev.some((p) => p.code === request.code);
        if (exists) return prev;
        return [request, ...prev];
      });
    });
    return () => unsubscribe();
  }, []);

  // Listen for user authorization
  useEffect(() => {
    const unsubscribe = channel.userAuthorized.on((user) => {
      if (user.platformType !== 'mezon') return;
      setAuthorizedUsers((prev) => {
        const exists = prev.some((u) => u.id === user.id);
        if (exists) return prev;
        return [user, ...prev];
      });
      setPendingPairings((prev) => prev.filter((p) => p.platformUserId !== user.platformUserId));
    });
    return () => unsubscribe();
  }, []);

  // Get plugin status for a bot
  const getBotStatus = useCallback(
    (bot: IMezonBotConfig): IChannelPluginStatus | undefined => {
      const pluginId = `mezon_${bot.id}`;
      return pluginStatuses.find((p) => p.id === pluginId);
    },
    [pluginStatuses]
  );

  // Get assistant name for display
  const getAssistantName = useCallback(
    (assistantId?: string): string => {
      if (!assistantId) return t('settings.bots.noAssistant', 'Not assigned');
      const assistant = assistants.find((a) => a.id === assistantId);
      return assistant?.name || assistantId;
    },
    [assistants, t]
  );

  // Selected model display
  const getModelDisplay = useCallback(
    (model?: { id: string; useModel: string }): string => {
      if (!model?.useModel) return t('settings.assistant.selectModel', 'Select Model');
      return model.useModel;
    },
    [t]
  );

  // Handle add new bot
  const handleAddBot = () => {
    setIsCreating(true);
    setEditingBot(null);
    setEditName('');
    setEditToken('');
    setEditBotId('');
    setEditAssistantId(undefined);
    setEditModel(undefined);
    setCredentialsTested(false);
    setEditVisible(true);
  };

  // Handle edit bot
  const handleEditBot = (bot: IMezonBotConfig) => {
    setIsCreating(false);
    setEditingBot(bot);
    setEditName(bot.name);
    setEditToken('');
    setEditBotId('');
    setEditAssistantId(bot.assistantId);
    setEditModel(bot.defaultModel);
    setCredentialsTested(false);
    setEditVisible(true);
  };

  // Test connection
  const handleTestConnection = async () => {
    if (!editToken.trim() || !editBotId.trim()) {
      Message.warning(t('settings.bots.credentialsRequired', 'Please enter Bot Token and Bot ID'));
      return;
    }

    setTestLoading(true);
    setCredentialsTested(false);
    try {
      const pluginId = isCreating ? 'mezon_test' : `mezon_${editingBot?.id}`;
      const result = await channel.testPlugin.invoke({
        pluginId,
        token: editToken.trim(),
        extraConfig: { appId: editBotId.trim() },
      });

      if (result.success && result.data?.success) {
        setCredentialsTested(true);
        Message.success(t('settings.bots.connectionSuccess', 'Bot connected successfully!'));
      } else {
        Message.error(result.data?.error || t('settings.bots.connectionFailed', 'Connection failed'));
      }
    } catch (error: any) {
      Message.error(error.message || t('settings.bots.connectionFailed', 'Connection failed'));
    } finally {
      setTestLoading(false);
    }
  };

  // Save bot (create or update)
  const handleSave = async () => {
    if (!editName.trim()) {
      Message.warning(t('settings.bots.nameRequired', 'Please enter a bot name'));
      return;
    }

    if (isCreating && (!editToken.trim() || !editBotId.trim())) {
      Message.warning(t('settings.bots.credentialsRequired', 'Please enter Bot Token and Bot ID'));
      return;
    }

    try {
      const currentBots = (await ConfigStorage.get('mezon.bots')) || [];
      let botConfig: IMezonBotConfig;

      if (isCreating) {
        botConfig = {
          id: uuid(),
          name: editName.trim(),
          assistantId: editAssistantId,
          enabled: true,
          defaultModel: editModel,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        currentBots.push(botConfig);
      } else if (editingBot) {
        botConfig = {
          ...editingBot,
          name: editName.trim(),
          assistantId: editAssistantId,
          defaultModel: editModel,
          updatedAt: Date.now(),
        };
        const idx = currentBots.findIndex((b) => b.id === editingBot.id);
        if (idx >= 0) {
          currentBots[idx] = botConfig;
        }
      } else {
        return;
      }

      await ConfigStorage.set('mezon.bots', currentBots);
      setBots(currentBots);

      // Enable plugin with credentials if provided
      const pluginId = `mezon_${botConfig.id}`;
      if (editToken.trim() && editBotId.trim()) {
        const result = await channel.enablePlugin.invoke({
          pluginId,
          config: { token: editToken.trim(), botId: editBotId.trim() },
        });

        if (result.success) {
          Message.success(t('settings.bots.botSaved', 'Bot saved and connected'));
        } else {
          Message.warning(t('settings.bots.botSavedNoConnect', 'Bot saved but failed to connect: ') + (result.msg || ''));
        }
        await loadPluginStatuses();
      } else if (!isCreating) {
        // Re-enable if already running (to pick up config changes)
        const existingStatus = getBotStatus(botConfig);
        if (existingStatus?.enabled) {
          await channel.enablePlugin.invoke({ pluginId, config: {} });
          await loadPluginStatuses();
        }
        Message.success(t('settings.bots.botSaved', 'Bot saved'));
      } else {
        Message.success(t('settings.bots.botSaved', 'Bot saved'));
      }

      setEditVisible(false);
    } catch (error: any) {
      console.error('[BotsConfig] Failed to save bot:', error);
      Message.error(error.message || t('settings.bots.saveFailed', 'Failed to save bot'));
    }
  };

  // Toggle bot enabled
  const handleToggleBot = async (bot: IMezonBotConfig, enabled: boolean) => {
    const pluginId = `mezon_${bot.id}`;
    try {
      if (enabled) {
        const status = getBotStatus(bot);
        if (!status?.hasToken) {
          Message.warning(t('settings.bots.credentialsRequired', 'Please configure credentials first'));
          return;
        }
        const result = await channel.enablePlugin.invoke({ pluginId, config: {} });
        if (!result.success) {
          Message.error(result.msg || t('settings.bots.enableFailed', 'Failed to enable bot'));
          return;
        }
      } else {
        const result = await channel.disablePlugin.invoke({ pluginId });
        if (!result.success) {
          Message.error(result.msg || t('settings.bots.disableFailed', 'Failed to disable bot'));
          return;
        }
      }

      const currentBots = (await ConfigStorage.get('mezon.bots')) || [];
      const updated = currentBots.map((b) => (b.id === bot.id ? { ...b, enabled, updatedAt: Date.now() } : b));
      await ConfigStorage.set('mezon.bots', updated);
      setBots(updated);
      await loadPluginStatuses();
    } catch (error: any) {
      Message.error(error.message);
    }
  };

  // Delete bot
  const handleDeleteBot = async () => {
    if (!botToDelete) return;
    try {
      const pluginId = `mezon_${botToDelete.id}`;
      await channel.disablePlugin.invoke({ pluginId });

      const currentBots = (await ConfigStorage.get('mezon.bots')) || [];
      const updated = currentBots.filter((b) => b.id !== botToDelete.id);
      await ConfigStorage.set('mezon.bots', updated);
      setBots(updated);

      setDeleteConfirmVisible(false);
      setBotToDelete(null);
      Message.success(t('settings.bots.botDeleted', 'Bot deleted'));
      await loadPluginStatuses();
    } catch (error: any) {
      console.error('[BotsConfig] Failed to delete bot:', error);
      Message.error(error.message || t('settings.bots.deleteFailed', 'Failed to delete bot'));
    }
  };

  // Model selection handler
  const handleModelSelect = (provider: IProvider, modelName: string) => {
    setEditModel({ id: provider.id, useModel: modelName });
  };

  // Approve pairing
  const handleApprovePairing = async (code: string) => {
    try {
      const result = await channel.approvePairing.invoke({ code });
      if (result.success) {
        Message.success(t('settings.assistant.pairingApproved', 'Pairing approved'));
        await loadPendingPairings();
        await loadAuthorizedUsers();
      } else {
        Message.error(result.msg || t('settings.assistant.approveFailed', 'Failed to approve'));
      }
    } catch (error: any) {
      Message.error(error.message);
    }
  };

  // Reject pairing
  const handleRejectPairing = async (code: string) => {
    try {
      const result = await channel.rejectPairing.invoke({ code });
      if (result.success) {
        await loadPendingPairings();
      } else {
        Message.error(result.msg || t('settings.assistant.rejectFailed', 'Failed to reject'));
      }
    } catch (error: any) {
      Message.error(error.message);
    }
  };

  // Revoke user
  const handleRevokeUser = async (userId: string) => {
    try {
      const result = await channel.revokeUser.invoke({ userId });
      if (result.success) {
        Message.success(t('settings.assistant.userRevoked', 'User access revoked'));
        await loadAuthorizedUsers();
      } else {
        Message.error(result.msg || t('settings.assistant.revokeFailed', 'Failed to revoke'));
      }
    } catch (error: any) {
      Message.error(error.message);
    }
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    Message.success(t('common.copied', 'Copied to clipboard'));
  };

  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleString();

  const getRemainingTime = (expiresAt: number) => {
    const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000 / 60));
    return `${remaining} min`;
  };

  const handleToggleActiveBotDetails = useCallback(
    (botId: string) => {
      if (activeBotId === botId) {
        setActiveBotId(null);
      } else {
        setActiveBotId(botId);
        void loadPendingPairings();
        void loadAuthorizedUsers();
      }
    },
    [activeBotId, loadPendingPairings, loadAuthorizedUsers]
  );

  const hasConnectedBot = useMemo(() => pluginStatuses.some((p) => p.connected), [pluginStatuses]);

  return (
    <div className='flex flex-col gap-16px'>
      {/* Bot List Header */}
      <div className='flex items-center justify-between'>
        <span className='text-14px text-t-secondary'>{t('settings.bots.botsList', 'Configured Bots')}</span>
        <Button type='outline' size='small' icon={<Plus size={14} />} shape='round' onClick={handleAddBot}>
          {t('settings.bots.addBot', 'Add Bot')}
        </Button>
      </div>

      {/* Bot List */}
      {bots.length === 0 ? (
        <div className='text-center py-24px text-t-secondary text-14px bg-fill-2 rd-12px'>{t('settings.bots.noBots', 'No bots configured. Click "Add Bot" to get started.')}</div>
      ) : (
        <div className='bg-fill-2 rounded-2xl p-16px'>
          <div className='space-y-8px'>
            {bots.map((bot) => {
              const status = getBotStatus(bot);
              const isConnected = status?.connected || false;
              const hasError = !!status?.error;
              const isActive = activeBotId === bot.id;

              return (
                <div key={bot.id}>
                  <div className='group bg-fill-0 rounded-lg px-16px py-12px flex items-center justify-between cursor-pointer hover:bg-fill-1 transition-colors' onClick={() => handleToggleActiveBotDetails(bot.id)}>
                    <div className='flex items-center gap-12px min-w-0'>
                      <div className='w-32px h-32px rounded-8px bg-fill-2 flex items-center justify-center flex-shrink-0'>
                        <Robot theme='outline' size={18} />
                      </div>
                      <div className='min-w-0'>
                        <div className='flex items-center gap-8px'>
                          <span className='font-medium text-t-primary truncate'>{bot.name}</span>
                          <span className={`text-10px px-6px py-1px rounded-full ${isConnected ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : hasError ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>{isConnected ? t('settings.bots.connected', 'Connected') : hasError ? t('settings.bots.error', 'Error') : t('settings.bots.offline', 'Offline')}</span>
                        </div>
                        <div className='text-12px text-t-secondary truncate'>
                          {getAssistantName(bot.assistantId)}
                          {bot.defaultModel?.useModel && <span className='ml-8px text-t-tertiary'>{bot.defaultModel.useModel}</span>}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center gap-12px'>
                      <Switch
                        size='small'
                        checked={status?.enabled || bot.enabled}
                        onChange={(checked) => {
                          void handleToggleBot(bot, checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        type='text'
                        size='small'
                        icon={<SettingOne size={16} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditBot(bot);
                        }}
                      />
                      <Button
                        type='text'
                        size='small'
                        status='danger'
                        icon={<Delete size={16} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setBotToDelete(bot);
                          setDeleteConfirmVisible(true);
                        }}
                      />
                    </div>
                  </div>

                  {/* Expanded details: pairing & users */}
                  {isActive && isConnected && (
                    <div className='ml-44px mt-8px mb-4px space-y-12px'>
                      {status?.error && <div className='text-12px text-red-600 dark:text-red-400'>{status.error}</div>}

                      {/* Pending Pairings */}
                      <div>
                        <div className='flex items-center justify-between mb-8px'>
                          <span className='text-12px font-500 text-t-secondary'>{t('settings.assistant.pendingPairings', 'Pending Pairing Requests')}</span>
                          <Button size='mini' type='text' icon={<Refresh size={12} />} loading={pairingLoading} onClick={loadPendingPairings} />
                        </div>
                        {pairingLoading ? (
                          <Spin size={16} />
                        ) : pendingPairings.length === 0 ? (
                          <div className='text-12px text-t-tertiary'>{t('settings.assistant.noPendingPairings', 'No pending pairing requests')}</div>
                        ) : (
                          <div className='space-y-6px'>
                            {pendingPairings.map((pairing) => (
                              <div key={pairing.code} className='flex items-center justify-between bg-fill-2 rd-6px p-8px'>
                                <div>
                                  <div className='flex items-center gap-6px'>
                                    <span className='text-13px font-500'>{pairing.displayName || 'Unknown'}</span>
                                    <Tooltip content={t('settings.assistant.copyCode', 'Copy pairing code')}>
                                      <button className='p-2px bg-transparent border-none text-t-tertiary hover:text-t-primary cursor-pointer' onClick={() => copyToClipboard(pairing.code)}>
                                        <Copy size={12} />
                                      </button>
                                    </Tooltip>
                                  </div>
                                  <div className='text-11px text-t-tertiary'>
                                    <code className='bg-fill-3 px-3px rd-2px'>{pairing.code}</code>
                                    <span className='mx-6px'>|</span>
                                    {getRemainingTime(pairing.expiresAt)}
                                  </div>
                                </div>
                                <div className='flex gap-4px'>
                                  <Button type='primary' size='mini' icon={<CheckOne size={12} />} onClick={() => handleApprovePairing(pairing.code)}>
                                    {t('settings.assistant.approve', 'Approve')}
                                  </Button>
                                  <Button size='mini' status='danger' icon={<CloseOne size={12} />} onClick={() => handleRejectPairing(pairing.code)} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Authorized Users */}
                      {authorizedUsers.length > 0 && (
                        <div>
                          <div className='flex items-center justify-between mb-8px'>
                            <span className='text-12px font-500 text-t-secondary'>{t('settings.assistant.authorizedUsers', 'Authorized Users')}</span>
                            <Button size='mini' type='text' icon={<Refresh size={12} />} loading={usersLoading} onClick={loadAuthorizedUsers} />
                          </div>
                          <div className='space-y-6px'>
                            {authorizedUsers.map((user) => (
                              <div key={user.id} className='flex items-center justify-between bg-fill-2 rd-6px p-8px'>
                                <div>
                                  <div className='text-13px font-500'>{user.displayName || 'Unknown'}</div>
                                  <div className='text-11px text-t-tertiary'>{formatTime(user.authorizedAt)}</div>
                                </div>
                                <Tooltip content={t('settings.assistant.revokeAccess', 'Revoke access')}>
                                  <Button type='text' status='danger' size='mini' icon={<Delete size={14} />} onClick={() => handleRevokeUser(user.id)} />
                                </Tooltip>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* First-time setup hint */}
      {bots.length > 0 && !hasConnectedBot && (
        <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rd-12px p-16px'>
          <div className='text-14px text-t-secondary space-y-6px'>
            <p className='m-0 font-500'>{t('settings.bots.setupSteps', 'Setup Steps')}:</p>
            <p className='m-0'>
              <strong>1.</strong> {t('settings.bots.step1', 'Open the Mezon platform and find your bot')}
            </p>
            <p className='m-0'>
              <strong>2.</strong> {t('settings.bots.step2', 'Send any message or /start to initiate pairing')}
            </p>
            <p className='m-0'>
              <strong>3.</strong> {t('settings.bots.step3', 'A pairing request will appear below. Click "Approve" to authorize the user.')}
            </p>
          </div>
        </div>
      )}

      {/* Edit/Create Bot Modal */}
      <Modal title={isCreating ? t('settings.bots.addBot', 'Add Bot') : t('settings.bots.editBot', 'Edit Bot')} visible={editVisible} onCancel={() => setEditVisible(false)} onOk={handleSave} okText={isCreating ? t('common.create', 'Create') : t('common.save', 'Save')} cancelText={t('common.cancel', 'Cancel')} className='w-[90vw] md:w-[500px]' unmountOnExit>
        <div className='flex flex-col gap-4px'>
          {/* Quick Setup Guide - only shown when creating, collapsible */}
          {isCreating && (
            <div className='mb-12px bg-[rgb(var(--primary-1))] rd-8px overflow-hidden'>
              <button className='w-full flex items-center justify-between p-12px bg-transparent border-none cursor-pointer text-left' onClick={() => setSetupGuideExpanded(!setupGuideExpanded)}>
                <span className='text-13px font-500 color-text-1'>{t('settings.bots.quickSetup', 'Quick Setup Guide')}</span>
                <Down size={14} className={`color-text-2 transition-transform duration-200 ${setupGuideExpanded ? 'rotate-180' : ''}`} />
              </button>
              {setupGuideExpanded && (
                <div className='px-12px pb-12px'>
                  <ol className='text-12px color-text-2 space-y-4px pl-16px mb-8px m-0'>
                    <li>
                      {t('settings.bots.quickSetupStep1', 'Open Mezon Developer Portal')}:{' '}
                      <button className='text-primary hover:underline bg-transparent border-none cursor-pointer p-0 text-12px' onClick={() => void shell.openExternal.invoke('https://mezon.ai/developers/applications')}>
                        mezon.ai/developers/applications
                      </button>
                    </li>
                    <li>{t('settings.bots.quickSetupStep2', 'Create a bot application and copy its token')}</li>
                    <li>{t('settings.bots.quickSetupStep3', 'Add the bot to any clan/channel you want it to monitor')}</li>
                  </ol>
                  <div className='text-11px color-text-3'>💡 {t('settings.bots.quickSetupTip', 'Tip: You can also set MEZON_TOKEN in your environment')}</div>
                  <div className='text-11px color-text-3 mt-4px'>
                    📖{' '}
                    <button className='text-primary hover:underline bg-transparent border-none cursor-pointer p-0 text-11px' onClick={() => void shell.openExternal.invoke('https://docs.molt.bot/channels/mezon')}>
                      {t('settings.bots.quickSetupDocs', 'Documentation')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bot Name */}
          <PreferenceRow label={t('settings.bots.botName', 'Bot Name')} description={t('settings.bots.botNameDesc', 'A display name for this bot')} required>
            <Input value={editName} onChange={setEditName} placeholder={t('settings.bots.botNamePlaceholder', 'e.g. My Assistant Bot')} style={{ width: 220 }} />
          </PreferenceRow>

          {/* Bot Token */}
          <PreferenceRow label={t('settings.bots.botToken', 'Bot Token')} description={t('settings.bots.botTokenDesc', 'Token from the Mezon Developer Portal')} required={isCreating}>
            <Input.Password
              value={editToken}
              onChange={(value) => {
                setEditToken(value);
                setCredentialsTested(false);
              }}
              placeholder={!isCreating && editingBot ? '••••••••••••••••' : 'Enter bot token'}
              style={{ width: 220 }}
              visibilityToggle
            />
          </PreferenceRow>

          {/* Bot ID */}
          <PreferenceRow label={t('settings.bots.botId', 'Bot ID')} description={t('settings.bots.botIdDesc', 'Bot ID from the Mezon Developer Portal')} required={isCreating}>
            <Input
              value={editBotId}
              onChange={(value) => {
                setEditBotId(value);
                setCredentialsTested(false);
              }}
              placeholder={!isCreating && editingBot ? '••••••••••••••••' : 'Enter bot ID'}
              style={{ width: 220 }}
            />
          </PreferenceRow>

          {/* Test Connection */}
          {(editToken.trim() || editBotId.trim()) && (
            <div className='flex justify-end py-8px'>
              <Button type='outline' loading={testLoading} onClick={handleTestConnection} size='small'>
                {credentialsTested ? t('settings.bots.tested', 'Tested') : t('settings.bots.testConnection', 'Test Connection')}
              </Button>
            </div>
          )}

          {/* Assign Assistant */}
          <PreferenceRow label={t('settings.bots.assignAssistant', 'Assigned Assistant')} description={t('settings.bots.assignAssistantDesc', 'The assistant this bot will automatically run')}>
            <Select value={editAssistantId || ''} onChange={(value) => setEditAssistantId(value || undefined)} placeholder={t('settings.bots.selectAssistant', 'Select Assistant')} style={{ width: 220 }} allowClear>
              {assistants.map((assistant) => (
                <Select.Option key={assistant.id} value={assistant.id}>
                  {assistant.name}
                </Select.Option>
              ))}
            </Select>
          </PreferenceRow>

          {/* Default Model */}
          <PreferenceRow label={t('settings.assistant.defaultModel', 'Default Model')} description={t('settings.bots.defaultModelDesc', 'Model used for bot conversations')}>
            <Dropdown
              trigger='click'
              position='br'
              droplist={
                <Menu selectedKeys={editModel ? [editModel.id + editModel.useModel] : []}>
                  {!modelList || modelList.length === 0 ? (
                    <Menu.Item key='no-models' disabled>
                      {t('settings.assistant.noAvailableModels', 'No models configured')}
                    </Menu.Item>
                  ) : (
                    modelList.map((provider) => {
                      const availableModels = getAvailableModels(provider);
                      if (availableModels.length === 0) return null;
                      return (
                        <Menu.ItemGroup title={provider.name} key={provider.id}>
                          {availableModels.map((modelName) => (
                            <Menu.Item key={provider.id + modelName} onClick={() => handleModelSelect(provider, modelName)}>
                              {modelName}
                            </Menu.Item>
                          ))}
                        </Menu.ItemGroup>
                      );
                    })
                  )}
                </Menu>
              }
            >
              <Button type='secondary' className='min-w-160px flex items-center justify-between gap-8px'>
                <span className='truncate'>{getModelDisplay(editModel)}</span>
                <Down theme='outline' size={14} />
              </Button>
            </Dropdown>
          </PreferenceRow>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title={t('settings.bots.deleteBot', 'Delete Bot')}
        visible={deleteConfirmVisible}
        onCancel={() => {
          setDeleteConfirmVisible(false);
          setBotToDelete(null);
        }}
        onOk={handleDeleteBot}
        okButtonProps={{ status: 'danger' }}
        okText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
      >
        <p>{t('settings.bots.deleteBotConfirm', 'Are you sure you want to delete this bot? This will disconnect it and remove all settings.')}</p>
        {botToDelete && <strong className='block mt-8px'>{botToDelete.name}</strong>}
      </Modal>
    </div>
  );
};

export default BotsConfigForm;
