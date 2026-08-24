const [volume, issue] = process.argv.slice(2);

if (!volume || !issue) {
  console.error("Upotreba: node scripts/find-doiserbia-id.mjs VOLUME ISSUE");
  process.exit(1);
}

const url = "https://doiserbia.nb.rs/issue.aspx?issueid=2017";
const response = await fetch(url);

if (!response.ok) {
  throw new Error(`DOI Serbia HTTP ${response.status}`);
}

const html = await response.text();

const stripTags = (s) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const anchors = [
  ...html.matchAll(
    /<a\b[^>]*href=["'][^"']*issue\.aspx\?issueid=(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi,
  ),
];

const wanted = `Volume ${volume} Issue ${issue}`.toLowerCase();

const match = anchors.find(
  ([, , text]) => stripTags(text).toLowerCase() === wanted,
);

if (!match) {
  console.error(`Nije pronađeno: Volume ${volume} Issue ${issue}`);
  process.exit(1);
}

console.log(match[1]);
