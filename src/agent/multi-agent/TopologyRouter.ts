/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * TopologyRouter — Determines where messages go based on the topology.
 *
 * Given a topology definition, resolves "when node X finishes, who gets the message?"
 *
 * Topologies:
 *   pair     -  A ↔ B  (alternating)
 *   pipeline -  A → B → C → A  (circular pipeline)
 *   star     -  Hub ↔ Spokes  (hub relays to next spoke round-robin)
 *   mesh     -  All nodes receive every message (broadcast)
 *   custom   -  Explicit edge list
 */

import type { TopologyConfig, RoutingEdge } from './types';

export class TopologyRouter {
  private edges: RoutingEdge[];
  private nodeIds: string[];
  private topologyType: string;

  constructor(config: TopologyConfig) {
    this.nodeIds = config.nodes.map((n) => n.id);
    this.topologyType = config.type;
    this.edges = this.buildEdges(config);
  }

  /**
   * Given a source node ID, return the target node IDs to deliver to.
   */
  getTargets(fromNodeId: string): string[] {
    return this.edges.filter((e) => e.from === fromNodeId).map((e) => e.to);
  }

  /**
   * Get all edges.
   */
  getEdges(): RoutingEdge[] {
    return [...this.edges];
  }

  /**
   * Get all node IDs.
   */
  getNodeIds(): string[] {
    return [...this.nodeIds];
  }

  /**
   * Build routing edges from the topology config.
   */
  private buildEdges(config: TopologyConfig): RoutingEdge[] {
    switch (config.type) {
      case 'pair':
        return this.buildPairEdges(config);
      case 'pipeline':
        return this.buildPipelineEdges(config);
      case 'star':
        return this.buildStarEdges(config);
      case 'mesh':
        return this.buildMeshEdges(config);
      case 'custom':
        return config.edges || [];
      default:
        return config.edges || [];
    }
  }

  /**
   * Pair: A ↔ B  (exactly 2 nodes, bidirectional)
   */
  private buildPairEdges(config: TopologyConfig): RoutingEdge[] {
    const ids = config.nodes.map((n) => n.id);
    if (ids.length !== 2) {
      console.warn(`[TopologyRouter] Pair topology requires exactly 2 nodes, got ${ids.length}`);
    }
    const [a, b] = ids;
    return [
      { from: a, to: b },
      { from: b, to: a },
    ];
  }

  /**
   * Pipeline: A → B → C → A  (circular, each node feeds the next)
   */
  private buildPipelineEdges(config: TopologyConfig): RoutingEdge[] {
    const order = config.pipelineOrder || config.nodes.map((n) => n.id);
    const edges: RoutingEdge[] = [];
    for (let i = 0; i < order.length; i++) {
      const next = order[(i + 1) % order.length];
      edges.push({ from: order[i], to: next });
    }
    return edges;
  }

  /**
   * Star: Hub ↔ Spokes
   * Hub sends to all spokes; spokes send back to hub.
   */
  private buildStarEdges(config: TopologyConfig): RoutingEdge[] {
    const hubId = config.hubNodeId || config.nodes[0]?.id;
    if (!hubId) return [];

    const edges: RoutingEdge[] = [];
    for (const node of config.nodes) {
      if (node.id === hubId) continue;
      edges.push({ from: hubId, to: node.id });
      edges.push({ from: node.id, to: hubId });
    }
    return edges;
  }

  /**
   * Mesh: Every node sends to every other node (broadcast).
   */
  private buildMeshEdges(config: TopologyConfig): RoutingEdge[] {
    const edges: RoutingEdge[] = [];
    const ids = config.nodes.map((n) => n.id);
    for (const from of ids) {
      for (const to of ids) {
        if (from !== to) {
          edges.push({ from, to });
        }
      }
    }
    return edges;
  }
}
