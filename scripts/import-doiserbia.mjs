import fs from "node:fs";
import path from "node:path";

const [yearArg, volumeArg, issueArg, issueIdArg] = process.argv.slice(2);

if (!yearArg || !volumeArg || !issueArg || !issueIdArg) {
  console.error(
    "Upotreba: node scripts/import-doiserbia.mjs YEAR VOLUME ISSUE DOI_SERBIA_ISSUE_ID"
  );
  process.exit(1);
}

const year = Number(yearArg);
const volume = Number(volumeArg);
const issueNumber = String(issueArg);

const api = new URL("https://api.crossref.org/journals/0351-2274/works");
api.searchParams.set(
  "filter",
  `from-pub-date:${year}-01-01,until-pub-date:${year}-12-31`
);
api.searchParams.set("rows", "200");

const response = await fetch(api);

if (!response.ok) {
  throw new Error(`Crossref HTTP ${response.status}`);
}

const json = await response.json();

const works = (json.message?.items ?? [])
  .filter(
    (work) =>
      String(work.volume ?? "") === String(volume) &&
      String(work.issue ?? "") === issueNumber
  )
  .sort((a, b) => {
    const pa = Number(String(a.page ?? "").match(/\d+/)?.[0] ?? 999999);
    const pb = Number(String(b.page ?? "").match(/\d+/)?.[0] ?? 999999);
    return pa - pb;
  });

if (!works.length) {
  console.error(`Nema radova za ${volume}(${issueNumber}), ${year}.`);
  process.exit(1);
}

const articles = works.map((work) => ({
  authors: (work.author ?? [])
    .map((a) => [a.given, a.family].filter(Boolean).join(" "))
    .filter(Boolean),
  title: work.title?.[0] ?? "Naslov nije dostupan",
  pages: String(work.page ?? "").replaceAll("-", "–"),
  doi: work.DOI ? `https://doi.org/${work.DOI}` : null,
}));

const slug = `${year}-${issueNumber.padStart(2, "0")}`;
const variableName = `issue${year}_${issueNumber.padStart(2, "0")}`;

const data = {
  year,
  volume,
  number: Number(issueNumber),
  label: `${volume}(${issueNumber}), ${year}`,
  source: `https://doiserbia.nb.rs/issue.aspx?issueid=${issueIdArg}`,
  sections: [
    {
      title: "Članci",
      articles,
    },
  ],
};

const destination = path.join(
  process.cwd(),
  "src",
  "data",
  "issues",
  `${slug}.ts`
);

fs.writeFileSync(
  destination,
  `export const ${variableName} = ${JSON.stringify(data, null, 2)} as const;\n`,
  "utf8"
);

console.log(`✓ ${works.length} radova → ${destination}`);
