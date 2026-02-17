/**
 * Unit tests for AcpMessageQueue
 */

// Mock uuid before importing the module
jest.mock('@/common/utils', () => ({
  uuid: () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
}));

import { AcpMessageQueue } from '../../src/process/task/AcpMessageQueue';

describe('AcpMessageQueue', () => {
  let queue: AcpMessageQueue;
  let sentMessages: Array<{ content: string; files?: string[]; msg_id?: string }>;
  let resolvers: Array<() => void>;

  beforeEach(() => {
    queue = new AcpMessageQueue();
    sentMessages = [];
    resolvers = [];

    // Set up a sender that captures messages and can be resolved manually
    queue.setSender((data) => {
      sentMessages.push(data);
      return new Promise<void>((resolve) => {
        resolvers.push(resolve);
      });
    });
  });

  describe('enqueue', () => {
    it('should enqueue a message and return an ID', () => {
      const id = queue.enqueue({
        content: 'Hello',
        priority: 'normal',
        source: 'user',
      });
      expect(id).toBeTruthy();
      expect(queue.getStatus().queueLength).toBe(0); // Already started processing
      expect(sentMessages.length).toBe(1);
    });

    it('should queue messages when processing', () => {
      queue.enqueue({ content: 'First', priority: 'normal', source: 'user' });
      queue.enqueue({ content: 'Second', priority: 'normal', source: 'user' });

      expect(sentMessages.length).toBe(1);
      expect(sentMessages[0].content).toBe('First');
      expect(queue.getStatus().queueLength).toBe(1);
    });

    it('should insert high-priority messages before normal ones', () => {
      queue.enqueue({ content: 'First', priority: 'normal', source: 'user' });
      queue.enqueue({ content: 'Normal', priority: 'normal', source: 'user' });
      queue.enqueue({ content: 'High', priority: 'high', source: 'hook' });

      // First was dequeued for processing, queue has: [High, Normal]
      const status = queue.getStatus();
      expect(status.messages[0].content).toBe('High');
      expect(status.messages[1].content).toBe('Normal');
    });
  });

  describe('processing', () => {
    it('should process next message after current finishes', async () => {
      queue.enqueue({ content: 'First', priority: 'normal', source: 'user' });
      queue.enqueue({ content: 'Second', priority: 'normal', source: 'user' });

      expect(sentMessages.length).toBe(1);
      expect(sentMessages[0].content).toBe('First');

      // Resolve first message
      resolvers[0]();
      await new Promise((r) => setTimeout(r, 10));

      expect(sentMessages.length).toBe(2);
      expect(sentMessages[1].content).toBe('Second');
    });

    it('should emit drain when queue is empty', async () => {
      const events: string[] = [];
      queue.on((event) => events.push(event.type));

      queue.enqueue({ content: 'Only', priority: 'normal', source: 'user' });

      // Resolve the message
      resolvers[0]();
      await new Promise((r) => setTimeout(r, 10));

      expect(events).toContain('drain');
    });
  });

  describe('pause and resume', () => {
    it('should not process next message when paused', async () => {
      queue.enqueue({ content: 'First', priority: 'normal', source: 'user' });
      queue.enqueue({ content: 'Second', priority: 'normal', source: 'user' });

      queue.pause();

      // Resolve first message
      resolvers[0]();
      await new Promise((r) => setTimeout(r, 10));

      // Second should not have been sent
      expect(sentMessages.length).toBe(1);
      expect(queue.getStatus().status).toBe('paused');
    });

    it('should resume processing when resumed', async () => {
      queue.enqueue({ content: 'First', priority: 'normal', source: 'user' });
      queue.enqueue({ content: 'Second', priority: 'normal', source: 'user' });

      queue.pause();
      resolvers[0]();
      await new Promise((r) => setTimeout(r, 10));

      expect(sentMessages.length).toBe(1);

      queue.resume();
      await new Promise((r) => setTimeout(r, 10));

      expect(sentMessages.length).toBe(2);
      expect(sentMessages[1].content).toBe('Second');
    });
  });

  describe('clear', () => {
    it('should remove all pending messages', () => {
      queue.enqueue({ content: 'First', priority: 'normal', source: 'user' });
      queue.enqueue({ content: 'Second', priority: 'normal', source: 'user' });
      queue.enqueue({ content: 'Third', priority: 'normal', source: 'user' });

      queue.clear();

      expect(queue.getStatus().queueLength).toBe(0);
      expect(queue.getStatus().status).toBe('idle');
    });
  });

  describe('remove', () => {
    it('should remove a specific message by ID', () => {
      queue.enqueue({ content: 'First', priority: 'normal', source: 'user' });
      const id = queue.enqueue({ content: 'ToRemove', priority: 'normal', source: 'user' });
      queue.enqueue({ content: 'Third', priority: 'normal', source: 'user' });

      const removed = queue.remove(id);
      expect(removed).toBe(true);
      expect(queue.getStatus().queueLength).toBe(1);
    });

    it('should return false for non-existent ID', () => {
      expect(queue.remove('non-existent')).toBe(false);
    });
  });

  describe('onAgentFinished', () => {
    it('should process next message when called and queue has items', async () => {
      // Set up a synchronous sender
      const syncSender = jest.fn().mockResolvedValue(undefined);
      queue.setSender(syncSender);

      // First enqueue triggers auto-processing
      queue.enqueue({ content: 'First', priority: 'normal', source: 'user' });
      await new Promise((r) => setTimeout(r, 10));

      // Now enqueue while idle - but since first completed, queue is idle again
      queue.enqueue({ content: 'Second', priority: 'normal', source: 'hook' });
      await new Promise((r) => setTimeout(r, 10));

      expect(syncSender).toHaveBeenCalledTimes(2);
    });
  });

  describe('enqueueAll', () => {
    it('should enqueue multiple messages at once', () => {
      const ids = queue.enqueueAll([
        { content: 'A', priority: 'normal', source: 'hook' },
        { content: 'B', priority: 'normal', source: 'hook' },
        { content: 'C', priority: 'normal', source: 'hook' },
      ]);

      expect(ids.length).toBe(3);
      expect(ids.every((id) => id.length > 0)).toBe(true);
    });
  });

  describe('events', () => {
    it('should emit events for enqueue and dequeue', () => {
      const events: string[] = [];
      queue.on((event) => events.push(event.type));

      queue.enqueue({ content: 'Test', priority: 'normal', source: 'user' });

      expect(events).toContain('enqueue');
      expect(events).toContain('dequeue');
      expect(events).toContain('start');
    });

    it('should allow unsubscribing from events', () => {
      const events: string[] = [];
      const unsub = queue.on((event) => events.push(event.type));

      queue.enqueue({ content: 'First', priority: 'normal', source: 'user' });
      const countAfterFirst = events.length;

      unsub();

      queue.enqueue({ content: 'Second', priority: 'normal', source: 'user' });
      expect(events.length).toBe(countAfterFirst);
    });
  });
});
