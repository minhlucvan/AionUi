/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import CliToolsModalContent from '@/renderer/components/SettingsModal/contents/CliToolsModalContent';
import SettingsPageWrapper from './components/SettingsPageWrapper';

const CliToolsSettings: React.FC = () => {
  return (
    <SettingsPageWrapper>
      <CliToolsModalContent />
    </SettingsPageWrapper>
  );
};

export default CliToolsSettings;
