import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");
const BASE = "/theoria/";

let errors = 0;
let warnings = 0;
let checks = 0;

function ok(message) {
	checks++;
	console.log(`✓ ${message}`);
}

function fail(message) {
	checks++;
	errors++;
	console.error(`✗ ${message}`);
}

function warn(message) {
	warnings++;
	console.warn(`! ${message}`);
}

function exists(relativePath) {
	return fs.existsSync(path.join(DIST, relativePath));
}

function read(relativePath) {
	return fs.readFileSync(path.join(DIST, relativePath), "utf8");
}

function htmlFiles(dir = DIST) {
	const result = [];

	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);

		if (entry.isDirectory()) {
			result.push(...htmlFiles(full));
		} else if (entry.name.endsWith(".html")) {
			result.push(full);
		}
	}

	return result;
}

function relativeToDist(file) {
	return path.relative(DIST, file);
}

function routeToFile(urlPath) {
	let pathname = urlPath;

	try {
		pathname = new URL(urlPath, "https://example.test").pathname;
	} catch {
		return null;
	}

	if (!pathname.startsWith(BASE)) {
		return null;
	}

	let relative = pathname.slice(BASE.length);

	if (relative === "") {
		return "index.html";
	}

	if (relative.endsWith("/")) {
		return path.join(relative, "index.html");
	}

	const ext = path.extname(relative);

	if (ext) {
		return relative;
	}

	return path.join(relative, "index.html");
}

function getHrefValues(html) {
	return [
		...html.matchAll(/\bhref=["']([^"']+)["']/gi),
	].map((match) => match[1]);
}

function hasPattern(html, regex) {
	return regex.test(html);
}

console.log("\n=== THEORIA SITE QA ===\n");

if (!fs.existsSync(DIST)) {
	console.error("✗ dist/ ne postoji. Prvo pokreni: npm run build");
	process.exit(1);
}

/*
 * 1. Obavezne stranice
 */

console.log("1. Osnovne stranice");

const requiredPages = [
	"index.html",
	"aktuelni-broj/index.html",
	"arhiva/index.html",
	"o-casopisu/index.html",
	"uputstvo-autorima/index.html",

	"en/index.html",
	"en/current-issue/index.html",
	"en/archive/index.html",
	"en/about/index.html",
	"en/for-authors/index.html",
];

for (const page of requiredPages) {
	if (exists(page)) {
		ok(page);
	} else {
		fail(`Nedostaje ${page}`);
	}
}

/*
 * 2. Assets
 */

console.log("\n2. Vizuelni assets");

const requiredAssets = [
	"favicon.svg",
	"favicon.ico",
	"favicon-96x96.png",
	"apple-touch-icon.png",
	"site.webmanifest",
	"web-app-manifest-192x192.png",
	"web-app-manifest-512x512.png",
	"theoria_og_1200x630.png",
];

for (const asset of requiredAssets) {
	if (exists(asset)) {
		ok(asset);
	} else {
		fail(`Nedostaje asset: ${asset}`);
	}
}

/*
 * 3. SR / EN individual issue pairs
 */

console.log("\n3. SR / EN parovi brojeva");

const srIssuesDir = path.join(DIST, "brojevi");
const enIssuesDir = path.join(DIST, "en", "issues");

const srSlugs = fs.existsSync(srIssuesDir)
	? fs.readdirSync(srIssuesDir, { withFileTypes: true })
			.filter((x) => x.isDirectory())
			.map((x) => x.name)
			.sort()
	: [];

const enSlugs = fs.existsSync(enIssuesDir)
	? fs.readdirSync(enIssuesDir, { withFileTypes: true })
			.filter((x) => x.isDirectory())
			.map((x) => x.name)
			.sort()
	: [];

if (srSlugs.length === 0) {
	fail("Nijedan srpski broj nije generisan");
} else {
	ok(`${srSlugs.length} srpskih issue ruta`);
}

if (enSlugs.length === 0) {
	fail("Nijedan engleski broj nije generisan");
} else {
	ok(`${enSlugs.length} engleskih issue ruta`);
}

for (const slug of srSlugs) {
	if (!enSlugs.includes(slug)) {
		fail(`Nema EN para za ${slug}`);
	}
}

