import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/storage';
import { iconColors } from '@/renderer/theme/colors';
import { Button, Checkbox, Empty, Popover, Spin, Tag } from '@arco-design/web-react';
import { Lightning } from '@icon-park/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

type SkillInfo = {
  name: string;
  description: string;
  location: string;
  isCustom: boolean;
};

type SkillsWidgetProps = {
  conversationId: string;
};

const SkillsWidget: React.FC<SkillsWidgetProps> = ({ conversationId }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<SkillInfo[]>([]);
  const [enabledSkills, setEnabledSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const initializedRef = useRef(false);

  // Load available skills list
  const loadAvailableSkills = useCallback(async () => {
    setLoading(true);
    try {
      const skills = await ipcBridge.fs.listAvailableSkills.invoke();
      setAvailableSkills(skills);
    } catch (error) {
      console.error('[SkillsWidget] Failed to load available skills:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load conversation's enabled skills
  const loadEnabledSkills = useCallback(async () => {
    try {
      const conversation = await ipcBridge.conversation.get.invoke({ id: conversationId });
      if (conversation?.extra?.enabledSkills) {
        setEnabledSkills(conversation.extra.enabledSkills);
      } else {
        setEnabledSkills([]);
      }
    } catch (error) {
      console.error('[SkillsWidget] Failed to load conversation:', error);
    }
  }, [conversationId]);

  // Reset initialization flag when conversation changes
  useEffect(() => {
    initializedRef.current = false;
    setEnabledSkills([]);
  }, [conversationId]);

  // Load data when popover opens for the first time
  useEffect(() => {
    if (visible && !initializedRef.current) {
      initializedRef.current = true;
      void loadAvailableSkills();
      void loadEnabledSkills();
    }
  }, [visible, loadAvailableSkills, loadEnabledSkills]);

  // Persist enabled skills to conversation extra
  const persistEnabledSkills = useCallback(
    async (skills: string[]) => {
      try {
        await ipcBridge.conversation.update.invoke({
          id: conversationId,
          updates: {
            extra: {
              enabledSkills: skills,
            } as TChatConversation['extra'],
          },
          mergeExtra: true,
        });
      } catch (error) {
        console.error('[SkillsWidget] Failed to persist enabled skills:', error);
      }
    },
    [conversationId]
  );

  const handleToggleSkill = useCallback(
    (skillName: string, checked: boolean) => {
      const next = checked ? [...enabledSkills, skillName] : enabledSkills.filter((s) => s !== skillName);
      setEnabledSkills(next);
      void persistEnabledSkills(next);
    },
    [enabledSkills, persistEnabledSkills]
  );

  const enabledCount = enabledSkills.length;

  const popoverContent = (
    <div className='w-260px max-h-320px overflow-y-auto'>
      <div className='px-12px pt-8px pb-4px text-13px font-500 color-text-1'>
        {t('conversation.skills.title', { defaultValue: 'Skills' })}
      </div>
      {loading ? (
        <div className='flex items-center justify-center py-24px'>
          <Spin size={20} />
        </div>
      ) : availableSkills.length === 0 ? (
        <div className='py-12px'>
          <Empty description={t('conversation.skills.noSkills', { defaultValue: 'No skills available' })} />
        </div>
      ) : (
        <div className='flex flex-col pb-4px'>
          {availableSkills.map((skill) => (
            <label
              key={skill.name}
              className='flex items-start gap-8px px-12px py-6px cursor-pointer hover:bg-fill-2 rd-4px mx-4px transition-colors'
            >
              <Checkbox
                checked={enabledSkills.includes(skill.name)}
                onChange={(checked) => handleToggleSkill(skill.name, checked)}
                className='mt-2px flex-shrink-0'
              />
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-4px'>
                  <span className='text-13px font-500 color-text-1 truncate'>{skill.name}</span>
                  {skill.isCustom && (
                    <Tag size='small' color='arcoblue' className='flex-shrink-0 text-11px'>
                      {t('conversation.skills.custom', { defaultValue: 'Custom' })}
                    </Tag>
                  )}
                </div>
                {skill.description && (
                  <div className='text-12px color-text-3 mt-2px lh-16px line-clamp-2'>{skill.description}</div>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Popover
      trigger='click'
      position='top'
      popupVisible={visible}
      onVisibleChange={setVisible}
      content={popoverContent}
      unmountOnExit
    >
      <div className='relative inline-flex'>
        <Button
          type='secondary'
          shape='circle'
          icon={<Lightning theme='outline' size='14' strokeWidth={2} fill={iconColors.primary} />}
          aria-label={t('conversation.skills.title', { defaultValue: 'Skills' })}
        />
        {enabledCount > 0 && (
          <span className='absolute top--2px right--2px min-w-14px h-14px lh-14px text-center text-10px font-600 color-white bg-primary-6 rd-full pointer-events-none z-1'>
            {enabledCount}
          </span>
        )}
      </div>
    </Popover>
  );
};

export default SkillsWidget;
