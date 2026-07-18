# Harness constraints

- **Never emit one giant Write.** In this environment, single responses that generate a very large file (e.g. a full `site/app/components/page.tsx` rebuild) hang the API request and the chat never responds. Write large files incrementally: create the file with its first section via Write, then append/extend section-by-section (one component family per Edit), keeping each tool call under ~300 lines.
- If a "continue" task implies regenerating a big file wholesale, break it into a checklist of sections first and do one section per turn.
