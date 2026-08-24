type IssueLike = {
  year: number;
  volume: number;
  number: number | string;
  label: string;
  pdf?: string;
  source?: string;
  sections: readonly unknown[];
  editorial?: unknown;
};

const modules = import.meta.glob("./20*.ts", {
  eager: true,
}) as Record<string, Record<string, unknown>>;

function isIssue(value: unknown): value is IssueLike {
  return (
    typeof value === "object" &&
    value !== null &&
    "year" in value &&
    "volume" in value &&
    "number" in value &&
    "label" in value &&
    "sections" in value
  );
}

function issueOrder(number: number | string) {
  return Number(String(number).split("-")[0]);
}

export const issues = Object.entries(modules)
  .map(([path, module]) => {
    const issue = Object.values(module).find(isIssue);

    if (!issue) {
      throw new Error(`Nije pronađen issue objekat u ${path}`);
    }

    const slug = path.split("/").pop()!.replace(/\.ts$/, "");

    return {
      ...issue,
      slug,
    };
  })
  .sort(
    (a, b) =>
      b.year - a.year ||
      issueOrder(b.number) - issueOrder(a.number),
  );