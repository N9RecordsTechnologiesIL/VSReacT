// cx — compose conditional className strings (a tiny clsx).

export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[]
  | Record<string, unknown>;

/**
 * `cx("flex", active && "bg-red-500", { "opacity-40": disabled })`
 * → `"flex bg-red-500 opacity-40"`.
 */
export function cx(...inputs: ClassValue[]): string {
  const out: string[] = [];

  for (const input of inputs) {
    if (!input && input !== 0) continue;

    if (typeof input === "string" || typeof input === "number") {
      out.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cx(...input);
      if (nested) out.push(nested);
    } else if (typeof input === "object") {
      for (const [key, value] of Object.entries(input)) if (value) out.push(key);
    }
  }

  return out.join(" ");
}
