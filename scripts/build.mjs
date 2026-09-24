// Finance Family static build. Usage: node scripts/build.mjs [--serve]
// Renders src/pages + src/templates with content/*.json into wwwroot/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "wwwroot");
const CONTENT = path.join(ROOT, "content");
const read = (p) => fs.readFileSync(p, "utf8");
const json = (n) => JSON.parse(read(path.join(CONTENT, n + ".json")));

const site = json("site");
const services = json("services");
const rates = json("rates");
const glossary = json("glossary");
const posts = json("posts").sort((a, b) => (a.date < b.date ? 1 : -1));
const build = { version: Date.now().toString(36), year: new Date().getFullYear(), today: new Date().toISOString().slice(0, 10) };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attr = esc;
const heDate = (iso) => { const [y, m, d] = iso.split("-"); return `${d}.${m}.${y}`; };
const fmtPct = (n) => n.toFixed(2).replace(/\.?0+$/, (m) => (m === ".00" ? "" : m)) + "%";
const pct2 = (n) => n.toFixed(2) + "%";

/* ---------- icons ---------- */
const icons = {};
for (const f of fs.readdirSync(path.join(SRC, "icons"))) {
  if (!f.endsWith(".svg")) continue;
  const svg = read(path.join(SRC, "icons", f)).replace(/<\?xml[^>]*>/, "").replace(/<!--[\s\S]*?-->/g, "").trim();
  icons[f.replace(".svg", "")] = svg.replace("<svg", '<svg class="icon" aria-hidden="true" focusable="false"');
}
const icon = (n) => { if (!icons[n]) throw new Error("missing icon " + n); return icons[n]; };

/* ---------- partials ---------- */
const partials = {};
for (const f of fs.readdirSync(path.join(SRC, "partials"))) partials[f.replace(".html", "")] = read(path.join(SRC, "partials", f));

/* ---------- block generators ---------- */
const accentChip = { blue: "chip-blue", teal: "chip-teal", green: "chip-green", amber: "chip-amber", coral: "chip-coral" };
const needIcon = { new: "house-line", refinance: "arrows-clockwise", any: "coins", reverse: "user-circle", family: "chart-line-up" };

