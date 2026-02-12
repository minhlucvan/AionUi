/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { runAgentHooks } from '@/assistant/hooks';

/**
 * Prepare the first message by injecting preset context and skills index.
 * Delegates to the agent hooks system for consistent behavior across agents.
 */
export async function prepareFirstMessageWithSkillsIndex(
  content: string,
  options: {
    presetContext?: string;
    enabledSkills?: string[];
    workspace?: string;
    conversationId?: string;
  }
): Promise<string> {
  const result = await runAgentHooks('onFirstMessage', {
    agentType: 'acp',
    workspace: options.workspace || '',
    content,
    enabledSkills: options.enabledSkills || [],
    conversationId: options.conversationId,
    presetContext: options.presetContext,
  });

  if (result.blocked) {
    return content;
  }

  return result.content ?? content;
}
