# finance-family

## Status

| | |
|---|---|
| **Domain** | `https://finance-family.co.il` |
| **Pages URL** | `https://finance-family-7rj.pages.dev` |
| **Storage mode** | `Standard` (`standard`) |
| **Storage account** | `jetvaults` |
| **Public storage** | `https://jetvaults.blob.core.windows.net/finance-family/` |
| **Private storage** | `https://jetvaults.blob.core.windows.net/finance-family-private/` |
| **Public container** | `finance-family` |
| **Private container** | `finance-family-private` |
| **Activated** | No |

## Nameservers

Set these at your domain registrar:

```
gordon.ns.cloudflare.com
sureena.ns.cloudflare.com
```

## Development

Edit files in `wwwroot/` and push to `main` - Cloudflare Pages auto-deploys.

Only the `wwwroot/` directory is served. Everything else stays in the repo.

## Site build (redesign, September 2026)

The site is generated. Do not edit files under `wwwroot/` by hand except the static assets in `wwwroot/assets/`.

```
node scripts/build.mjs          # renders src/ + content/ into wwwroot/
node scripts/build.mjs --serve  # same, then serves wwwroot on http://localhost:4173
```

Requires Node 18+ and no npm packages.

| What to change | Where |
|---|---|
| Rates, indices, Bank of Israel rate, CPI series, "updated" date | `content/rates.json` |
| Services, process steps, values, FAQ, team bios | `content/services.json` |
| Contact details, navigation, form key, tracking flag, legal dates | `content/site.json` |
| Glossary terms | `content/glossary.json` |
| Articles (title, date, category, html) | `content/posts.json` |
| Page copy and layout | `src/pages/*.html`, `src/templates/post.html`, `src/partials/*.html` |
| Design system | `wwwroot/assets/css/site.css`, see `DESIGN.md` |

After editing content, run the build and commit both the source and the regenerated `wwwroot/`.

### Forms

Lead forms post to Web3Forms. Set `form.accessKey` in `content/site.json` (the key is public by design; it only allows submissions to the configured inbox). Until it is set, the form shows a message asking visitors to call or use WhatsApp.

### Tracking and consent

No analytics or pixels are installed. To add one, set `tracking.enabled` to `true` in `content/site.json`, add the script as `<script type="text/plain" data-consent="analytics">...</script>` (or `data-consent="marketing"`) in `src/partials/footer.html`, and rebuild. The consent bar then appears and activates scripts only after the visitor accepts.

### Old URLs

`wwwroot/_redirects` maps the WordPress Hebrew page slugs and all article URLs to the new paths with 301 redirects. Article slugs are preserved under `/blog/`.
