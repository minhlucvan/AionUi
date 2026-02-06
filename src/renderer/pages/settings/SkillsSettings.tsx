/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import SkillsModalContent from '@/renderer/components/SettingsModal/contents/SkillsModalContent';
import SettingsPageWrapper from './components/SettingsPageWrapper';

const SkillsSettings: React.FC = () => {
  return (
    <SettingsPageWrapper contentClassName='max-w-1200px'>
      <SkillsModalContent />
    </SettingsPageWrapper>
  );
};

export default SkillsSettings;
