/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * PreviewAppAgentBridge - Exposes preview app capabilities to AI agents.
 *
 * This bridge allows agents to:
 * 1. Discover what preview app instances are running and what they can do
 * 2. Execute capabilities on running apps (e.g., gotoLine, insertText, format)
 * 3. Open files in specific preview apps
 *
 * The capabilities are dynamically registered when apps connect and report
 * their capabilities via the WebSocket protocol.
 */

import type { PreviewAppCapability, PreviewAppInfo } from '@/common/types/previewApp';
import { previewAppRegistry } from './PreviewAppRegistry';

/**
 * Get a formatted description of all available app capabilities.
 * Useful for injecting into agent system prompts.
 */
export function getCapabilitiesDescription(): string {
  const capabilities = previewAppRegistry.getAllCapabilities();
  if (capabilities.length === 0) return '';

  const lines: string[] = ['Available preview app capabilities:'];
  const grouped = new Map<string, PreviewAppCapability[]>();

  for (const cap of capabilities) {
    const key = `${cap.appId}:${cap.instanceId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(cap);
  }

  for (const [key, caps] of grouped) {
    const [appId] = key.split(':');
    lines.push(`\n  App: ${appId}`);
    for (const cap of caps) {
      lines.push(`    - ${cap.name}: ${cap.description}`);
      if (cap.paramsSchema) {
        lines.push(`      params: ${JSON.stringify(cap.paramsSchema)}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Execute a capability by app ID and capability name.
 * Finds the first running instance of the given app and executes the capability.
 */
export async function executeCapabilityByAppId(appId: string, capability: string, params: Record<string, unknown>, conversationId?: string): Promise<unknown> {
  const instances = previewAppRegistry.getInstancesByApp(appId);
  const running = instances.filter((i: PreviewAppInfo) => i.status === 'running');

  if (running.length === 0) {
    throw new Error(`No running instances of app '${appId}'`);
  }

  // Use the first running instance
  return previewAppRegistry.executeCapability({
    instanceId: running[0].instanceId,
    capability,
    params,
    conversationId,
  });
}

/**
 * Get summary of running preview apps for agent context.
 */
export function getRunningAppsSummary(): Array<{ appId: string; instanceId: string; name: string; capabilities: string[] }> {
  return previewAppRegistry.getRunningInstances().map((instance: PreviewAppInfo) => ({
    appId: instance.appId,
    instanceId: instance.instanceId,
    name: instance.name,
    capabilities: instance.capabilities.map((c) => c.name),
  }));
}
