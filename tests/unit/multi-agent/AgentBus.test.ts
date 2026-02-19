/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { AgentBus } from '@/agent/multi-agent/AgentBus';
import type { BusEvent, BusMessage } from '@/agent/multi-agent/types';

describe('AgentBus', () => {
  let bus: AgentBus;

  beforeEach(() => {
    bus = new AgentBus();
  });

  describe('publish', () => {
    it('should emit agent:response event', () => {
      const listener = jest.fn<(event: BusEvent) => void>();
      bus.onEvent('agent:response', listener);

      const message: BusMessage = {
        id: 'msg-1',
        from: 'driver',
        content: 'Hello',
        timestamp: Date.now(),
      };
      bus.publish(message);

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].type).toBe('agent:response');
      expect(listener.mock.calls[0][0].message).toEqual(message);
    });

    it('should store messages in the log', () => {
      const msg: BusMessage = { id: 'msg-1', from: 'a', content: 'test', timestamp: 1 };
      bus.publish(msg);

      expect(bus.getMessageLog()).toEqual([msg]);
    });
  });

  describe('delivered', () => {
    it('should emit agent:delivered event', () => {
      const listener = jest.fn<(event: BusEvent) => void>();
      bus.onEvent('agent:delivered', listener);

      const msg: BusMessage = { id: 'msg-1', from: 'a', content: 'test', timestamp: 1 };
      bus.delivered(msg, 'b');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].nodeId).toBe('b');
    });
  });

  describe('error', () => {
    it('should emit agent:error event', () => {
      const listener = jest.fn<(event: BusEvent) => void>();
      bus.onEvent('agent:error', listener);

      bus.error('node-1', 'Something went wrong');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].nodeId).toBe('node-1');
      expect(listener.mock.calls[0][0].error).toBe('Something went wrong');
    });
  });

  describe('complete', () => {
    it('should emit bus:complete event', () => {
      const listener = jest.fn<(event: BusEvent) => void>();
      bus.onEvent('bus:complete', listener);

      bus.complete({ totalTurns: 5 });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].meta).toEqual({ totalTurns: 5 });
    });
  });

  describe('onAll', () => {
    it('should receive all event types', () => {
      const listener = jest.fn<(event: BusEvent) => void>();
      bus.onAll(listener);

      bus.publish({ id: '1', from: 'a', content: 'x', timestamp: 1 });
      bus.error('b', 'err');
      bus.complete();

      expect(listener).toHaveBeenCalledTimes(3);
    });

    it('should unsubscribe correctly', () => {
      const listener = jest.fn<(event: BusEvent) => void>();
      const unsub = bus.onAll(listener);

      bus.publish({ id: '1', from: 'a', content: 'x', timestamp: 1 });
      unsub();
      bus.publish({ id: '2', from: 'a', content: 'y', timestamp: 2 });

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMessagesFrom', () => {
    it('should filter messages by node ID', () => {
      bus.publish({ id: '1', from: 'a', content: 'from-a', timestamp: 1 });
      bus.publish({ id: '2', from: 'b', content: 'from-b', timestamp: 2 });
      bus.publish({ id: '3', from: 'a', content: 'from-a-2', timestamp: 3 });

      const fromA = bus.getMessagesFrom('a');
      expect(fromA).toHaveLength(2);
      expect(fromA[0].content).toBe('from-a');
      expect(fromA[1].content).toBe('from-a-2');
    });
  });

  describe('reset', () => {
    it('should clear log and listeners', () => {
      const listener = jest.fn<(event: BusEvent) => void>();
      bus.onAll(listener);
      bus.publish({ id: '1', from: 'a', content: 'test', timestamp: 1 });

      bus.reset();

      expect(bus.getMessageLog()).toEqual([]);
      bus.publish({ id: '2', from: 'a', content: 'after-reset', timestamp: 2 });
      // Listener was removed, should not receive the second event
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});
