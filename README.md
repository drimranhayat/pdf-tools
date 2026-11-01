# PDF Tools — GitHub repository

A complete static website with 24 PDF tools and 29 crawlable pages. All browser dependencies and prebuilt files are included. No processing server or dependency installation is needed for the build.

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
| Environment variable | `SITE_URL` = your final HTTPS website origin |

SITE_URL is public configuration. Set it to your real domain or the assigned Cloudflare pages.dev origin, with no subpath. It controls canonical URLs, sitemap entries, robots.txt and structured data. Without it, the build retains the current ChatGPT-hosted origin. Update it before launching on a new domain. Connect your custom domain in Cloudflare after deployment.

## Local checks

Node.js 22 or newer and Python 3 are needed for these commands:

```powershell
npm run build
python scripts/audit-seo.py
```

The build is dependency-free; browser libraries are vendored in dist/vendor. Local deployment files live in dist. Do not open index.html via file:// because JavaScript modules and PDF workers need HTTP/HTTPS.

## Functionality and limitations

The website includes merge, split, compression, images to PDF, PDF to images, rotation, organization, extraction, page removal, watermarks, numbering, text extraction, cropping, resizing, grayscale, text overlays, drawn signatures, form flattening, metadata, basic Word text conversion, HTML, Markdown and duplication.

Word conversions are text-only. Image-based compression and grayscale remove selectable text and interactive features on rebuilt pages. Cropping is not redaction, drawn signatures are not digital certificates, and metadata clearing is not a complete privacy scrub. Preserve originals and inspect outputs.

No advertising, analytics, payments or accounts are integrated. Search Console needs the owner's verification code. AdSense needs the owner's account-issued publisher code, approval, updated privacy disclosures and any required consent controls. Rankings and income are not guaranteed.

See SEO_LAUNCH.md, VERIFICATION.md and dist/LICENSES.txt. The original application source has no open-source license granted by this export; keep the repo private unless you choose an appropriate license and public distribution.

This export excludes existing Git history, Sites identity, credentials and .openai hosting configuration. It does not create a repository in your GitHub account automatically.
