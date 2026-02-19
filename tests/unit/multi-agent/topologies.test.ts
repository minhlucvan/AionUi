/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from '@jest/globals';
import { createPairTopology, createReviewPipelineTopology, createStarTopology, createDebateTopology, createCustomTopology } from '@/agent/multi-agent/topologies';

describe('Topology Factories', () => {
  describe('createPairTopology', () => {
    it('should create a pair with driver and navigator', () => {
      const topology = createPairTopology('claude', 'qwen');

      expect(topology.type).toBe('pair');
      expect(topology.nodes).toHaveLength(2);
      expect(topology.nodes[0].id).toBe('driver');
      expect(topology.nodes[0].role).toBe('driver');
      expect(topology.nodes[0].backend).toBe('claude');
      expect(topology.nodes[1].id).toBe('navigator');
      expect(topology.nodes[1].role).toBe('navigator');
      expect(topology.nodes[1].backend).toBe('qwen');
    });

    it('should apply optional context and CLI paths', () => {
      const topology = createPairTopology('claude', 'claude', {
        driverContext: 'Plan carefully',
        navigatorContext: 'Be thorough',
        driverCliPath: '/usr/bin/claude',
      });

      expect(topology.nodes[0].systemContext).toBe('Plan carefully');
      expect(topology.nodes[0].cliPath).toBe('/usr/bin/claude');
      expect(topology.nodes[1].systemContext).toBe('Be thorough');
    });
  });

  describe('createReviewPipelineTopology', () => {
    it('should create planner -> coder -> reviewer pipeline', () => {
      const topology = createReviewPipelineTopology('claude', 'qwen', 'claude');

      expect(topology.type).toBe('pipeline');
      expect(topology.nodes).toHaveLength(3);
      expect(topology.pipelineOrder).toEqual(['planner', 'coder', 'reviewer']);
      expect(topology.nodes[0].role).toBe('planner');
      expect(topology.nodes[1].role).toBe('coder');
      expect(topology.nodes[2].role).toBe('reviewer');
    });
  });

  describe('createStarTopology', () => {
    it('should create coordinator + workers', () => {
      const topology = createStarTopology('claude', ['qwen', 'claude']);

      expect(topology.type).toBe('star');
      expect(topology.hubNodeId).toBe('coordinator');
      expect(topology.nodes).toHaveLength(3);
      expect(topology.nodes[0].id).toBe('coordinator');
      expect(topology.nodes[0].role).toBe('planner');
      expect(topology.nodes[1].id).toBe('worker-1');
      expect(topology.nodes[2].id).toBe('worker-2');
    });

    it('should apply custom worker labels', () => {
      const topology = createStarTopology('claude', ['claude', 'claude'], {
        workerLabels: ['Frontend Dev', 'Backend Dev'],
      });

      expect(topology.nodes[1].label).toBe('Frontend Dev');
      expect(topology.nodes[2].label).toBe('Backend Dev');
    });
  });

  describe('createDebateTopology', () => {
    it('should create judge + two debaters', () => {
      const topology = createDebateTopology('claude', 'qwen', 'claude');

      expect(topology.type).toBe('star');
      expect(topology.hubNodeId).toBe('judge');
      expect(topology.nodes).toHaveLength(3);
      expect(topology.nodes[0].id).toBe('judge');
      expect(topology.nodes[0].role).toBe('judge');
      expect(topology.nodes[1].id).toBe('agent-a');
      expect(topology.nodes[2].id).toBe('agent-b');
    });
  });

  describe('createCustomTopology', () => {
    it('should create topology with explicit edges', () => {
      const nodes = [
        { id: 'a', role: 'coder' as const, backend: 'claude' as const },
        { id: 'b', role: 'reviewer' as const, backend: 'claude' as const },
      ];
      const edges = [{ from: 'a', to: 'b' }];
      const topology = createCustomTopology(nodes, edges);

      expect(topology.type).toBe('custom');
      expect(topology.nodes).toEqual(nodes);
      expect(topology.edges).toEqual(edges);
    });
  });
});
