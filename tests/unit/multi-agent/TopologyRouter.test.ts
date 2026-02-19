/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from '@jest/globals';
import { TopologyRouter } from '@/agent/multi-agent/TopologyRouter';
import type { TopologyConfig } from '@/agent/multi-agent/types';

const twoNodes = [
  { id: 'a', role: 'driver' as const, backend: 'claude' as const },
  { id: 'b', role: 'navigator' as const, backend: 'claude' as const },
];

const threeNodes = [
  { id: 'planner', role: 'planner' as const, backend: 'claude' as const },
  { id: 'coder', role: 'coder' as const, backend: 'claude' as const },
  { id: 'reviewer', role: 'reviewer' as const, backend: 'claude' as const },
];

describe('TopologyRouter', () => {
  describe('pair', () => {
    it('should create bidirectional edges for 2 nodes', () => {
      const config: TopologyConfig = { type: 'pair', nodes: twoNodes };
      const router = new TopologyRouter(config);

      expect(router.getTargets('a')).toEqual(['b']);
      expect(router.getTargets('b')).toEqual(['a']);
    });

    it('should return all edges', () => {
      const config: TopologyConfig = { type: 'pair', nodes: twoNodes };
      const router = new TopologyRouter(config);

      expect(router.getEdges()).toEqual([
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ]);
    });
  });

  describe('pipeline', () => {
    it('should create circular edges A -> B -> C -> A', () => {
      const config: TopologyConfig = {
        type: 'pipeline',
        nodes: threeNodes,
        pipelineOrder: ['planner', 'coder', 'reviewer'],
      };
      const router = new TopologyRouter(config);

      expect(router.getTargets('planner')).toEqual(['coder']);
      expect(router.getTargets('coder')).toEqual(['reviewer']);
      expect(router.getTargets('reviewer')).toEqual(['planner']);
    });

    it('should default to node order when pipelineOrder is not specified', () => {
      const config: TopologyConfig = { type: 'pipeline', nodes: threeNodes };
      const router = new TopologyRouter(config);

      expect(router.getTargets('planner')).toEqual(['coder']);
      expect(router.getTargets('reviewer')).toEqual(['planner']);
    });
  });

  describe('star', () => {
    it('should create hub-spoke edges', () => {
      const config: TopologyConfig = {
        type: 'star',
        hubNodeId: 'planner',
        nodes: threeNodes,
      };
      const router = new TopologyRouter(config);

      // Hub -> all spokes
      const hubTargets = router.getTargets('planner');
      expect(hubTargets).toContain('coder');
      expect(hubTargets).toContain('reviewer');

      // Spokes -> hub only
      expect(router.getTargets('coder')).toEqual(['planner']);
      expect(router.getTargets('reviewer')).toEqual(['planner']);
    });

    it('should default hub to first node', () => {
      const config: TopologyConfig = { type: 'star', nodes: threeNodes };
      const router = new TopologyRouter(config);

      expect(router.getTargets('planner')).toContain('coder');
      expect(router.getTargets('coder')).toEqual(['planner']);
    });
  });

  describe('mesh', () => {
    it('should create fully connected edges', () => {
      const config: TopologyConfig = { type: 'mesh', nodes: threeNodes };
      const router = new TopologyRouter(config);

      expect(router.getTargets('planner')).toEqual(['coder', 'reviewer']);
      expect(router.getTargets('coder')).toEqual(['planner', 'reviewer']);
      expect(router.getTargets('reviewer')).toEqual(['planner', 'coder']);
    });

    it('should produce n*(n-1) edges for n nodes', () => {
      const config: TopologyConfig = { type: 'mesh', nodes: threeNodes };
      const router = new TopologyRouter(config);

      // 3 nodes -> 3*2 = 6 edges
      expect(router.getEdges()).toHaveLength(6);
    });
  });

  describe('custom', () => {
    it('should use explicit edges', () => {
      const config: TopologyConfig = {
        type: 'custom',
        nodes: threeNodes,
        edges: [
          { from: 'planner', to: 'coder' },
          { from: 'coder', to: 'reviewer' },
          // No edge from reviewer -> anyone (dead end)
        ],
      };
      const router = new TopologyRouter(config);

      expect(router.getTargets('planner')).toEqual(['coder']);
      expect(router.getTargets('coder')).toEqual(['reviewer']);
      expect(router.getTargets('reviewer')).toEqual([]);
    });
  });

  describe('getNodeIds', () => {
    it('should return all node IDs', () => {
      const config: TopologyConfig = { type: 'pair', nodes: twoNodes };
      const router = new TopologyRouter(config);
      expect(router.getNodeIds()).toEqual(['a', 'b']);
    });
  });
});
