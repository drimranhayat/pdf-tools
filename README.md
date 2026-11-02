# PDF Tools — GitHub repository

A complete static website with 26 PDF tools and 31 crawlable pages. All browser dependencies and prebuilt files are included. No processing server or dependency installation is needed for the build. OCR code, WASM cores and English, Urdu and Arabic language models are bundled and loaded from your own site only when OCR is used.

## Create your repository on Windows

Extract so that `E:\pdf-tools\package.json` exists, then run in PowerShell:

```powershell
Set-Location 'E:\pdf-tools'
git init
git add .
git commit -m "Initial PDF tools website"
gh auth login
gh repo create pdf-tools --private --source . --remote origin --push
```

Sign in to your own GitHub account when prompted. The command creates a private repository, which Cloudflare Pages can connect to. Push the extracted files, not the ZIP itself. If Git requests an author name and email, configure your own values before committing. Change the repository name if pdf-tools already exists in your account.

## Cloudflare Pages configuration

Connect the GitHub repository to a new Pages project and select its main branch.

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Output directory | `dist` |
| Root directory | Repository root |
| Environment variable | `NODE_VERSION=22` |
| Environment variable | `SITE_URL=https://pdf-tools.drimranhayat.com` |

The default production origin is `https://pdf-tools.drimranhayat.com`. It controls canonical URLs, social metadata, sitemap entries, robots.txt and structured data. In Cloudflare Pages, add `pdf-tools.drimranhayat.com` under Custom domains and follow its DNS instructions. Your main website remains separate.

For Google Search Console, add the URL-prefix property `https://pdf-tools.drimranhayat.com/`, choose HTML tag verification and copy only its `content` value into the Cloudflare Pages environment variable `GOOGLE_SITE_VERIFICATION`. Redeploy, then click Verify in Search Console. Submit `https://pdf-tools.drimranhayat.com/sitemap.xml`. No verification tag is emitted until you supply your real token.

## Local checks

Node.js 22 or newer and Python 3 are needed for these commands:

```powershell
npm run build
python scripts/audit-seo.py
```

The build is dependency-free; browser libraries are vendored in dist/vendor. Local deployment files live in dist. Do not open index.html via file:// because JavaScript modules and PDF workers need HTTP/HTTPS.

## Functionality and limitations

The website includes merge, split, compression, images to PDF, PDF to images, rotation, organization, extraction, page removal, watermarks, numbering, text extraction, cropping, resizing, grayscale, text overlays, drawn signatures, form flattening, metadata, basic Word text conversion, HTML, Markdown and duplication.

Word to PDF is text-only. PDF to Word now supports paragraph reconstruction, approximate line formatting and image-based appearance preservation. Image-based compression and grayscale remove selectable text and interactive features on rebuilt pages. Cropping is not redaction, drawn signatures are not digital certificates, and metadata clearing is not a complete privacy scrub. Preserve originals and inspect outputs.

No advertising, analytics, payments or accounts are integrated. Search Console needs the owner's verification code. AdSense needs the owner's account-issued publisher code, approval, updated privacy disclosures and any required consent controls. Rankings and income are not guaranteed.

See OPTIONS_GUIDE.md for the complete 26-tool option review, OCR_AND_WORD.md for conversion notes, SCALING.md for traffic readiness, SEO_LAUNCH.md for indexing, VERIFICATION.md for checks and dist/LICENSES.txt for dependencies. Run npm test, python scripts/audit-seo.py and python scripts/audit-assets.py before redeploying. The original application source has no open-source license granted by this export; keep the repo private unless you choose an appropriate license and public distribution.

This export excludes existing Git history, Sites identity, credentials and .openai hosting configuration. It does not create a repository in your GitHub account automatically.