const blocks = {
  "nav-links": () => site.nav.map((n) => `<a href="${n.href}">${n.label}</a>`).join("\n"),
  "nav-demo": () => site.nav.map((n, i) => `<a href="#" ${i === 2 ? 'aria-current="page"' : ""} onclick="return false">${n.label}</a>`).join(""),
  "mobile-nav-links": () => site.nav.map((n) => `<a href="${n.href}">${n.label} ${icon("caret-left")}</a>`).join("\n"),
  "consent": () => {
    if (!site.tracking.enabled) return "";
    return `<div class="consent" role="region" aria-label="הסכמה לעוגיות" data-open="false" data-settings="false">
  <p>האתר משתמש בעוגיות ובכלי מדידה כדי לשפר את השירות. אפשר לאשר, לדחות עוגיות שאינן חיוניות או לבחור בהגדרות. <a href="/privacy-policy/">מדיניות הפרטיות</a></p>
  <div class="btn-row"><button class="btn btn-sm" type="button" data-consent-accept>אישור</button><button class="btn btn-sm btn-secondary" type="button" data-consent-settings>הגדרות</button><button class="btn btn-sm btn-secondary" type="button" data-consent-reject>דחיית עוגיות שאינן חיוניות</button></div>
  <div class="consent-settings">
    <label class="check"><input type="checkbox" name="consent" value="analytics" checked> <span>מדידה וסטטיסטיקה (אנליטיקס)</span></label>
    <label class="check"><input type="checkbox" name="consent" value="marketing"> <span>שיווק ופרסום (פיקסלים)</span></label>
    <button class="btn btn-sm" type="button" data-consent-save>שמירת הבחירה</button>
  </div>
</div>`;
  },
  "trust": () => services.trust.map((t, i) => `<div class="trust-item">${icon(["seal-check", "medal", "bank", "handshake"][i])}<div><b>${t.title}</b><span>${t.text}</span></div></div>`).join("\n"),
  "needs-tabs": () => services.needs.map((n, i) => `<button class="needs-tab" role="tab" id="need-tab-${n.key}" aria-controls="need-${n.key}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-accent="${n.accent}" type="button"><span class="icon-tile">${icon(needIcon[n.key])}</span><span><b>${n.label}</b><span>${n.short}</span></span>${icon("caret-left").replace('class="icon"', 'class="icon caret"')}</button>`).join("\n"),
  "needs-panels": () => services.needs.map((n, i) => `<div class="needs-panel" role="tabpanel" id="need-${n.key}" aria-labelledby="need-tab-${n.key}" data-accent="${n.accent}" ${i === 0 ? "" : "hidden"}>
  <span class="chip">${n.label}</span>
  <h3>${n.title}</h3>
  <p>${n.text}</p>
  <ul class="needs-points">${n.points.map((p) => `<li>${icon("check")}<span>${p}</span></li>`).join("")}</ul>
  <div class="btn-row"><a class="btn" href="/contact/?topic=${n.key}">${site.cta}</a><a class="link-arrow" href="${n.href}">לפרטים על ${n.label} ${icon("arrow-left")}</a></div>
</div>`).join("\n"),
  "values": () => services.values.map((v, i) => `<div class="value-item"><div class="n num">0${i + 1}</div><div><h3>${v.title}</h3><p>${v.text}</p></div></div>`).join("\n"),
  "process-steps": () => services.process.map((s) => `<div class="step"><div class="n num">${s.n}</div><h3>${s.title}</h3><p>${s.text}</p></div>`).join("\n"),
  "faq": () => services.faq.map((f) => `<details><summary>${f.q} ${icon("plus")}</summary><div class="answer">${f.a}</div></details>`).join("\n"),
  "faq-jsonld": () => JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: services.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }),
  "services-blocks": () => services.needs.map((n) => `<section class="service-block" id="${n.key}" aria-labelledby="svc-${n.key}">
  <div class="side"><span class="icon-tile ${n.accent}">${icon(needIcon[n.key])}</span><div><h2 id="svc-${n.key}">${n.label}</h2><span>${n.short}</span></div></div>
  <div><h3 class="mb-2">${n.title}</h3><p>${n.text}</p><ul class="needs-points" style="--acc:var(--blue-600)">${n.points.map((p) => `<li>${icon("check")}<span>${p}</span></li>`).join("")}</ul><div class="btn-row mt-3"><a class="btn btn-secondary" href="/contact/?topic=${n.key}">${site.cta}</a></div></div>
</section>`).join("\n"),
  "services-more": () => services.more.map((m) => `<div class="card card-hover" id="${m.key}"><h3>${m.label}</h3><p>${m.text}</p></div>`).join("\n"),
  "team-lead": () => { const t = services.team[0]; return teamLead(t); },
  "team-grid": () => services.team.slice(1).map((t) => `<div class="team-card"><div class="portrait sm"><img src="${t.image}" alt="${t.name}" loading="lazy" width="300" height="400"></div><div><h3>${t.name}</h3><div class="role">${t.role}</div><p>${t.bio}</p></div></div>`).join("\n"),
  "fin-tiles": finTiles,
  "fin-tiles-compact": () => finTiles(true),
  "cpi-chart": cpiChart,
  "cpi-lines": () => indexLines("cpi"),
  "construction-lines": () => indexLines("construction"),
  "rate-tables": rateTables,
  "rate-preview": ratePreview,
  "rates-updated": () => heDate(rates.updated),
  "boi-rate": () => pct2(rates.boi.rate),
  "prime-rate": () => pct2(rates.prime.rate),
  "cpi-12": () => fmtPct(rates.indices[0].last12),
  "knowledge-featured": () => featured(posts[0]),
  "knowledge-list": () => posts.slice(1, 6).map(postRow).join("\n"),
  "articles-all": () => posts.map(articleCard).join("\n"),
  "articles-count": () => String(posts.length),
  "category-filters": () => { const cats = [...new Set(posts.map((p) => p.category))]; return `<button class="chip" type="button" data-filter="all" aria-pressed="true">הכל (${posts.length})</button>` + cats.map((c) => `<button class="chip" type="button" data-filter="${attr(c)}" aria-pressed="false">${c} (${posts.filter((p) => p.category === c).length})</button>`).join(""); },
  "glossary-list": () => glossary.map((g, i) => `<article class="term" id="term-${i + 1}"><h3>${esc(g.term)}</h3>${g.body.map((b) => `<p>${linkify(esc(b))}</p>`).join("")}</article>`).join("\n"),
  "glossary-count": () => String(glossary.length),
  "glossary-jsonld": () => JSON.stringify({ "@context": "https://schema.org", "@type": "DefinedTermSet", name: "מילון מונחי משכנתא", hasDefinedTerm: glossary.map((g) => ({ "@type": "DefinedTerm", name: g.term, description: g.body.join(" ") })) }),
  "hero-viz": heroViz,
  "latest-posts-3": () => posts.slice(0, 3).map(articleCard).join("\n"),
  "privacy-updated": () => heDate(site.legal.privacyUpdated),
  "accessibility-updated": () => heDate(site.legal.accessibilityUpdated),
  "marketing-consent": () => site.form.marketingConsent ? `<label class="check"><input type="checkbox" name="marketing" value="כן"> <span>אני מאשר/ת קבלת עדכונים ותכנים שיווקיים ממשפחה פיננסית. אפשר להסיר את ההסכמה בכל עת.</span></label>` : `<!-- marketing consent component is off (content/site.json form.marketingConsent) -->`
};


