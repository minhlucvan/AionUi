/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Mission Control Module
 *
 * Persistent mission tracking synced from Claude Code's native task files.
 * This module owns types, storage, sync logic, and IPC bridge.
 */

export type { Mission, MissionState, MissionControlEvent, StateTransition } from './types';
export { missionStore } from './MissionStore';
export { missionSyncService } from './MissionSyncService';
