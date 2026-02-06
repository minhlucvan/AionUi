import React from 'react';
import { useTranslation } from 'react-i18next';
import { Message, Robot } from '@icon-park/react';
import type { AppMode } from '@/renderer/context/LayoutContext';

interface ModeTabsProps {
  activeMode: AppMode;
  onChange: (mode: AppMode) => void;
}

const ModeTabs: React.FC<ModeTabsProps> = ({ activeMode, onChange }) => {
  const { t } = useTranslation();

  return (
    <div className='app-titlebar__mode-tabs'>
      <button
        type='button'
        className='app-titlebar__mode-tab'
        data-active={activeMode === 'chat' || undefined}
        onClick={() => onChange('chat')}
      >
        <Message theme='outline' size='14' fill='currentColor' />
        <span>{t('titlebar.mode.chat', { defaultValue: 'Chat' })}</span>
      </button>
      <button
        type='button'
        className='app-titlebar__mode-tab'
        data-active={activeMode === 'bots' || undefined}
        onClick={() => onChange('bots')}
      >
        <Robot theme='outline' size='14' fill='currentColor' />
        <span>{t('titlebar.mode.bots', { defaultValue: 'Bots' })}</span>
      </button>
    </div>
  );
};

export default ModeTabs;