const stepIcons = ["users-three", "chart-line-up", "target", "scales", "seal-check", "bank", "file-text", "handshake"];
const processBlocks = {
  "process-zigzag": () => services.process.map((s, i) => `<li class="zz-item ${i % 2 ? "zz-b" : "zz-a"}"><div class="zz-card"><div class="zz-top"><span class="icon-tile">${icon(stepIcons[i])}</span><span class="n num">${s.n}</span></div><h3>${s.title}</h3><p>${s.text}</p></div></li>`).join(""),
  "process-grid": () => services.process.map((s, i) => `<div class="pg-card pg-c${i}" style="--i:${i}" role="listitem"><div class="pg-num num" aria-hidden="true">${s.n}</div><span class="icon-tile">${icon(stepIcons[i])}</span><h3><span class="sr-only">שלב ${i + 1}: </span>${s.title}</h3><p>${s.text}</p></div>`).join(""),
  "process-list": () => services.process.map((s, i) => `<li class="pl-item"><div class="pl-marker"><span class="num">${s.n}</span></div><div class="pl-body"><h3>${s.title}</h3><p>${s.text}</p></div></li>`).join(""),
  "process-snap": () => services.process.map((s, i) => `<div class="ps-card"><span class="icon-tile">${icon(stepIcons[i])}</span><div class="ps-num num">${s.n}</div><h3>${s.title}</h3><p>${s.text}</p></div>`).join(""),
  "process-tabs": () => `<div class="pt-tabs" role="tablist" aria-label="שלבי התהליך">${services.process.map((s, i) => `<button class="pt-tab" role="tab" id="pt-tab-${i}" aria-controls="pt-panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" type="button"><span class="num">${s.n}</span><span>${s.title}</span></button>`).join("")}</div>${services.process.map((s, i) => `<div class="pt-panel" role="tabpanel" id="pt-panel-${i}" aria-labelledby="pt-tab-${i}" ${i ? "hidden" : ""}><div class="pt-visual"><span class="icon-tile">${icon(stepIcons[i])}</span><div class="pt-big num">${s.n}</div><div class="pt-of">מתוך 08</div></div><div><h3>${s.title}</h3><p>${s.text}</p><div class="pt-progress" aria-hidden="true">${services.process.map((x, j) => `<i class="${j <= i ? "on" : ""}"></i>`).join("")}</div></div></div>`).join("")}`
};
Object.assign(blocks, processBlocks);

