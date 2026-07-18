{
  "name": "{{SLUG}}-ui",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "bun run build.ts",
    "watch": "bun run watch.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@vsreact/core": "{{CORE_RANGE}}",
{{#IF_POSTHOG}}
    "@vsreact/posthog": "{{POSTHOG_RANGE}}",
{{/IF_POSTHOG}}
    "react": "18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "bun-types": "^1.3.14",
    "typescript": "^5.5.0"
  }
}
