// Shared build recipe — inlines src/assets (none here) and bundles with the
// source map prepended, so error stacks name src/main.tsx lines.
import { buildExampleUi } from "../../../js/src/tools/buildExampleUi";

await buildExampleUi(import.meta.dir);