for (const slug of enSlugs) {
	if (!srSlugs.includes(slug)) {
		fail(`Nema SR para za ${slug}`);
	}
}

if (
	srSlugs.length === enSlugs.length &&
	srSlugs.every((slug, i) => slug === enSlugs[i])
) {
	ok("Svi individualni brojevi imaju SR i EN verziju");
}

/*
 * 4. Istorijski spojeni brojevi
 */

console.log("\n4. Istorijski spojeni brojevi");

const combinedIssues = [
	"2002-01-04",
	"2003-01-04",
	"2004-01-02",
	"2004-03-04",
	"2005-01-02",
	"2005-03-04",
	"2006-01-02",
];

for (const slug of combinedIssues) {
	const sr = `brojevi/${slug}/index.html`;
	const en = `en/issues/${slug}/index.html`;

	if (exists(sr) && exists(en)) {
		ok(`${slug} SR + EN`);
	} else {
		fail(
			`${slug}: SR=${exists(sr) ? "da" : "NE"}, EN=${
				exists(en) ? "da" : "NE"
			}`,
		);
	}
}

/*
 * 5. Metadata na svim HTML stranama
 */

console.log("\n5. Metadata");

const pages = htmlFiles();

let metadataFailures = 0;

for (const file of pages) {
	const html = fs.readFileSync(file, "utf8");
	const name = relativeToDist(file);

	const required = [
		["title", /<title>.+?<\/title>/is],
		[
			"description",
			/<meta[^>]+name=["']description["'][^>]+content=["'][^"']+["'][^>]*>/i,
		],
		[
			"canonical",
			/<link[^>]+rel=["']canonical["'][^>]+href=["'][^"']+["'][^>]*>/i,
		],
		[
			"og:title",
			/<meta[^>]+property=["']og:title["'][^>]+content=["'][^"']+["'][^>]*>/i,
		],
		[
			"og:description",
			/<meta[^>]+property=["']og:description["'][^>]+content=["'][^"']+["'][^>]*>/i,
		],
		[
			"og:image",
			/<meta[^>]+property=["']og:image["'][^>]+content=["'][^"']+["'][^>]*>/i,
		],
	];

	for (const [label, regex] of required) {
		if (!hasPattern(html, regex)) {
			metadataFailures++;
			fail(`${name}: nema ${label}`);
		}
	}

	if (!/<html[^>]+lang=["'](?:sr|en)["']/i.test(html)) {
		metadataFailures++;
		fail(`${name}: nema ispravan html lang`);
	}
}

if (metadataFailures === 0) {
	ok(`Metadata prisutna na svih ${pages.length} HTML stranica`);
}

/*
 * 6. Interni linkovi
 */

console.log("\n6. Interni linkovi");

const brokenLinks = new Map();

for (const file of pages) {
	const html = fs.readFileSync(file, "utf8");
	const source = relativeToDist(file);

	for (const href of getHrefValues(html)) {
		if (
			href.startsWith("mailto:") ||
			href.startsWith("tel:") ||
			href.startsWith("#") ||
			href.startsWith("javascript:")
		) {
			continue;
		}

		if (
			href.startsWith("http://") ||
			href.startsWith("https://")
		) {
			continue;
		}

		if (!href.startsWith(BASE)) {
			continue;
		}

		const target = routeToFile(href);

		if (!target) continue;

		const cleanTarget = target.split("?")[0].split("#")[0];

		if (!exists(cleanTarget)) {
			const key = `${href} -> ${cleanTarget}`;

			if (!brokenLinks.has(key)) {
				brokenLinks.set(key, []);
			}

			brokenLinks.get(key).push(source);
		}
	}
}

if (brokenLinks.size === 0) {
	ok("Nema pokvarenih internih linkova");
} else {
	for (const [target, sources] of brokenLinks) {
		fail(`BROKEN ${target}`);
		console.error(
			`  pojavljuje se u: ${sources.slice(0, 5).join(", ")}`,
		);
	}
}

/*
 * 7. SR ↔ EN language switch
 */

console.log("\n7. SR ↔ EN prekidač");

const staticPairs = [
	["index.html", "en/index.html"],
	[
		"aktuelni-broj/index.html",
		"en/current-issue/index.html",
	],
	["arhiva/index.html", "en/archive/index.html"],
	["o-casopisu/index.html", "en/about/index.html"],
	[
		"uputstvo-autorima/index.html",
		"en/for-authors/index.html",
	],
];

function languageHref(html) {
	const match = html.match(
		/<a[^>]*class=["'][^"']*\blanguage\b[^"']*["'][^>]*href=["']([^"']+)["']/i,
	);

	if (match) return match[1];

	const reversed = html.match(
		/<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*\blanguage\b[^"']*["']/i,
	);

	return reversed?.[1] ?? null;
}

for (const [srFile, enFile] of staticPairs) {
	if (!exists(srFile) || !exists(enFile)) continue;

	const srHref = languageHref(read(srFile));
	const enHref = languageHref(read(enFile));

	const expectedSrToEn =
		BASE + path.dirname(enFile).replaceAll("\\", "/") + "/";

	const srDir = path.dirname(srFile).replaceAll("\\", "/");

	const expectedEnToSr =
		srFile === "index.html"
			? BASE
			: BASE + srDir + "/";

	if (srHref === expectedSrToEn) {
		ok(`${srFile} → EN`);
	} else {
		fail(
			`${srFile}: language href "${srHref}", očekivano "${expectedSrToEn}"`,
		);
	}

	if (enHref === expectedEnToSr) {
		ok(`${enFile} → SR`);
	} else {
		fail(
			`${enFile}: language href "${enHref}", očekivano "${expectedEnToSr}"`,
		);
	}
}

for (const slug of srSlugs) {
	const srFile = `brojevi/${slug}/index.html`;
	const enFile = `en/issues/${slug}/index.html`;

	if (!exists(srFile) || !exists(enFile)) continue;

	const srHref = languageHref(read(srFile));
	const enHref = languageHref(read(enFile));

	const expectedSr =
		`${BASE}en/issues/${slug}/`;

	const expectedEn =
		`${BASE}brojevi/${slug}/`;

	if (srHref !== expectedSr) {
		fail(
			`${slug}: SR→EN je "${srHref}", očekivano "${expectedSr}"`,
		);
	}

	if (enHref !== expectedEn) {
		fail(
			`${slug}: EN→SR je "${enHref}", očekivano "${expectedEn}"`,
		);
	}
}

if (errors === 0) {
	ok("SR ↔ EN issue prekidači su konzistentni");
}

/*
 * 8. English UI leakage
 */

console.log("\n8. Engleski interfejs");

let englishLeak = 0;

for (const slug of enSlugs) {
	const file = `en/issues/${slug}/index.html`;

	if (!exists(file)) continue;

	const html = read(file);

	if (
		/>ČLANCI</i.test(html) ||
		/>Članci</i.test(html)
	) {
		englishLeak++;
		fail(`${slug}: engleska stranica još sadrži "ČLANCI"`);
	}
}

if (englishLeak === 0) {
	ok('Na EN issue stranicama nema generičkog naslova "ČLANCI"');
}

/*
 * 9. Development URL leakage
 */

console.log("\n9. Development URL provera");

const badHosts = [
	"localhost:",
	"127.0.0.1:",
	".app.github.dev",
];

let leaked = 0;

for (const file of pages) {
	const html = fs.readFileSync(file, "utf8");

	for (const host of badHosts) {
		if (html.includes(host)) {
			leaked++;
			fail(`${relativeToDist(file)} sadrži ${host}`);
		}
	}
}

if (leaked === 0) {
	ok("Nema localhost/Codespaces URL-ova u buildu");
}

/*
 * Rezime
 */

console.log("\n=========================");
console.log(`Provera:     ${checks}`);
console.log(`Greške:      ${errors}`);
console.log(`Upozorenja:  ${warnings}`);
console.log(`HTML strane: ${pages.length}`);
console.log("=========================\n");

if (errors === 0) {
	console.log("✓ THEORIA QA PASSED\n");
	process.exit(0);
}

console.error("✗ THEORIA QA FAILED\n");
process.exit(1);
