/**
 * Working BotGuidPage - simplified but functional version
 */

import { ipcBridge } from '@/common';
import { useBotContext } from '@/renderer/context/BotContext';
import { emitter } from '@/renderer/utils/emitter';
import { Button, Input, Message } from '@arco-design/web-react';
import { ArrowUp } from '@icon-park/react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styles from '../guid/index.module.css';

const BotGuidPage: React.FC = () => {
  const { t } = useTranslation();
  const botContext = useBotContext();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    setLoading(true);
    try {
      // Check for Claude
      const agentsResult = await ipcBridge.acpConversation.getAvailableAgents.invoke();
      const claudeAgent = agentsResult.data?.find((agent: unknown) => (agent as { backend: string }).backend === 'claude');

      if (!claudeAgent) {
        Message.error('Claude is not available. Please configure it in Settings.');
        void navigate('/settings/model');
        return;
      }

      // Create Claude conversation
      const modelForAcp = {
        id: 'acp-placeholder',
        platform: 'acp',
        useModel: 'claude',
        name: 'Claude',
        baseUrl: '',
        apiKey: '',
      };

      const conversation = await ipcBridge.conversation.create.invoke({
        type: 'acp',
        name: input,
        model: modelForAcp,
        extra: {
          defaultFiles: [],
          workspace: '',
          customWorkspace: false,
          backend: 'claude',
          cliPath: claudeAgent.cliPath,
          agentName: claudeAgent.name,
          presetAssistantId: botContext?.assistantId,
          ...(botContext?.botId && { botId: botContext.botId }),
        },
      });

      if (!conversation || !conversation.id) {
        Message.error('Failed to create conversation');
        return;
      }

      // Store initial message
      sessionStorage.setItem(
        `acp_initial_message_${conversation.id}`,
        JSON.stringify({
          input: input,
          files: [],
        })
      );

      // Trigger refresh and navigate to bot conversation page
      emitter.emit('chat.history.refresh');
      void navigate(`/bots/${botContext?.botId}/conversation/${conversation.id}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      Message.error('Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.guidContainer}>
      <div className={styles.guidLayout}>
        <p className={`text-2xl font-semibold mb-8 text-0 text-center`}>{t('bots.chatWith', { botName: botContext?.botName || 'Bot' })}</p>

        <div
          className={`${styles.guidInputCard} relative p-16px border-1 bg-dialog-fill-0 b-solid rd-20px flex flex-col`}
          style={{
            borderColor: 'var(--border-base)',
            minHeight: '120px',
          }}
        >
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 20 }}
            placeholder={t('conversation.welcome.placeholder')}
            className={`text-16px focus:b-none rounded-xl !bg-transparent !b-none !resize-none !p-0`}
            value={input}
            onChange={setInput}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />

          <div className='flex justify-between items-center mt-12px'>
            <div className='text-t-secondary text-13px'>Using Claude (Bot: {botContext?.botName})</div>
            <Button shape='circle' type='primary' loading={loading} disabled={!input.trim()} icon={<ArrowUp theme='outline' size='14' fill='white' strokeWidth={2} />} onClick={handleSend} />
          </div>
        </div>

        <div className='text-center mt-16px text-t-tertiary text-12px'>{botContext?.assistantId === 'builtin-game-3d' && <div>Note: Game 3D assistant requires Gemini models. Using Claude instead.</div>}</div>
      </div>
    </div>
  );
};

export default BotGuidPage;
