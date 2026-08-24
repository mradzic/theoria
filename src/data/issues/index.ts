import { issue2026_02 } from "./2026-02";
import { issue2026_01 } from "./2026-01";
import { issue2025_04 } from "./2025-04";

export const issues = [
  {
    ...issue2026_02,
    slug: "2026-02",
  },
  {
    ...issue2026_01,
    slug: "2026-01",
  },
  {
    ...issue2025_04,
    slug: "2025-04",
  },
] as const;