import { ipcBridge } from '@/common';
import type { TChatConversation } from '@/common/storage';
import { iconColors } from '@/renderer/theme/colors';
import { Button, Checkbox, Empty, Popover, Spin, Tag, Tooltip } from '@arco-design/web-react';
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
  conversationId?: string;
  defaultSkills?: string[]; // Preset defaults (locked, cannot be unchecked)
  enabledSkills?: string[]; // Current enabled skills (controlled mode)
  onEnabledSkillsChange?: (skills: string[]) => void; // Callback when skills change (controlled mode)
};

const SkillsWidget: React.FC<SkillsWidgetProps> = ({ conversationId, defaultSkills = [], enabledSkills: controlledEnabledSkills, onEnabledSkillsChange }) => {
  const isControlledMode = onEnabledSkillsChange !== undefined;
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<SkillInfo[]>([]);
  const [internalEnabledSkills, setInternalEnabledSkills] = useState<string[]>([]);

  // Use controlled or internal state
  const enabledSkills = isControlledMode ? controlledEnabledSkills || [] : internalEnabledSkills;
  const setEnabledSkills = isControlledMode ? (skills: string[]) => onEnabledSkillsChange?.(skills) : setInternalEnabledSkills;
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

  // Load conversation's enabled skills (only for uncontrolled mode with conversationId)
  const loadEnabledSkills = useCallback(async () => {
    if (isControlledMode || !conversationId) return;
    try {
      const conversation = await ipcBridge.conversation.get.invoke({ id: conversationId });
      if (conversation?.extra?.enabledSkills) {
        setInternalEnabledSkills(conversation.extra.enabledSkills);
      } else {
        setInternalEnabledSkills([]);
      }
    } catch (error) {
      console.error('[SkillsWidget] Failed to load conversation:', error);
    }
  }, [conversationId, isControlledMode]);

  // Reset initialization flag when conversation changes (only for uncontrolled mode)
  useEffect(() => {
    if (isControlledMode) return;
    initializedRef.current = false;
    setInternalEnabledSkills([]);
  }, [conversationId, isControlledMode]);

  // Load data when popover opens for the first time
  useEffect(() => {
    if (visible && !initializedRef.current) {
      initializedRef.current = true;
      void loadAvailableSkills();
      if (!isControlledMode) {
        void loadEnabledSkills();
      }
    }
  }, [visible, loadAvailableSkills, loadEnabledSkills, isControlledMode]);

  // Persist enabled skills to conversation extra (only for uncontrolled mode with conversationId)
  const persistEnabledSkills = useCallback(
    async (skills: string[]) => {
      if (isControlledMode || !conversationId) return;
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
    [conversationId, isControlledMode]
  );

  const handleToggleSkill = useCallback(
    (skillName: string, checked: boolean) => {
      // Prevent unchecking default skills (they are locked)
      if (!checked && defaultSkills.includes(skillName)) {
        return;
      }
      const next = checked ? [...enabledSkills, skillName] : enabledSkills.filter((s) => s !== skillName);
      setEnabledSkills(next);
      if (!isControlledMode) {
        void persistEnabledSkills(next);
      }
    },
    [enabledSkills, defaultSkills, persistEnabledSkills, isControlledMode, setEnabledSkills]
  );

  const enabledCount = enabledSkills.length;

  const popoverContent = (
    <div className='w-220px max-h-320px overflow-y-auto'>
      <div className='px-12px pt-8px pb-6px text-13px font-500 color-text-1'>{t('conversation.skills.title', { defaultValue: 'Skills' })}</div>
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
          {availableSkills.map((skill) => {
            const isDefaultSkill = defaultSkills.includes(skill.name);
            const isChecked = enabledSkills.includes(skill.name);
            const skillItem = (
              <label key={skill.name} className={`flex items-center gap-8px px-12px py-5px rd-4px mx-4px transition-colors ${isDefaultSkill ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-fill-2'}`}>
                <Checkbox checked={isChecked} disabled={isDefaultSkill} onChange={(checked) => handleToggleSkill(skill.name, checked)} className='flex-shrink-0' />
                <span className='text-13px font-500 color-text-1 truncate flex-1'>{skill.name}</span>
                {isDefaultSkill && (
                  <Tag size='small' color='gray' className='flex-shrink-0 text-10px !px-4px !py-0 !lh-16px'>
                    {t('conversation.skills.preset', { defaultValue: 'Preset' })}
                  </Tag>
                )}
                {skill.isCustom && !isDefaultSkill && (
                  <Tag size='small' color='arcoblue' className='flex-shrink-0 text-10px !px-4px !py-0 !lh-16px'>
                    {t('conversation.skills.custom', { defaultValue: 'Custom' })}
                  </Tag>
                )}
              </label>
            );
            return skill.description ? (
              <Tooltip key={skill.name} content={<div className='max-w-280px text-12px lh-18px'>{skill.description}</div>} position='right' mini>
                {skillItem}
              </Tooltip>
            ) : (
              skillItem
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Popover trigger='click' position='top' popupVisible={visible} onVisibleChange={setVisible} content={popoverContent} unmountOnExit>
      <div className='relative inline-flex'>
        <Button type='secondary' shape='circle' icon={<Lightning theme='outline' size='14' strokeWidth={2} fill={iconColors.primary} />} aria-label={t('conversation.skills.title', { defaultValue: 'Skills' })} />
        {enabledCount > 0 && <span className='absolute top--2px right--2px min-w-14px h-14px lh-14px text-center text-10px font-600 color-white bg-primary-6 rd-full pointer-events-none z-1'>{enabledCount}</span>}
      </div>
    </Popover>
  );
};

export default SkillsWidget;
