/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { ipcBridge } from '@/common';
import type { IRalphStartParams } from '@/common/ipcBridge';
import { ralphService } from '@process/services/ralph/RalphService';

/**
 * Initialize Ralph autonomous loop IPC bridge handlers
 */
export function initRalphBridge(): void {
  // Loop control
  ipcBridge.ralph.start.provider(async (params: IRalphStartParams) => {
    return ralphService.start(params);
  });

  ipcBridge.ralph.stop.provider(async ({ loopId }: { loopId: string }) => {
    return ralphService.stop(loopId);
  });

  ipcBridge.ralph.resume.provider(async ({ loopId }: { loopId: string }) => {
    return ralphService.resume(loopId);
  });

  // Query
  ipcBridge.ralph.getLoop.provider(async ({ loopId }: { loopId: string }) => {
    return ralphService.getLoop(loopId);
  });

  ipcBridge.ralph.getLoopByConversation.provider(async ({ conversationId }: { conversationId: string }) => {
    return ralphService.getLoopByConversation(conversationId);
  });

  ipcBridge.ralph.listLoops.provider(async () => {
    return ralphService.listLoops();
  });

  ipcBridge.ralph.getPrd.provider(async ({ workspace }: { workspace: string }) => {
    return ralphService.getPrd(workspace);
  });
}
