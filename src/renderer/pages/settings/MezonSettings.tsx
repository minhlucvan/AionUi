/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import MezonModalContent from '@/renderer/components/SettingsModal/contents/MezonModalContent';
import SettingsPageWrapper from './components/SettingsPageWrapper';

const MezonSettings: React.FC = () => {
  return (
    <SettingsPageWrapper>
      <MezonModalContent />
    </SettingsPageWrapper>
  );
};

export default MezonSettings;
