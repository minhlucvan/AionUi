/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

export interface BotContextValue {
  botId: string;
  botName?: string;
  assistantId?: string;
}

export const BotContext = React.createContext<BotContextValue | null>(null);

export function useBotContext(): BotContextValue | null {
  return React.useContext(BotContext);
}
