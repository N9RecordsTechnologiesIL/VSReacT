// Inline src/assets/ + bundle src/main.tsx. The recipe is shared across the
// examples — see vsreact/js/src/tools/buildExampleUi.ts.
import { buildExampleUi } from "../../../js/src/tools/buildExampleUi";

await buildExampleUi(import.meta.dir);
