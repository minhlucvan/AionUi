import React from 'react';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ChatDot, Robot } from '@icon-park/react';
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
        className={classNames('app-titlebar__mode-tab', {
          'app-titlebar__mode-tab--active': activeMode === 'chat',
        })}
        onClick={() => onChange('chat')}
      >
        <ChatDot theme='outline' size='14' fill='currentColor' />
        <span>{t('titlebar.mode.chat', { defaultValue: 'Chat' })}</span>
      </button>
      <button
        type='button'
        className={classNames('app-titlebar__mode-tab', {
          'app-titlebar__mode-tab--active': activeMode === 'assistants',
        })}
        onClick={() => onChange('assistants')}
      >
        <Robot theme='outline' size='14' fill='currentColor' />
        <span>{t('titlebar.mode.assistants', { defaultValue: 'Assistants' })}</span>
      </button>
    </div>
  );
};

export default ModeTabs;
