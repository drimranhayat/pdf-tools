# Search visibility and monetization launch

## Completed

The site is public. It includes 24 separate tool URLs, a homepage, four information pages, descriptive titles, meta descriptions, canonical URLs, crawlable links, visible usage instructions, examples, limitation notes, related tools, valid WebApplication/Breadcrumb structured data, robots.txt and a 29-URL sitemap.

The keywords are search-intent phrases chosen to match actual tool functionality, not a claim about verified search volume. No ranking position, indexing decision or advertising approval is guaranteed. There are no fake ratings, keyword-stuffed meta tags or unsupported rich-result claims.

## Google Search Console

1. Open https://search.google.com/search-console/ using the owner's Google account.
2. Add a URL-prefix property for https://pdf-tools-studio.yasirhayat5079.chatgpt.site/ .
3. Choose HTML tag verification and provide the exact google-site-verification meta tag for installation. No verification token is invented in this build.
4. After verification, submit https://pdf-tools-studio.yasirhayat5079.chatgpt.site/sitemap.xml .
5. Inspect the homepage and priority tool URLs. Request indexing where appropriate and monitor crawl/index reports.
6. Measure impressions, clicks, queries and conversion behavior before revising page content.

## Regex query filters

Use Performance > Search results > New filter > Query > Custom (regex). These are analysis filters, not ranking signals. Search Console uses RE2 syntax; avoid lookbehind and backreferences.

Core tool searches:

```regex
(?i)(merge|combine|join|split|compress|reduce|rotate|resize|crop|watermark|sign|flatten).{0,40}pdf|pdf.{0,40}(merge|combine|split|compress|rotate|text|word|jpg|png|html|markdown)
```

Conversion searches:

```regex
(?i)(pdf.{0,20}(word|docx|jpg|jpeg|png|text|txt|html|markdown))|((word|docx|jpg|jpeg|png|webp|image).{0,20}pdf)
```

Privacy-focused searches:

```regex
(?i)(pdf.{0,60}(private|privacy|no upload|without upload|offline|browser))|((private|privacy|no upload|without upload|offline|browser).{0,60}pdf)
```

Brand searches:

```regex
(?i)pdf[ -]?tools|pdf-tools-studio
```

The broad brand phrase may include generic tool searches. Refine it once a distinctive brand is chosen.

## AdSense

No AdSense script, publisher identifier, ads.txt publisher entry or consent platform has been installed. The owner must create or use their own AdSense account, submit the website and complete Google's review. Use only the publisher code and ads.txt entry actually issued to that account. Never publish fabricated IDs.

Before advertising is activated, confirm that hosting supports the required integration, update the privacy notice to describe ad-related processing, and implement required consent controls. Keep ads separate from file selection and download buttons. Original guides and functional tools do not guarantee AdSense approval or revenue.

A domain owned by the publisher provides more control over branding, DNS verification and hosting migration. It is not required to begin Search Console URL-prefix verification on the current public site.

## Maintenance

Update tool metadata and scripts/build-seo.mjs when functionality changes. Rebuild with `node scripts/build-seo.mjs`, then run `python3 scripts/audit-seo.py` and JavaScript syntax checks. Do not add unsupported features or exact-size compression keywords merely for traffic.
