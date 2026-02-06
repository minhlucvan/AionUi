/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { IProvider } from '@/common/storage';
import AionScrollArea from '@/renderer/components/base/AionScrollArea';
import { useGeminiGoogleAuthModels } from '@/renderer/hooks/useGeminiGoogleAuthModels';
import { hasSpecificModelCapability } from '@/renderer/utils/modelCapabilities';
import { uuid } from '@/common/utils';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { useSettingsViewMode } from '../settingsViewContext';
import MezonConfigForm from './MezonConfigForm';

/**
 * Check if provider has available models (supports function calling)
 */
const hasAvailableModels = (provider: IProvider): boolean => {
  for (const modelName of provider.model || []) {
    const functionCalling = hasSpecificModelCapability(provider, modelName, 'function_calling');
    const excluded = hasSpecificModelCapability(provider, modelName, 'excludeFromPrimary');
    if ((functionCalling === true || functionCalling === undefined) && excluded !== true) {
      return true;
    }
  }
  return false;
};

/**
 * Hook to get available model list
 */
const useMezonModelList = () => {
  const { geminiModeOptions, isGoogleAuth } = useGeminiGoogleAuthModels();
  const { data: modelConfig } = useSWR('model.config.mezon', () => {
    return ipcBridge.mode.getModelConfig.invoke().then((data: IProvider[]) => {
      return (data || []).filter((platform: IProvider) => !!platform.model.length);
    });
  });

  const geminiModelValues = useMemo(() => geminiModeOptions.map((option) => option.value), [geminiModeOptions]);

  const modelList = useMemo(() => {
    let allProviders: IProvider[] = [];

    if (isGoogleAuth) {
      const geminiProvider: IProvider = {
        id: uuid(),
        name: 'Gemini Google Auth',
        platform: 'gemini-with-google-auth',
        baseUrl: '',
        apiKey: '',
        model: geminiModelValues,
        capabilities: [{ type: 'text' }, { type: 'vision' }, { type: 'function_calling' }],
      };
      allProviders = [geminiProvider, ...(modelConfig || [])];
    } else {
      allProviders = modelConfig || [];
    }

    return allProviders.filter(hasAvailableModels);
  }, [geminiModelValues, isGoogleAuth, modelConfig]);

  return { modelList };
};

/**
 * Mezon Settings Content Component
 * Standalone page for managing multiple Mezon bots
 */
const MezonModalContent: React.FC = () => {
  const { t } = useTranslation();
  const viewMode = useSettingsViewMode();
  const isPageMode = viewMode === 'page';
  const { modelList } = useMezonModelList();

  return (
    <AionScrollArea className={isPageMode ? 'h-full' : ''}>
      <div className='flex flex-col gap-16px'>
        <div>
          <h3 className='text-16px font-600 text-t-primary m-0'>{t('settings.mezon.title', 'Mezon Bots')}</h3>
          <p className='text-13px text-t-secondary mt-4px mb-0'>{t('settings.mezon.pageDesc', 'Manage your Mezon bots. Each bot can be assigned to a specific assistant for automatic message routing.')}</p>
        </div>
        <MezonConfigForm pluginStatus={null} modelList={modelList || []} selectedModel={null} onStatusChange={() => {}} onModelChange={() => {}} />
      </div>
    </AionScrollArea>
  );
};

export default MezonModalContent;
