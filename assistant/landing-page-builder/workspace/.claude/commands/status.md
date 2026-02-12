# Landing Page System Status

Check and display the current state of the landing page design system.

## If `.landing-page/system.md` exists:

Read it and display:

- **Story**: Product transformation, audience, hook
- **Visual World**: Color mood, motion language, signature element
- **Section Map**: Planned scroll sequence with purpose per section
- **Tokens**: CSS custom property system
- **Patterns**: Saved section structures and CTA styles
- **Last Updated**: When patterns were last modified

## If no `.landing-page/system.md` exists:

Report that no page direction has been established yet.

Suggest:
- Run `/landing-page-builder:init` to establish a direction from scratch
- Run `/landing-page-builder:extract` to pull patterns from existing landing page code
- Start building directly and save patterns afterward