function linkify(s) {
  return s.replace(/\[(https?:\/\/[^\]]+)\]/g, (m, u) => {
    let href = u; try { const d = decodeURIComponent(u.replace(/^https?:\/\/finance-family\.co\.il\//, "")).replace(/\/$/, ""); if (posts.some((p) => p.slug === d)) href = `/blog/${d}/`; } catch (e) {}
    return ` <a href="${attr(href)}">למדריך המלא</a>`;
  });
}

function teamLead(t) {
  return `<div class="team-lead">
  <div class="portrait reveal"><img src="${t.image}" alt="${t.name}" width="408" height="584" loading="lazy"></div>
  <div class="reveal">
    <blockquote>„${t.quote}“</blockquote>
    <h3>${t.name}</h3>
    <div class="role">${t.role}</div>
    <ul class="cred-list">${t.credentials.map((c) => `<li>${icon("seal-check")}${c}</li>`).join("")}</ul>
    <p class="maxw">${t.bio}</p>
    ${t.bioMore ? `<details class="more"><summary>הסיפור המלא ${icon("caret-down")}</summary><p class="maxw">${t.bioMore}</p></details>` : ""}
  </div>
</div>`;
}

function trend(delta, label, dark) {
  const up = delta > 0;
  return `<span class="fin-trend ${up ? "up" : ""}">${icon(up ? "trend-up" : "trend-down")}${label}</span>`;
}

function finTiles(compact) {
  const cpi = rates.indices[0], con = rates.indices[1];
  const k = rates.tracks.find((t) => t.key === "kalatz");
  const kmin = Math.min(...k.rows.flat().map((r) => r.min)), kmax = Math.max(...k.rows.flat().map((r) => r.max));
  const tiles = [
    `<div class="fin-tile dark"><div class="fin-label">ריבית בנק ישראל ${trend(-1, "ירידה")}</div><div class="fin-value num">${rates.boi.rate.toFixed(2)}<small>%</small></div><div class="fin-sub">בתוקף מ-${heDate(rates.boi.effective)}. ${rates.boi.note}.</div></div>`,
    `<div class="fin-tile"><div class="fin-label">ריבית הפריים</div><div class="fin-value num">${rates.prime.rate.toFixed(2)}<small>%</small></div><div class="fin-sub">${rates.prime.note}</div></div>`,
    `<div class="fin-tile"><div class="fin-label">${cpi.name}</div><div class="fin-value num">${cpi.last12.toFixed(1)}<small>%</small></div><div class="fin-mini"><div><b class="num">${cpi.ytd.toFixed(1)}%</b><span>מצטבר ${build.year}</span></div><div><b class="num">${cpi.lastMonth.value.toFixed(1)}%</b><span>${cpi.lastMonth.label}</span></div><div><b class="num">1-3%</b><span>יעד האינפלציה</span></div></div><div class="fin-sub">שינוי ב-12 החודשים האחרונים</div></div>`,
    `<div class="fin-tile"><div class="fin-label">${con.name}</div><div class="fin-value num">${con.last12.toFixed(1)}<small>%</small></div><div class="fin-mini"><div><b class="num">${con.ytd.toFixed(1)}%</b><span>מצטבר ${build.year}</span></div><div><b class="num">${con.lastMonth.value.toFixed(1)}%</b><span>${con.lastMonth.label}</span></div></div><div class="fin-sub">שינוי ב-12 החודשים האחרונים</div></div>`,
    `<div class="fin-tile accent"><div class="fin-label">קל"צ, טווח ריביות בשוק</div><div class="fin-value num"><span class="ltr">${kmin.toFixed(2)}% - ${kmax.toFixed(2)}%</span></div><div class="fin-sub">ריבית קבועה לא צמודה, לפי אחוז מימון ותקופה. עודכן ${heDate(rates.updated)}</div></div>`
  ];
  if (compact) return tiles.slice(0, 4).join("\n");
  return tiles.join("\n");
}

function cpiChart() {
  // monthly CPI change, last 24 months available, real data from content/rates.json
  const years = Object.keys(rates.cpiMonthly.series).sort();
  const pts = [];
  for (const y of years) rates.cpiMonthly.series[y].forEach((v, i) => pts.push({ y, m: i, v }));
  const last = pts.slice(-24);
  const W = 720, H = 220, padL = 34, padR = 8, padT = 14, padB = 30;
  const max = 1.3, min = -0.7;
  const yOf = (v) => padT + (max - v) / (max - min) * (H - padT - padB);
  const zero = yOf(0);
  const bw = (W - padL - padR) / last.length;
  let bars = "", labels = "";
  last.forEach((p, i) => {
    const x = padL + i * bw + bw * 0.2, w = bw * 0.6;
    const y = p.v >= 0 ? yOf(p.v) : zero, h = Math.max(1, Math.abs(yOf(p.v) - zero));
    bars += `<rect class="bar ${p.v >= 0 ? "bar-pos" : "bar-neg"}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2" style="animation-delay:${(i * 30)}ms"><title>${rates.cpiMonthly.months[p.m]} ${p.y}: ${p.v}%</title></rect>`;
    if (p.m === 0 || i === 0) labels += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${p.y}</text>`;
    else if (p.m % 3 === 0) labels += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${rates.cpiMonthly.months[p.m]}</text>`;
  });
  let gridl = "";
  for (const g of [1, 0.5, 0, -0.5]) gridl += `<line class="${g === 0 ? "axis" : "grid-line"}" x1="${padL}" x2="${W - padR}" y1="${yOf(g).toFixed(1)}" y2="${yOf(g).toFixed(1)}"/><text x="${padL - 6}" y="${(yOf(g) + 4).toFixed(1)}" text-anchor="end">${g}%</text>`;
  const rows = last.map((p) => `<tr><td>${rates.cpiMonthly.months[p.m]} ${p.y}</td><td class="num">${p.v}%</td></tr>`).join("");
  const desc = `שינוי חודשי במדד המחירים לצרכן, ${last[0].y} עד ${last[last.length - 1].y}. ערכים חיוביים בטורקיז, שליליים בכתום.`;
  return `<div class="chart" aria-hidden="false">
<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${attr(desc)}" direction="ltr">${gridl}${bars}${labels}</svg>
<div class="chart-legend"><span><i style="background:var(--teal)"></i>עלייה חודשית</span><span><i style="background:var(--coral)"></i>ירידה חודשית</span></div>
<details class="more mt-2"><summary>הנתונים בטבלה ${icon("caret-down")}</summary><div class="table-wrap mt-2"><table class="rate-table"><thead><tr><th>חודש</th><th class="num">שינוי</th></tr></thead><tbody>${rows}</tbody></table></div></details>
</div>`;
}


function indexLines(key) {
  // classic year-over-year line chart, one line per year, real data from content/rates.json
  const idx = rates.indices.find((i) => i.key === key);
  const src = key === "cpi" ? rates.cpiMonthly : rates.constructionMonthly;
  const monthsFull = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
  const years = Object.keys(src.series).sort();
  const palette = { "2022": "#93a3bd", "2023": "#ffc857", "2024": "#10a058", "2025": "#10c8b8", "2026": "#2457f5" };
  const all = years.flatMap((y) => src.series[y]);
  const step = 0.5;
  const max = Math.ceil(Math.max(...all) / step) * step, min = Math.floor(Math.min(...all) / step) * step;
  const W = 1000, H = 380, padL = 52, padR = 16, padT = 16, padB = 38;
  const x = (m) => padL + (m / 11) * (W - padL - padR);
  const y = (v) => padT + (max - v) / (max - min) * (H - padT - padB);
  let grid = "";
  for (let g = min; g <= max + 1e-9; g += step) grid += `<line class="${Math.abs(g) < 1e-9 ? "axis" : "grid-line"}" x1="${padL}" x2="${W - padR}" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}"/><text x="${padL - 8}" y="${(y(g) + 4).toFixed(1)}" text-anchor="end">${g.toFixed(1)}%</text>`;
  let labels = "";
  src.months.forEach((m, i) => { labels += `<text x="${x(i).toFixed(1)}" y="${H - 10}" text-anchor="middle">${m}</text>`; });
  let lines = "", dots = "";
  years.forEach((yr, yi) => {
    const d = src.series[yr];
    const path = d.map((v, i) => (i === 0 ? "M" : "L") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join("");
    const cur = yr === years[years.length - 1];
    lines += `<path class="line" data-year="${yr}" d="${path}" fill="none" stroke="${palette[yr] || "#5f6e86"}" stroke-width="${cur ? 3.5 : 2}" stroke-linejoin="round" stroke-linecap="round" style="animation-delay:${yi * 120}ms" opacity="${cur ? 1 : 0.85}"/>`;
    d.forEach((v, i) => { dots += `<circle class="dot" data-year="${yr}" data-month="${i}" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="${cur ? 4 : 3}" fill="${palette[yr] || "#5f6e86"}"><title>${monthsFull[i]} ${yr}: ${v}%</title></circle>`; });
  });
  const legend = years.slice().reverse().map((yr) => `<button type="button" class="legend-btn" data-year="${yr}" aria-pressed="true" style="--c:${palette[yr]}"><i></i>${yr}</button>`).join("") + `<button type="button" class="legend-btn legend-all" data-all>הכל</button>`;
  const dataJson = JSON.stringify({ months: monthsFull, years, series: src.series, palette, x: years.length ? src.months.map((m, i) => +x(i).toFixed(1)) : [], padT, plotH: H - padB, W, H }).replace(/</g, "\\u003c");
  const rows = src.months.map((m, i) => `<tr><td>${monthsFull[i]}</td>${years.map((yr) => `<td class="num">${src.series[yr][i] === undefined ? "" : src.series[yr][i] + "%"}</td>`).join("")}</tr>`).join("");
  const desc = `שינוי חודשי ב${idx.name}, לפי שנה, ${years[0]} עד ${years[years.length - 1]}. השנה הנוכחית מודגשת.`;
  return `<div class="index-block">
  <h3>${idx.name}</h3>
  <div class="chart chart-lines" data-line-chart>
    <div class="chart-scroll"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${attr(desc)}" direction="ltr" tabindex="0">${grid}<line class="crosshair" x1="0" x2="0" y1="${padT}" y2="${H - padB}" style="display:none"/>${lines}${dots}${labels}</svg><div class="chart-tip" role="status" aria-live="polite" hidden></div></div>
    <script type="application/json" class="chart-data">${dataJson}</script>
    <div class="chart-legend chart-legend-buttons" aria-label="בחירת שנים להצגה">${legend}</div>
  </div>
  <table class="summary-table"><tbody>
    <tr><th>12 חודשים אחרונים</th><td class="num">${idx.last12.toFixed(2)}%</td></tr>
    <tr><th>מצטבר ${years[years.length - 1]}</th><td class="num">${idx.ytd.toFixed(2)}%</td></tr>
    <tr><th>מדד חודש ${idx.lastMonth.label}</th><td class="num">${idx.lastMonth.value.toFixed(2)}%</td></tr>
  </tbody></table>
  <details class="more"><summary>הנתונים החודשיים בטבלה ${icon("caret-down")}</summary><div class="table-wrap mt-2"><table class="rate-table"><thead><tr><th>חודש</th>${years.map((yr) => `<th class="num">${yr}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></details>
</div>`;
}

function rateTables() {
  const tabs = rates.tracks.map((t, i) => `<button class="rate-tab" role="tab" id="rt-tab-${t.key}" aria-controls="rt-${t.key}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" type="button">${t.short}</button>`).join("");
  const panels = rates.tracks.map((t, i) => `<div role="tabpanel" id="rt-${t.key}" aria-labelledby="rt-tab-${t.key}" ${i === 0 ? "" : "hidden"}>
<div class="table-wrap"><table class="rate-table"><caption>${esc(t.name)}</caption><thead><tr><th>תקופה</th>${rates.ltvColumns.map((c) => `<th class="num">מימון ${c}</th>`).join("")}</tr></thead><tbody>${t.rows.map((row, ri) => `<tr><td>${rates.termRows[ri]}</td>${row.map((r) => `<td class="num range"><b>${r.min.toFixed(2)}%</b> - ${r.max.toFixed(2)}%</td>`).join("")}</tr>`).join("")}</tbody></table></div>
</div>`).join("");
  const zak = `<div class="table-wrap mt-4"><table class="rate-table"><caption>${esc(rates.zakaut.label)}</caption><thead><tr><th>תקופה</th><th class="num">ריבית</th></tr></thead><tbody>${rates.zakaut.rows.map((r) => `<tr><td>${r[0]}</td><td class="num"><b>${r[1].toFixed(2)}%</b></td></tr>`).join("")}</tbody></table></div>`;
  return `<div data-tabs><div class="rate-tabs" role="tablist" aria-label="מסלולי ריבית">${tabs}</div>${panels}</div>${zak}`;
}

function ratePreview() {
  return `<div class="table-wrap"><table class="rate-table"><caption>טווחי ריבית לפי מסלול, מימון עד 45%, 16-20 שנים</caption><thead><tr><th>מסלול</th><th class="num">טווח ריבית</th><th>הצמדה</th></tr></thead><tbody>${rates.tracks.map((t) => { const r = t.rows[3][0]; return `<tr><td>${esc(t.name)}</td><td class="num range"><b>${r.min.toFixed(2)}%</b> - ${r.max.toFixed(2)}%</td><td>${t.indexed ? "צמוד מדד" : "לא צמוד"}</td></tr>`; }).join("")}</tbody></table></div>`;
}

function heroViz() {
  // illustrative example: 1,200,000 over 25 years at a blended 4.0% rate; not client data
  const P = 1200000, years = 25, n = years * 12, r = 0.04 / 12;
  const m = P * r / (1 - Math.pow(1 + r, -n));
  let bal = P; const balances = [P];
  for (let i = 1; i <= n; i++) { bal = bal * (1 + r) - m; balances.push(Math.max(0, bal)); }
  const W = 600, H = 170, padL = 6, padR = 6, padT = 10, padB = 22;
  const x = (i) => padL + (i / n) * (W - padL - padR), y = (v) => padT + (1 - v / P) * (H - padT - padB);
  let d = ""; for (let i = 0; i <= n; i += 6) d += (i === 0 ? "M" : "L") + x(i).toFixed(1) + " " + y(balances[i]).toFixed(1);
  d += "L" + x(n).toFixed(1) + " " + y(0).toFixed(1);
  const area = d + ` L${x(n).toFixed(1)} ${(H - padB).toFixed(1)} L${x(0).toFixed(1)} ${(H - padB).toFixed(1)} Z`;
  let ticks = ""; for (const yr of [0, 5, 10, 15, 20, 25]) ticks += `<text x="${x(yr * 12).toFixed(1)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="rgba(255,255,255,.55)">${yr === 0 ? "היום" : yr + " שנ'"}</text>`;
  // donut: thirds
  const C = 2 * Math.PI * 34;
  const segs = [{ c: "#2457f5", p: 33, l: "פריים" }, { c: "#10c8b8", p: 34, l: 'קל"צ' }, { c: "#c9f04b", p: 33, l: "משתנה" }];
  let off = 0, donut = "";
  for (const s of segs) { donut += `<circle class="donut-seg" r="34" cx="45" cy="45" stroke="${s.c}" stroke-dasharray="${(C * s.p / 100).toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 45 45)"/>`; off += C * s.p / 100; }
  // CPI mini bars (real, last 6 months)
  const cpiY = Object.keys(rates.cpiMonthly.series).sort(); const all = []; for (const yv of cpiY) all.push(...rates.cpiMonthly.series[yv]); const last6 = all.slice(-6);
  const cbars = last6.map((v, i) => { const h = Math.abs(v) * 28, yy = v >= 0 ? 36 - h : 36; return `<rect class="bar" x="${i * 18}" y="${yy.toFixed(1)}" width="12" height="${Math.max(2, h).toFixed(1)}" rx="2" fill="${v >= 0 ? "#10c8b8" : "#ff6b57"}" style="animation-delay:${600 + i * 80}ms"/>`; }).join("");
  return `<div class="viz" role="group" aria-label="הדגמת תכנון משכנתא">
  <div class="viz-card span-3"><div class="viz-label">החזר חודשי משוער</div><div class="viz-value num" data-count="${Math.round(m)}" data-prefix="₪">₪0</div><div class="viz-trend trend-flat">₪1.2M, 25 שנים, ריבית 4.0%</div></div>
  <div class="viz-card span-3"><div class="viz-label">ריבית בנק ישראל</div><div class="viz-value num" data-count="${rates.boi.rate}" data-dec="2" data-suffix="%">0%</div><div class="viz-trend trend-down">${icon("trend-down")} 5 הורדות ב-12 חודשים</div></div>
  <div class="viz-card span-6"><div class="viz-label">יתרת הקרן לאורך חיי ההלוואה</div><div class="viz-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="גרף המדגים ירידה הדרגתית של יתרת הקרן מ-1.2 מיליון שקל לאפס לאורך 25 שנים" direction="ltr"><defs><linearGradient id="vizFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#10c8b8" stop-opacity=".45"/><stop offset="1" stop-color="#10c8b8" stop-opacity="0"/></linearGradient></defs><path class="fill-area" d="${area}" fill="url(#vizFill)"/><path class="draw" d="${d}" fill="none" stroke="#7ff0e6" stroke-width="2.5" stroke-linecap="round"/>${ticks}</svg></div></div>
  <div class="viz-card span-3"><div class="viz-label">תמהיל לדוגמה</div><div class="viz-mix"><svg width="90" height="90" viewBox="0 0 90 90" role="img" aria-label="תמהיל לדוגמה: שליש פריים, שליש ריבית קבועה לא צמודה, שליש ריבית משתנה">${donut}</svg><div class="viz-legend">${segs.map((s) => `<span><i style="background:${s.c}"></i>${s.l}<b>${s.p}%</b></span>`).join("")}</div></div></div>
  <div class="viz-card span-3"><div class="viz-label">מדד המחירים, 6 חודשים</div><div class="viz-value num">${rates.indices[0].last12.toFixed(1)}<small>% ב-12 חוד'</small></div><svg width="108" height="40" viewBox="0 0 108 40" role="img" aria-label="שינוי חודשי במדד בששת החודשים האחרונים" direction="ltr" style="margin-top:.4rem">${cbars}</svg></div>
</div>`;
}

function featured(p) {
  return `<a class="featured reveal" href="/blog/${encodeURI(p.slug)}/"><h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p><div class="meta">${heDate(p.date)} · ${p.readMinutes} דק' קריאה</div></a>`;
}
function postRow(p) {
  return `<a class="post-row" href="/blog/${encodeURI(p.slug)}/"><h4>${esc(p.title)}</h4>${icon("arrow-left")}<div class="meta"><span>${p.category}</span><span class="meta-dot">${heDate(p.date)}</span></div></a>`;
}
function articleCard(p) {
  return `<a class="article-card" href="/blog/${encodeURI(p.slug)}/" data-category="${attr(p.category)}"><span class="chip ${accentChip[catAccent(p.category)]}" style="align-self:flex-start">${p.category}</span><h3>${esc(p.title)}</h3><p>${esc(p.excerpt)}</p><div class="meta">${heDate(p.date)} · ${p.readMinutes} דק' קריאה</div></a>`;
}
function catAccent(c) { return { "ריביות": "blue", "מחזור": "teal", 'נדל"ן': "green", "חדשות ועדכונים": "amber", "כלכלת משפחה": "coral" }[c] || "blue"; }

/* ---------- template engine ---------- */
function render(tpl, ctx) {
  let out = tpl;
  for (let i = 0; i < 4; i++) out = out.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (m, n) => { if (!partials[n]) throw new Error("missing partial " + n); return partials[n]; });
  out = out.replace(/\{\{@([\w-]+)\}\}/g, (m, n) => { if (!blocks[n]) throw new Error("missing block " + n); return blocks[n](); });
  out = out.replace(/\{\{icon:([\w-]+)\}\}/g, (m, n) => icon(n));
  out = out.replace(/\{\{([\w.]+)\}\}/g, (m, p) => {
    const v = p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), ctx);
    if (v === undefined) throw new Error("missing var " + p);
    return v;
  });
  // em/en dashes are not allowed in visible copy (design rule); normalise
  out = out.replace(/\s*[—–]\s*/g, " - ");
  return out;
}

