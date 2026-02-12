/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ITeamDefinition } from '@/common/team';
import { ipcBridge } from '@/common';
import { ConfigStorage } from '@/common/storage';
import { Button, Empty, Message, Modal } from '@arco-design/web-react';
import { Plus, Peoples, Delete, Play } from '@icon-park/react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import TeamCreateDialog from './TeamCreateDialog';

const TeamCard: React.FC<{
  team: ITeamDefinition;
  onLaunch: (team: ITeamDefinition) => void;
  onDelete: (teamId: string) => void;
}> = ({ team, onLaunch, onDelete }: { team: ITeamDefinition; onLaunch: (team: ITeamDefinition) => void; onDelete: (teamId: string) => void }) => {
  const { t } = useTranslation();
  const [launching, setLaunching] = useState(false);

  return (
    <div className='bots-card'>
      <div className='bots-card__header'>
        <div className='bots-card__avatar'>{team.icon || <Peoples theme='outline' size='20' fill='currentColor' />}</div>
        <div className='bots-card__info'>
          <div className='bots-card__name'>{team.name}</div>
          <div className='bots-card__meta'>
            <span className='text-[var(--color-text-4)] text-12px'>
              {t('teams.memberCount', { defaultValue: '{{count}} members', count: team.members.length })}
            </span>
            {team.description && <span className='text-[var(--color-text-4)] text-12px ml-8px'>{team.description}</span>}
          </div>
        </div>
        <div className='flex items-center gap-8px'>
          <Button
            type='primary'
            size='small'
            shape='round'
            loading={launching}
            icon={<Play theme='filled' size='12' />}
            onClick={async (e: any) => {
              e.stopPropagation();
              setLaunching(true);
              try {
                await onLaunch(team);
              } finally {
                setLaunching(false);
              }
            }}
          >
            {t('teams.launch', { defaultValue: 'Launch' })}
          </Button>
          <Button
            type='text'
            size='small'
            status='danger'
            icon={<Delete theme='outline' size='14' />}
            onClick={(e: any) => {
              e.stopPropagation();
              onDelete(team.id);
            }}
          />
        </div>
      </div>
    </div>
  );
};

const TeamSection: React.FC = () => {
  const [teams, setTeams] = useState<ITeamDefinition[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const loadTeams = useCallback(async () => {
    try {
      const savedTeams = (await ConfigStorage.get('agent.teams')) || [];
      setTeams(savedTeams);
    } catch (error) {
      console.error('[TeamSection] Failed to load teams:', error);
      setTeams([]);
    }
  }, []);

  useEffect(() => {
    loadTeams().catch(console.error);
  }, [loadTeams]);

  const handleLaunch = useCallback(
    async (team: ITeamDefinition) => {
      try {
        // Use dialog to select workspace
        const dirs = await ipcBridge.dialog.showOpen.invoke({ properties: ['openDirectory'] });
        if (!dirs || dirs.length === 0) return;

        const workspace = dirs[0];
        const result = await ipcBridge.team.createSession.invoke({ definition: team, workspace });

        if (result.success && result.data) {
          Message.success(t('teams.launched', { defaultValue: 'Team launched successfully' }));
          Promise.resolve(navigate(`/team/${result.data.id}`)).catch(console.error);
        } else {
          Message.error(result.msg || t('teams.launchFailed', { defaultValue: 'Failed to launch team' }));
        }
      } catch (error) {
        console.error('[TeamSection] Failed to launch team:', error);
        Message.error(t('teams.launchFailed', { defaultValue: 'Failed to launch team' }));
      }
    },
    [navigate, t]
  );

  const handleDelete = useCallback(
    (teamId: string) => {
      Modal.confirm({
        title: t('teams.deleteConfirm', { defaultValue: 'Delete Team?' }),
        content: t('teams.deleteConfirmContent', { defaultValue: 'This will remove the team definition. Active sessions will not be affected.' }),
        onOk: async () => {
          try {
            const savedTeams = (await ConfigStorage.get('agent.teams')) || [];
            const updated = savedTeams.filter((t: ITeamDefinition) => t.id !== teamId);
            await ConfigStorage.set('agent.teams', updated);
            setTeams(updated);
            Message.success(t('teams.deleted', { defaultValue: 'Team deleted' }));
          } catch (error) {
            console.error('[TeamSection] Failed to delete team:', error);
          }
        },
      });
    },
    [t]
  );

  const handleCreateTeam = useCallback(
    async (team: ITeamDefinition) => {
      try {
        const savedTeams = (await ConfigStorage.get('agent.teams')) || [];
        savedTeams.push(team);
        await ConfigStorage.set('agent.teams', savedTeams);
        setTeams(savedTeams);
        setShowCreate(false);
        Message.success(t('teams.created', { defaultValue: 'Team created' }));
      } catch (error) {
        console.error('[TeamSection] Failed to create team:', error);
      }
    },
    [t]
  );

  return (
    <>
      <div className='mt-32px'>
        <div className='mb-20px flex items-center justify-between'>
          <div>
            <h2 className='text-18px font-600 text-[var(--color-text-1)] m-0'>{t('teams.title', { defaultValue: 'Teams' })}</h2>
            <p className='text-13px text-[var(--color-text-3)] mt-4px mb-0'>{t('teams.subtitle', { defaultValue: 'Multi-agent teams for collaborative tasks' })}</p>
          </div>
          <Button type='outline' icon={<Plus theme='outline' size='14' />} shape='round' onClick={() => setShowCreate(true)}>
            {t('teams.addTeam', { defaultValue: 'Add Team' })}
          </Button>
        </div>

        {teams.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-40px'>
            <Empty description={<span className='text-[var(--color-text-3)]'>{t('teams.empty', { defaultValue: 'No teams configured yet' })}</span>} />
            <Button type='outline' icon={<Plus theme='outline' size='14' />} shape='round' className='mt-16px' onClick={() => setShowCreate(true)}>
              {t('teams.addTeam', { defaultValue: 'Add Team' })}
            </Button>
          </div>
        ) : (
          <div className='flex flex-col gap-10px'>
            {teams.map((team: ITeamDefinition) => (
              <TeamCard key={team.id} team={team} onLaunch={handleLaunch} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <TeamCreateDialog visible={showCreate} onClose={() => setShowCreate(false)} onConfirm={handleCreateTeam} />}
    </>
  );
};

export default TeamSection;
