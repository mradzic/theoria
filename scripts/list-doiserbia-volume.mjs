const [volume] = process.argv.slice(2);

if (!volume) {
  console.error("Upotreba: node scripts/list-doiserbia-volume.mjs VOLUME");
  process.exit(1);
}

const response = await fetch(
  "https://doiserbia.nb.rs/issue.aspx?issueid=2017"
);

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
    /<a\b[^>]*href=["'][^"']*issue\.aspx\?issueid=(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi
  ),
];

const rows = anchors
  .map(([, id, text]) => ({
    id,
    label: stripTags(text),
  }))
  .filter((x) =>
    x.label.toLowerCase().startsWith(`volume ${volume} `)
  );

if (!rows.length) {
  console.log(`Nema zapisa za Volume ${volume}`);
  process.exit(0);
}

for (const row of rows) {
  console.log(`${row.id}\t${row.label}`);
}
