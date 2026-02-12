/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ITeamDefinition } from '@/common/team';

/**
 * Built-in team presets for common multi-agent workflows.
 * Users can use these as templates when creating new teams.
 */
export const TEAM_PRESETS: ITeamDefinition[] = [
  {
    id: 'preset-fullstack-dev',
    name: 'Full-Stack Development',
    icon: '👥',
    description: 'Lead + Frontend + Backend + QA working together on a feature',
    members: [
      {
        id: 'lead',
        name: 'Tech Lead',
        role: 'lead',
        systemPrompt:
          'You are the tech lead. Break down the task into subtasks, assign them to teammates, review deliverables, and synthesize the final result. Coordinate work to avoid file conflicts. Summarize progress when asked.',
      },
      {
        id: 'frontend',
        name: 'Frontend Engineer',
        role: 'member',
        systemPrompt:
          'You specialize in frontend development: React components, styling, user interactions, accessibility, and client-side state management. Focus on UI/UX quality and component reusability.',
      },
      {
        id: 'backend',
        name: 'Backend Engineer',
        role: 'member',
        systemPrompt:
          'You specialize in backend development: APIs, database design, server logic, data validation, and performance optimization. Focus on clean architecture and robust error handling.',
      },
      {
        id: 'qa',
        name: 'QA Engineer',
        role: 'member',
        systemPrompt:
          'You specialize in quality assurance: writing test cases, identifying edge cases, validating implementations against requirements, and ensuring code coverage. Report issues clearly with reproduction steps.',
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'preset-code-review',
    name: 'Code Review Team',
    icon: '🔍',
    description: 'Multi-perspective code review: security, performance, and code quality',
    members: [
      {
        id: 'lead',
        name: 'Review Lead',
        role: 'lead',
        systemPrompt:
          'You are the review coordinator. Assign review areas to teammates, synthesize their findings into a final review report with severity ratings, and suggest concrete improvements.',
      },
      {
        id: 'security',
        name: 'Security Reviewer',
        role: 'member',
        systemPrompt:
          'Focus exclusively on security: injection vulnerabilities, authentication issues, data exposure, OWASP top 10, insecure dependencies, and secrets in code. Rate each finding by severity (critical/high/medium/low).',
      },
      {
        id: 'performance',
        name: 'Performance Reviewer',
        role: 'member',
        systemPrompt:
          'Focus exclusively on performance: algorithmic complexity, memory usage, unnecessary re-renders, bundle size impact, database query efficiency, and caching opportunities. Provide benchmarks where possible.',
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'preset-research',
    name: 'Research & Investigation',
    icon: '🔬',
    description: 'Parallel research with competing hypotheses and evidence-based debate',
    members: [
      {
        id: 'lead',
        name: 'Research Lead',
        role: 'lead',
        systemPrompt:
          'You coordinate the research team. Define investigation areas, assign them to researchers, synthesize findings, identify consensus and disagreements, and produce a final research report.',
      },
      {
        id: 'researcher-a',
        name: 'Researcher A',
        role: 'member',
        systemPrompt:
          'Investigate thoroughly and present findings with evidence. Be skeptical of assumptions. Challenge other researchers findings when you have contradicting evidence. Focus on accuracy over speed.',
      },
      {
        id: 'researcher-b',
        name: 'Researcher B',
        role: 'member',
        systemPrompt:
          'Investigate thoroughly and present findings with evidence. Be skeptical of assumptions. Challenge other researchers findings when you have contradicting evidence. Focus on accuracy over speed.',
      },
    ],
    createdAt: 0,
    updatedAt: 0,
  },
];

/**
 * Get a team preset by ID
 */
export function getTeamPreset(presetId: string): ITeamDefinition | undefined {
  return TEAM_PRESETS.find((p) => p.id === presetId);
}
