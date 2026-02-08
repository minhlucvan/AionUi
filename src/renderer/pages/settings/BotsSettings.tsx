/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import BotsModalContent from '@/renderer/components/SettingsModal/contents/BotsModalContent';
import SettingsPageWrapper from './components/SettingsPageWrapper';

const BotsSettings: React.FC = () => {
  return (
    <SettingsPageWrapper>
      <BotsModalContent />
    </SettingsPageWrapper>
  );
};

export default BotsSettings;