function pageCtx(meta, extra) {
  const canonical = site.domain + meta.path;
  const fullTitle = meta.path === "/" ? meta.title : `${meta.title} | משפחה פיננסית`;
  const jsonld = [];
  if (meta.path === "/") jsonld.push({ "@context": "https://schema.org", "@type": "FinancialService", name: "משפחה פיננסית", alternateName: "Finance Family", url: site.domain, telephone: "+972-50-475-7888", email: site.email, description: "ייעוץ משכנתאות וכלכלת משפחה: משכנתא חדשה, מחזור משכנתא, משכנתא לכל מטרה ומשכנתא הפוכה.", areaServed: "IL", founder: { "@type": "Person", name: "איתי גנור" }, sameAs: Object.values(site.social), logo: site.domain + "/assets/img/og-default.png" });
  if (meta.crumbs) jsonld.push({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: meta.crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: site.domain + c.href })) });
  if (meta.jsonld) jsonld.push(meta.jsonld);
  return {
    site, build, services, rates,
    page: {
      title: meta.title, fullTitle: esc(fullTitle), description: esc(meta.description), canonical, ogType: meta.ogType || "website",
      ogImage: site.domain + (meta.ogImage || "/assets/img/og-default.png"),
      robots: meta.noindex ? '<meta name="robots" content="noindex,follow">' : '<meta name="robots" content="index,follow,max-image-preview:large">',
      jsonld: jsonld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join("\n"),
      crumbs: meta.crumbs ? `<ol class="crumbs">${meta.crumbs.map((c, i) => i === meta.crumbs.length - 1 ? `<li aria-current="page">${esc(c.name)}</li>` : `<li><a href="${c.href}">${esc(c.name)}</a></li>`).join("")}</ol>` : ""
    },
    ...(extra || {})
  };
}

