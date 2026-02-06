/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import { Badge, Button, Input, Message, Radio, Select, Space, Switch, Tag, Typography } from '@arco-design/web-react';
import { Earth, Lightning, PlayOne, Power, SettingOne } from '@icon-park/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AionScrollArea from '@/renderer/components/base/AionScrollArea';
import { useSettingsViewMode } from '../settingsViewContext';

type MemuMode = 'cloud' | 'local';
type LocalStatus = 'stopped' | 'starting' | 'running' | 'error';

interface MemoryConfig {
  enabled: boolean;
  mode: MemuMode;
  apiKey: string;
  baseUrl: string;
  localPort: number;
  llmBaseUrl: string;
  llmApiKey: string;
  chatModel: string;
  embedModel: string;
  userId: string;
  autoMemorize: boolean;
  retrieveMethod: 'rag' | 'llm';
}

interface LocalServerInfo {
  status: LocalStatus;
  port: number;
  pid?: number;
  error?: string;
  pythonPath?: string;
}

const StatusBadge: React.FC<{ status: LocalStatus }> = ({ status }) => {
  const { t } = useTranslation();
  const map: Record<LocalStatus, { color: string; label: string }> = {
    stopped: { color: 'gray', label: t('settings.memory.statusStopped', { defaultValue: 'Stopped' }) },
    starting: { color: 'orange', label: t('settings.memory.statusStarting', { defaultValue: 'Starting...' }) },
    running: { color: 'green', label: t('settings.memory.statusRunning', { defaultValue: 'Running' }) },
    error: { color: 'red', label: t('settings.memory.statusError', { defaultValue: 'Error' }) },
  };
  const { color, label } = map[status] || map.stopped;
  return <Badge color={color} text={label} />;
};

