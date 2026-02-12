/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { Button, Modal, Tooltip } from '@arco-design/web-react';
import { CloseSmall } from '@icon-park/react';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAgentTeamContext } from '@/renderer/context/AgentTeamContext';

const AgentTeamHeader: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, definition, destroyTeam } = useAgentTeamContext();

  const handleDestroy = useCallback(() => {
    Modal.confirm({
      title: t('teams.endSessionConfirm', { defaultValue: 'End Team Session?' }),
      content: t('teams.endSessionContent', { defaultValue: 'This will stop all team member agents.' }),
      okButtonProps: { status: 'danger' },
      onOk: async () => {
        await destroyTeam();
        Promise.resolve(navigate('/bots')).catch(console.error);
      },
    });
  }, [destroyTeam, navigate, t]);

  return (
    <div className='flex items-center justify-between px-16px py-8px border-b border-[var(--color-border)] bg-[var(--color-bg-1)]'>
      <div className='flex items-center gap-12px'>
        {definition.icon && <span className='text-20px'>{definition.icon}</span>}
        <div>
          <div className='text-15px font-600 text-[var(--color-text-1)]'>{session.name}</div>
          <div className='text-12px text-[var(--color-text-3)]'>
            {definition.members.length} {t('teams.membersLabel', { defaultValue: 'members' })}
            {session.workspace && <span className='ml-8px'>{session.workspace}</span>}
          </div>
        </div>
      </div>

      <div className='flex items-center gap-8px'>
        <Tooltip content={t('teams.endSession', { defaultValue: 'End Session' })}>
          <Button size='small' type='text' status='danger' icon={<CloseSmall theme='outline' size='16' />} onClick={handleDestroy} />
        </Tooltip>
      </div>
    </div>
  );
};

export default AgentTeamHeader;
