/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import SettingsPageWrapper from './components/SettingsPageWrapper';

const PluginsSettings: React.FC = () => {
  return (
    <SettingsPageWrapper contentClassName='max-w-1200px'>
      <div className='p-20px'>
        <h2 className='text-20px font-600 mb-16px'>Plugins</h2>
        <p className='text-t-secondary'>Plugin management interface coming soon...</p>

        <div className='mt-24px'>
          <h3 className='text-16px font-500 mb-12px'>Built-in Plugins</h3>
          <div className='flex flex-col gap-8px'>
            <div className='p-12px bg-aou-1 rd-8px'>
              <div className='font-500'>PDF Tools</div>
              <div className='text-12px text-t-secondary'>Status: Active</div>
            </div>
            <div className='p-12px bg-aou-1 rd-8px'>
              <div className='font-500'>PowerPoint Tools</div>
              <div className='text-12px text-t-secondary'>Status: Active</div>
            </div>
            <div className='p-12px bg-aou-1 rd-8px'>
              <div className='font-500'>Word Document Tools</div>
              <div className='text-12px text-t-secondary'>Status: Active</div>
            </div>
            <div className='p-12px bg-aou-1 rd-8px'>
              <div className='font-500'>Excel Tools</div>
              <div className='text-12px text-t-secondary'>Status: Active</div>
            </div>
          </div>
        </div>
      </div>
    </SettingsPageWrapper>
  );
};

export default PluginsSettings;
