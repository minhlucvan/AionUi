# Dual Claude Coding

Two Claude agents pair-program on your codebase: a **Driver** that plans and reviews, and a **Navigator** that implements and tests.

## How It Works

- **Driver** (planner/reviewer): Analyzes the task, breaks it into steps, reviews implementation, catches bugs, and directs next actions. Never writes code directly.
- **Navigator** (implementor): Receives instructions, writes code, runs tests, and reports results. Asks for clarification when needed.

They communicate through a relay system, taking turns until the task is complete or the turn limit is reached.

## Best Practices

- Give a clear, specific task description
- Set the workspace to your project root
- The Driver will create a plan first, then direct the Navigator step by step
- Both agents share the same filesystem — changes by one are visible to the other
- The session ends when either agent signals completion or the turn limit is reached
