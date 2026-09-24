# Finance Family redesign: design system and build notes

Design read: redesign-overhaul of a Hebrew RTL mortgage-advisory site for Israeli families and homebuyers, with a fintech + human language, built on a native CSS design system, self-hosted Heebo, inline SVG data visuals and restrained motion.

Dials: DESIGN_VARIANCE 7, MOTION_INTENSITY 6, VISUAL_DENSITY 4.

## Sitemap

| Route | Page | Source |
|---|---|---|
| `/` | Home | `src/pages/index.html` |
| `/services/` | שירותים + איך זה עובד (`#process`) + FAQ | `src/pages/services.html` |
| `/rates/` | מרכז פיננסי (rates + indices) | `src/pages/rates.html` + `content/rates.json` |
| `/knowledge/` | מרכז הידע (articles, glossary, calculators, videos) | `src/pages/knowledge.html` + `content/posts.json` |
| `/blog/<hebrew-slug>/` | 68 articles | `src/templates/post.html` + `content/posts.json` |
| `/glossary/` | מילון מונחים | `src/pages/glossary.html` + `content/glossary.json` |
| `/calculators/` | מחשבונים | `src/pages/calculators.html` |
| `/about/` | אודות / הצוות | `src/pages/about.html` |
| `/contact/` | צור קשר | `src/pages/contact.html` |
| `/privacy-policy/` | מדיניות פרטיות | `src/pages/privacy-policy.html` |
| `/accessibility/` | הצהרת נגישות | `src/pages/accessibility.html` |
| `/404.html` | Not found | `src/pages/404.html` |

Old WordPress URLs (Hebrew page slugs at root, article slugs at root) are 301-redirected in `wwwroot/_redirects`.

## Build

`node scripts/build.mjs` renders `src/` + `content/` into `wwwroot/`. Only `wwwroot/` is served. Editors update `content/rates.json` (rates, indices, CPI series, updated date) and re-run the build.

## Tokens

Colours (light theme, dark theme via `prefers-color-scheme` and `data-theme`):

- Navy `--navy-900 #0B1F3A`, `--navy-950 #061530` (hero, footer, dashboard tiles)
- Electric blue `--blue #2457F5` (primary CTA, links)
- Teal `--teal #10C8B8` (logo teal, data accent)
- Green `--green #10A058` (logo green, positive trend)
- Amber `--amber #FFC857`, Coral `--coral #FF6B57`, Lime `--lime #C9F04B` (small accents only)
- Neutrals: `--bg #F5F7FB`, `--surface #FFFFFF`, `--surface-2 #EEF2F8`, `--ink #0E1B33`, `--muted #5F6E86`, `--line #DFE5EF`

Gradients: `--g-hero` navy to blue, `--g-accent` blue to teal, `--g-fin` teal to green. Used on hero, CTA band and data highlights only.

Service accents: new = blue, refinance = teal, any-purpose = green, reverse = amber, family finance = coral.

Type: Heebo variable 300-900. Display 800 weight, tight tracking. Body 1.0625rem / 1.65. Numbers use `.num` (tabular, 800).

Radius rule: buttons and chips are pills, cards 16px, large panels 24px, inputs 10px.

Shadows are navy-tinted only. No pure black, no pure white text on white.

## Accessibility

Semantic landmarks, skip link, visible focus (`:focus-visible` 3px blue ring), keyboard-operable tabs/accordions/menu, labels above inputs, inline errors with `aria-describedby`, `prefers-reduced-motion` disables all motion, display preferences widget (contrast, larger text, reduced motion) stored in localStorage as `data-*` on `<html>`. Charts carry `role="img"` + `aria-label` and a text/table equivalent.

## Privacy and forms

Forms post to Web3Forms (`content/site.json.form.accessKey`, must be replaced). Honeypot field, client validation, privacy notice near submit linking to `/privacy-policy/`. Optional marketing checkbox component exists and is off (`form.marketingConsent`). Consent bar component exists and only renders when `tracking.enabled` is true; scripts marked `type="text/plain" data-consent="analytics"` are activated on accept.

## Verified facts used (do not add others)

- Bank of Israel rate 3.25% from 2026-09-01, third cut in a row, five cuts in 12 months (blog 2026-09-02).
- Prime = BoI + 1.5% = 4.75%.
- CPI 12 months 1.5%, YTD 2.1%, Aug 2026 0.7%. Construction index 3.5% / 2.7% / 0.4%. Rate tables updated 2026-09-06.
- Itay Ganor: certified mortgage consultant, member of the mortgage advisers association, senior lecturer at Psagot College, 20 years managing businesses, two mortgages.
- Ariel Hillel: association member. Omer Dor: certified adviser (from the landing page).
- Phone 050-4757888 (main site). The separate landing page shows 050-6794580; flagged to client.
