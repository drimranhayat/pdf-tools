# Traffic readiness on Cloudflare Pages

## Architecture
The site is a static export: Cloudflare serves HTML, JavaScript, CSS, WASM and models at the edge. PDF conversion and OCR execute on each visitor’s device. There is no shared conversion server, processing queue, upload bucket or database that becomes a bottleneck as concurrent visitors increase. Do not introduce document-upload APIs merely to scale this version.

## Included controls
- Large PDF libraries are loaded only when a visitor adds a file or tries a sample; browsing the tool directory stays lightweight.
- OCR code and language models are loaded only when recognition starts. Visitors using other tools do not download OCR assets.
- OCR assets have a versioned /vendor/ocr/v1/ path with long-lived immutable caching. If any OCR file changes, create v2 and update every OCR path, model hash and license notice. Never replace immutable files in place.
- HTML, application code and other dependencies use Cloudflare Pages’ normal revalidation so new deployments are discoverable. Cloudflare Pages manages its CDN caching and deployment invalidation; do not add a broad Cache Everything rule that caches stale HTML.
- One OCR worker processes pages sequentially. Maximum 10 images or selected pages; one active job per tab. Canvas resolution caps protect device memory. Workers terminate after completion or cancellation. No result storage is introduced.
- A static 404 page prevents unknown routes from being treated as app entry points.
- No OCR API keys, per-page service bills or shared compute instances are required. Slow phones can still struggle: server scalability does not remove device CPU and memory limits.
- scripts/audit-assets.py verifies every bundled OCR hash, maximum file size and Cloudflare header rules.

## Before launch
Deploy as Cloudflare Pages with build command npm run build and output dist. Keep the _headers file in dist. Connect pdf-tools.drimranhayat.com in Custom domains. Inspect actual response headers after deployment, especially versioned OCR assets and language .gz files. Do not attach Content-Encoding: gzip to traineddata.gz: Tesseract decompresses the file itself. Keep the production SITE_URL environment variable and Search Console verification setting.

## Monitor growth
Use Cloudflare’s request, bandwidth, error and security dashboards. Watch 404/5xx rates, OCR asset transfer sizes and cache hit ratios. Use browser performance measurements on phones and slow networks. If optional analytics or error telemetry is added, update privacy disclosures and avoid logging document contents. Introduce WAF or rate limiting based on observed abuse and plan availability; do not block ordinary asset/model requests or known search crawlers indiscriminately.

## Limits and future services
Cloudflare account and platform limits still apply. This is not a guarantee of unlimited traffic or recognition throughput. Recheck current Pages limits, pricing and abuse policies before large promotions. Each shipped file is checked below the 25 MiB Pages per-file asset ceiling. The export uses no Pages Functions, whose request and CPU limits differ from static hosting.

If a future feature requires server-side document conversion, design it separately with upload limits, expiring private storage, an asynchronous queue, bounded workers, timeouts, per-user quotas, cost controls and monitoring. Do not run unbounded PDF processing in a synchronous edge request.

## Validation boundary
This update tests local processing and package structure. It has not been load-tested against a deployed Cloudflare account. Run any production load test only against infrastructure you own and within its provider’s policies. A static CDN design removes a shared processing bottleneck; measured capacity still requires production monitoring.

Official references:
- https://developers.cloudflare.com/pages/platform/limits/
- https://developers.cloudflare.com/pages/configuration/headers/
- https://developers.cloudflare.com/pages/configuration/serving-pages/