function writeOut(rel, html) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html);
}

/* ---------- pages ---------- */
const urls = [];
for (const f of fs.readdirSync(path.join(SRC, "pages"))) {
  if (!f.endsWith(".html")) continue;
  const src = read(path.join(SRC, "pages", f));
  const mm = src.match(/^<!--meta\s*([\s\S]*?)-->/);
  if (!mm) throw new Error("page without meta: " + f);
  const meta = JSON.parse(mm[1]);
  const body = src.slice(mm[0].length);
  const html = render(body, pageCtx(meta));
  const rel = meta.path === "/404" ? "404.html" : meta.path.replace(/^\//, "") + "index.html";
  writeOut(rel, html);
  if (!meta.noindex && meta.path !== "/404") urls.push({ loc: site.domain + meta.path, lastmod: meta.lastmod || build.today, priority: meta.priority || (meta.path === "/" ? "1.0" : "0.7") });
}

/* ---------- posts ---------- */
const postTpl = read(path.join(SRC, "templates", "post.html"));
posts.forEach((p, i) => {
  const prev = posts[i + 1], next = posts[i - 1];
  const related = posts.filter((q) => q.category === p.category && q.id !== p.id).slice(0, 3);
  const meta = {
    title: p.title, description: p.excerpt.replace(/…$/, ""), path: `/blog/${p.slug}/`, ogType: "article", ogImage: p.image || undefined,
    crumbs: [{ name: "דף הבית", href: "/" }, { name: "מרכז הידע", href: "/knowledge/" }, { name: p.title, href: `/blog/${p.slug}/` }],
    jsonld: { "@context": "https://schema.org", "@type": "Article", headline: p.title, datePublished: p.date, dateModified: p.modified, inLanguage: "he", author: { "@type": "Person", name: "איתי גנור" }, publisher: { "@type": "Organization", name: "משפחה פיננסית", logo: { "@type": "ImageObject", url: site.domain + "/assets/img/og-default.png" } }, mainEntityOfPage: site.domain + `/blog/${p.slug}/`, ...(p.image ? { image: site.domain + p.image } : {}) }
  };
  const ctx = pageCtx(meta, {
    post: { ...p, html: p.html.replace(/<h1\b/g, "<h2").replace(/<\/h1>/g, "</h2>"), dateHe: heDate(p.date), modifiedHe: heDate(p.modified), titleEsc: esc(p.title), urlEnc: encodeURI(site.domain + `/blog/${p.slug}/`) },
    postNav: `${prev ? `<a href="/blog/${encodeURI(prev.slug)}/"><small>המאמר הקודם</small><b>${esc(prev.title)}</b></a>` : "<span></span>"}${next ? `<a href="/blog/${encodeURI(next.slug)}/"><small>המאמר הבא</small><b>${esc(next.title)}</b></a>` : ""}`,
    related: related.length ? `<h2 class="mb-3">עוד בנושא ${esc(p.category)}</h2><div class="article-grid">${related.map(articleCard).join("")}</div>` : ""
  });
  // canonical for hebrew slugs must be percent-encoded
  ctx.page.canonical = encodeURI(ctx.page.canonical);
  writeOut(`blog/${p.slug}/index.html`, render(postTpl, ctx));
  urls.push({ loc: encodeURI(site.domain + `/blog/${p.slug}/`), lastmod: p.modified, priority: "0.6" });
});

/* ---------- sitemap, robots, redirects, headers, manifest ---------- */
writeOut("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`).join("\n")}\n</urlset>\n`);
writeOut("robots.txt", `User-agent: *\nAllow: /\nDisallow: /assets/docs/\nSitemap: ${site.domain}/sitemap.xml\n`);
const oldPages = { "יעוץ-משכנתאות": "/services/", "מילון-מונחים": "/glossary/", "שערים-ומדדים": "/rates/", "סרטונים": "/knowledge/#videos", "בלוג": "/knowledge/", "יצירת-קשר": "/contact/", "מחשבוני-משכנתא": "/calculators/", "מדיניות-פרטיות": "/privacy-policy/", "משפחה-פיננסית-ייעוץ-משכנתא": "/services/", "דף-הבית": "/" };
const redirects = [];
for (const [k, v] of Object.entries(oldPages)) { redirects.push(`/${encodeURI(k)}/ ${v} 301`); redirects.push(`/${encodeURI(k)} ${v} 301`); }
for (const p of posts) { const e = encodeURI(p.slug); redirects.push(`/${e}/ /blog/${e}/ 301`); redirects.push(`/${e} /blog/${e}/ 301`); }
redirects.push("/wp-content/uploads/2023/02/הצהרת-נגישות.pdf /accessibility/ 301".replace(/הצהרת-נגישות/, encodeURI("הצהרת-נגישות")));
redirects.push("/index.html / 301");
writeOut("_redirects", redirects.join("\n") + "\n");
writeOut("_headers", `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.web3forms.com; frame-src 'none'; base-uri 'self'; form-action 'self' https://api.web3forms.com; object-src 'none'; upgrade-insecure-requests
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/assets/img/*
  Cache-Control: public, max-age=2592000
/*.html
  Cache-Control: public, max-age=0, must-revalidate
`);
writeOut("site.webmanifest", JSON.stringify({ name: "משפחה פיננסית", short_name: "משפחה פיננסית", start_url: "/", display: "browser", background_color: "#0b1f3a", theme_color: "#0b1f3a", lang: "he", dir: "rtl", icons: [{ src: "/assets/img/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/assets/img/icon-512.png", sizes: "512x512", type: "image/png" }] }, null, 1));
fs.mkdirSync(path.join(OUT, "data"), { recursive: true });
fs.copyFileSync(path.join(CONTENT, "rates.json"), path.join(OUT, "data", "rates.json"));

/* ---------- em-dash guard on visible output ---------- */
let dashHits = 0;
for (const f of walk(OUT)) if (f.endsWith(".html") && /[—–]/.test(read(f))) dashHits++;
console.log(`built ${urls.length} indexable pages, ${posts.length} posts, ${redirects.length} redirects; version ${build.version}; dash hits ${dashHits}`);

function* walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) yield* walk(p); else yield p; } }

/* ---------- optional dev server ---------- */
if (process.argv.includes("--serve")) {
  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".pdf": "application/pdf", ".xml": "application/xml", ".txt": "text/plain", ".webmanifest": "application/manifest+json" };
  const port = +(process.env.PORT || 4173);
  http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split("?")[0]);
    let p = path.join(OUT, u);
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!fs.existsSync(p)) { p = path.join(OUT, "404.html"); res.statusCode = 404; }
    res.setHeader("Content-Type", types[path.extname(p)] || "application/octet-stream");
    fs.createReadStream(p).pipe(res);
  }).listen(port, () => console.log("serving wwwroot on http://localhost:" + port));
}