const MemoryModalContent: React.FC = () => {
  const { t } = useTranslation();
  const viewMode = useSettingsViewMode();
  const isPageMode = viewMode === 'page';
  const [message, messageContext] = Message.useMessage({ maxCount: 5 });

  const [config, setConfig] = useState<MemoryConfig | null>(null);
  const [localInfo, setLocalInfo] = useState<LocalServerInfo>({ status: 'stopped', port: 11411 });
  const [depsStatus, setDepsStatus] = useState<{ pythonFound: boolean; installed: boolean; missing: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [testing, setTesting] = useState(false);

  // Load config and local server status on mount
  const loadConfig = useCallback(async () => {
    try {
      const res = await ipcBridge.memory.getConfig.invoke();
      if (res.success && res.data) setConfig(res.data as MemoryConfig);
    } catch (error) {
      console.error('Failed to load memory config:', error);
    }
  }, []);

  const loadLocalStatus = useCallback(async () => {
    try {
      const res = await ipcBridge.memory.localStatus.invoke();
      if (res.success && res.data) setLocalInfo(res.data.info as LocalServerInfo);
    } catch {
      // ignore
    }
  }, []);

  const loadDeps = useCallback(async () => {
    try {
      const res = await ipcBridge.memory.checkDeps.invoke();
      if (res.success && res.data) setDepsStatus(res.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void loadConfig();
    void loadLocalStatus();
    void loadDeps();
  }, [loadConfig, loadLocalStatus, loadDeps]);

  // Poll local status while starting/running
  useEffect(() => {
    if (!config || config.mode !== 'local') return;
    const interval = setInterval(() => void loadLocalStatus(), 3000);
    return () => clearInterval(interval);
  }, [config?.mode, loadLocalStatus]);

  const saveConfig = async (updates: Partial<MemoryConfig>) => {
    try {
      await ipcBridge.memory.updateConfig.invoke(updates);
      setConfig((prev) => (prev ? { ...prev, ...updates } : prev));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  };

  const handleStartServer = async () => {
    setLoading(true);
    try {
      const res = await ipcBridge.memory.startLocal.invoke();
      if (res.success) {
        message.success(t('settings.memory.serverStarted', { defaultValue: 'Local server started' }));
        if (res.data) setLocalInfo(res.data.info as LocalServerInfo);
      } else {
        message.error(res.msg || 'Failed to start server');
        if (res.data) setLocalInfo(res.data.info as LocalServerInfo);
      }
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStopServer = async () => {
    setLoading(true);
    try {
      const res = await ipcBridge.memory.stopLocal.invoke();
      if (res.data) setLocalInfo(res.data.info as LocalServerInfo);
      message.info(t('settings.memory.serverStopped', { defaultValue: 'Local server stopped' }));
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallDeps = async () => {
    setInstalling(true);
    try {
      const res = await ipcBridge.memory.installDeps.invoke();
      if (res.success) {
        message.success(t('settings.memory.depsInstalled', { defaultValue: 'Dependencies installed successfully' }));
        void loadDeps();
      } else {
        message.error(res.msg || 'Installation failed');
      }
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setInstalling(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await ipcBridge.memory.testConnection.invoke();
      if (res.success && res.data?.connected) {
        message.success(t('settings.memory.connectionOk', { defaultValue: 'Connection successful' }));
      } else {
        message.warning(t('settings.memory.connectionFailed', { defaultValue: 'Connection failed. Check your configuration.' }));
      }
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setTesting(false);
    }
  };

  const handleOpenDashboard = () => {
    const url = `http://127.0.0.1:${localInfo.port}/health`;
    void ipcBridge.shell.openExternal.invoke(url);
  };

  if (!config) return null;

  return (
    <div className='flex flex-col h-full w-full'>
      {messageContext}

      <AionScrollArea className='flex-1 min-h-0 pb-16px' disableOverflow={isPageMode}>
        <div className='space-y-16px'>
          {/* Enable/Disable + Mode Selection */}
          <div className='px-[12px] md:px-[32px] py-16px bg-2 rd-16px space-y-16px'>
            <div className='flex items-center justify-between'>
              <div>
                <Typography.Text className='text-16px font-medium'>{t('settings.memory.title', { defaultValue: 'Memory (memU)' })}</Typography.Text>
                <div className='text-12px text-t-secondary mt-2px'>{t('settings.memory.description', { defaultValue: 'AI memory lets assistants remember context across conversations.' })}</div>
              </div>
              <Switch checked={config.enabled} onChange={(checked) => void saveConfig({ enabled: checked })} />
            </div>

            {config.enabled && (
              <div className='space-y-12px'>
                <div className='flex items-center gap-12px'>
                  <Typography.Text className='text-13px text-t-secondary flex-shrink-0'>{t('settings.memory.modeLabel', { defaultValue: 'Mode' })}</Typography.Text>
                  <Radio.Group value={config.mode} onChange={(value) => void saveConfig({ mode: value })} type='button' size='small'>
                    <Radio value='cloud'>{t('settings.memory.modeCloud', { defaultValue: 'Cloud' })}</Radio>
                    <Radio value='local'>{t('settings.memory.modeLocal', { defaultValue: 'Local' })}</Radio>
                  </Radio.Group>
                </div>
                <div className='text-11px text-t-tertiary'>
                  {config.mode === 'cloud'
                    ? t('settings.memory.cloudDesc', { defaultValue: 'Connect to memU cloud API. Fast setup, data stored on memU servers.' })
                    : t('settings.memory.localDesc', { defaultValue: 'Run memU locally via Python. Data stays on your machine. Requires Python 3.10+ and an LLM API key for extraction.' })}
                </div>
              </div>
            )}
          </div>

          {/* Cloud Mode Settings */}
          {config.enabled && config.mode === 'cloud' && (
            <div className='px-[12px] md:px-[32px] py-16px bg-2 rd-16px space-y-12px'>
              <Typography.Text className='text-14px font-medium'>{t('settings.memory.cloudConfig', { defaultValue: 'Cloud Configuration' })}</Typography.Text>
              <div className='space-y-8px'>
                <div>
                  <Typography.Text className='text-12px text-t-secondary'>{t('settings.memory.apiKey', { defaultValue: 'API Key' })}</Typography.Text>
                  <Input.Password className='mt-4px' value={config.apiKey} onChange={(value) => void saveConfig({ apiKey: value })} placeholder='memu_...' />
                </div>
                <div>
                  <Typography.Text className='text-12px text-t-secondary'>{t('settings.memory.baseUrl', { defaultValue: 'Base URL' })}</Typography.Text>
                  <Input className='mt-4px' value={config.baseUrl} onChange={(value) => void saveConfig({ baseUrl: value })} placeholder='https://api.memu.so' />
                </div>
              </div>
              <Button size='small' loading={testing} onClick={handleTestConnection}>
                {t('settings.memory.testConnection', { defaultValue: 'Test Connection' })}
              </Button>
            </div>
          )}

          {/* Local Mode Settings */}
          {config.enabled && config.mode === 'local' && (
            <>
              {/* Server Status & Controls */}
              <div className='px-[12px] md:px-[32px] py-16px bg-2 rd-16px space-y-12px'>
                <div className='flex items-center justify-between'>
                  <Typography.Text className='text-14px font-medium'>{t('settings.memory.localServer', { defaultValue: 'Local Server' })}</Typography.Text>
                  <StatusBadge status={localInfo.status} />
                </div>

                {localInfo.error && <div className='text-12px text-danger bg-danger-light px-8px py-4px rd-4px'>{localInfo.error}</div>}

                {localInfo.status === 'running' && localInfo.pid && <div className='text-11px text-t-tertiary'>PID: {localInfo.pid} | Port: {localInfo.port}</div>}

                <Space>
                  {localInfo.status === 'stopped' || localInfo.status === 'error' ? (
                    <Button type='primary' size='small' loading={loading} icon={<PlayOne theme='outline' size='14' />} onClick={handleStartServer}>
                      {t('settings.memory.startServer', { defaultValue: 'Start Server' })}
                    </Button>
                  ) : localInfo.status === 'running' ? (
                    <Button status='warning' size='small' loading={loading} icon={<Power theme='outline' size='14' />} onClick={handleStopServer}>
                      {t('settings.memory.stopServer', { defaultValue: 'Stop Server' })}
                    </Button>
                  ) : (
                    <Button size='small' loading>
                      {t('settings.memory.statusStarting', { defaultValue: 'Starting...' })}
                    </Button>
                  )}
                  {localInfo.status === 'running' && (
                    <Button size='small' icon={<Earth theme='outline' size='14' />} onClick={handleOpenDashboard}>
                      {t('settings.memory.openDashboard', { defaultValue: 'Open in Browser' })}
                    </Button>
                  )}
                  <Button size='small' loading={testing} icon={<Lightning theme='outline' size='14' />} onClick={handleTestConnection}>
                    {t('settings.memory.testConnection', { defaultValue: 'Test Connection' })}
                  </Button>
                </Space>
              </div>

              {/* Python Environment */}
              <div className='px-[12px] md:px-[32px] py-16px bg-2 rd-16px space-y-12px'>
                <Typography.Text className='text-14px font-medium'>{t('settings.memory.environment', { defaultValue: 'Environment' })}</Typography.Text>
                {depsStatus && (
                  <div className='space-y-6px'>
                    <div className='flex items-center gap-8px'>
                      <Typography.Text className='text-12px text-t-secondary'>Python</Typography.Text>
                      {depsStatus.pythonFound ? (
                        <Tag size='small' color='green'>
                          {t('settings.memory.detected', { defaultValue: 'Detected' })}
                        </Tag>
                      ) : (
                        <Tag size='small' color='red'>
                          {t('settings.memory.notFound', { defaultValue: 'Not Found' })}
                        </Tag>
                      )}
                    </div>
                    <div className='flex items-center gap-8px'>
                      <Typography.Text className='text-12px text-t-secondary'>
                        {t('settings.memory.packages', { defaultValue: 'Packages' })}
                      </Typography.Text>
                      {depsStatus.installed ? (
                        <Tag size='small' color='green'>
                          {t('settings.memory.allInstalled', { defaultValue: 'All Installed' })}
                        </Tag>
                      ) : (
                        <>
                          <Tag size='small' color='orange'>
                            {t('settings.memory.missing', { defaultValue: 'Missing: {{list}}', list: depsStatus.missing.join(', ') })}
                          </Tag>
                          <Button size='mini' type='primary' loading={installing} onClick={handleInstallDeps}>
                            {t('settings.memory.installDeps', { defaultValue: 'Install' })}
                          </Button>
                        </>
                      )}
                    </div>
                    {!depsStatus.pythonFound && (
                      <div className='text-11px text-t-tertiary mt-4px'>{t('settings.memory.pythonHint', { defaultValue: 'Install Python 3.10+ from python.org and ensure it is in your PATH.' })}</div>
                    )}
                  </div>
                )}
                <Button size='small' icon={<SettingOne theme='outline' size='14' />} onClick={() => void loadDeps()}>
                  {t('settings.memory.refreshEnv', { defaultValue: 'Refresh' })}
                </Button>
              </div>

              {/* LLM Configuration for Local Mode */}
              <div className='px-[12px] md:px-[32px] py-16px bg-2 rd-16px space-y-12px'>
                <Typography.Text className='text-14px font-medium'>{t('settings.memory.llmConfig', { defaultValue: 'LLM Configuration' })}</Typography.Text>
                <div className='text-11px text-t-tertiary'>{t('settings.memory.llmConfigDesc', { defaultValue: 'Local memU uses an LLM for memory extraction and embeddings. Configure an OpenAI-compatible API.' })}</div>
                <div className='space-y-8px'>
                  <div>
                    <Typography.Text className='text-12px text-t-secondary'>{t('settings.memory.llmApiKey', { defaultValue: 'LLM API Key' })}</Typography.Text>
                    <Input.Password className='mt-4px' value={config.llmApiKey} onChange={(value) => void saveConfig({ llmApiKey: value })} placeholder='sk-...' />
                  </div>
                  <div>
                    <Typography.Text className='text-12px text-t-secondary'>{t('settings.memory.llmBaseUrl', { defaultValue: 'LLM Base URL' })}</Typography.Text>
                    <Input className='mt-4px' value={config.llmBaseUrl} onChange={(value) => void saveConfig({ llmBaseUrl: value })} placeholder='https://api.openai.com/v1' />
                  </div>
                  <div className='flex gap-8px'>
                    <div className='flex-1'>
                      <Typography.Text className='text-12px text-t-secondary'>{t('settings.memory.chatModel', { defaultValue: 'Chat Model' })}</Typography.Text>
                      <Input className='mt-4px' value={config.chatModel} onChange={(value) => void saveConfig({ chatModel: value })} placeholder='gpt-4o-mini' />
                    </div>
                    <div className='flex-1'>
                      <Typography.Text className='text-12px text-t-secondary'>{t('settings.memory.embedModel', { defaultValue: 'Embedding Model' })}</Typography.Text>
                      <Input className='mt-4px' value={config.embedModel} onChange={(value) => void saveConfig({ embedModel: value })} placeholder='text-embedding-3-small' />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Shared Settings */}
          {config.enabled && (
            <div className='px-[12px] md:px-[32px] py-16px bg-2 rd-16px space-y-12px'>
              <Typography.Text className='text-14px font-medium'>{t('settings.memory.advanced', { defaultValue: 'Advanced' })}</Typography.Text>
              <div className='flex items-center justify-between'>
                <div>
                  <Typography.Text className='text-13px'>{t('settings.memory.autoMemorize', { defaultValue: 'Auto-Memorize' })}</Typography.Text>
                  <div className='text-11px text-t-tertiary'>{t('settings.memory.autoMemorizeDesc', { defaultValue: 'Automatically memorize conversation turns.' })}</div>
                </div>
                <Switch size='small' checked={config.autoMemorize} onChange={(checked) => void saveConfig({ autoMemorize: checked })} />
              </div>
              <div className='flex items-center justify-between'>
                <Typography.Text className='text-13px'>{t('settings.memory.retrieveMethod', { defaultValue: 'Retrieval Method' })}</Typography.Text>
                <Select size='small' className='w-100px' value={config.retrieveMethod} onChange={(value) => void saveConfig({ retrieveMethod: value })}>
                  <Select.Option value='rag'>RAG</Select.Option>
                  <Select.Option value='llm'>LLM</Select.Option>
                </Select>
              </div>
              <div>
                <Typography.Text className='text-12px text-t-secondary'>{t('settings.memory.userId', { defaultValue: 'User ID' })}</Typography.Text>
                <Input className='mt-4px' size='small' value={config.userId} onChange={(value) => void saveConfig({ userId: value })} placeholder='default' />
              </div>
            </div>
          )}
        </div>
      </AionScrollArea>
    </div>
  );
};

export default MemoryModalContent;
