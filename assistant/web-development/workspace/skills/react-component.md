---
name: React Component Creation
description: Create production-ready React components with TypeScript, proper typing, and best practices
---

# React Component Creation Skill

When creating React components, follow these guidelines:

## Component Structure

1. **Use Functional Components with TypeScript**
   - Define proper prop interfaces
   - Use React.FC when appropriate
   - Export types alongside components

2. **Follow Naming Conventions**
   - PascalCase for component names
   - Descriptive prop names
   - Clear file naming (ComponentName.tsx)

3. **Component Organization**
   ```
   ComponentName/
   ├── index.ts (re-export)
   ├── ComponentName.tsx (main component)
   ├── ComponentName.types.ts (types)
   ├── ComponentName.styles.ts (styles)
   └── ComponentName.test.tsx (tests)
   ```

## Best Practices

- Use hooks appropriately (useState, useEffect, useCallback, useMemo)
- Implement proper error boundaries
- Add accessibility attributes (aria-*, role)
- Include loading and error states
- Implement responsive design
- Add comprehensive prop validation
- Document props with JSDoc comments
- Include unit tests

## Example Template

```typescript
import React from 'react';

interface ComponentNameProps {
  /** Description of prop */
  propName: string;
  /** Optional prop with default */
  optionalProp?: number;
  /** Callback handler */
  onAction?: (data: unknown) => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  propName,
  optionalProp = 0,
  onAction,
}) => {
  // Component logic here

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

Always follow these principles when generating React components.
