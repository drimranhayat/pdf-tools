from html.parser import HTMLParser
from pathlib import Path
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent.parent / 'dist'
SLUG = re.compile(r'^[a-z]+(?:-[a-z]+)*/$')
FRAGMENT_TOOL = re.compile(r'href=[\"\'][^\"\']*#(?:/)?tool/')

class HeadAudit(HTMLParser):
    def __init__(self):
        super().__init__()
        self.titles = 0
        self.canonicals = []
        self.descriptions = []
        self.assets = []
        self.schemas = []
        self.in_schema = False
    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == 'title': self.titles += 1
        if tag == 'link' and attributes.get('rel') == 'canonical':
            self.canonicals.append(attributes.get('href'))
        if tag == 'meta' and attributes.get('name') == 'description':
            self.descriptions.append(attributes.get('content', ''))
        if attributes.get('src', '').startswith('/'):
            self.assets.append(attributes['src'])
        if tag == 'script' and attributes.get('type') == 'application/ld+json':
            self.in_schema = True
    def handle_data(self, data):
        if self.in_schema: self.schemas.append(json.loads(data))
    def handle_endtag(self, tag):
        if tag == 'script': self.in_schema = False

pages = [ROOT / 'index.html', *ROOT.glob('*/index.html')]
assert len(pages) == 31, len(pages)
canonical_urls = set()
for page in pages:
    content = page.read_text()
    audit = HeadAudit()
    audit.feed(content)
    assert audit.titles == 1, page
    assert len(audit.canonicals) == 1, page
    assert len(audit.descriptions) == 1 and audit.descriptions[0], page
    assert not FRAGMENT_TOOL.search(content), page
    assert audit.schemas, page
    for asset in audit.assets:
        assert (ROOT / asset.lstrip('/')).is_file(), (page, asset)
    assert audit.canonicals[0] not in canonical_urls, page
    canonical_urls.add(audit.canonicals[0])
    if page.parent != ROOT:
        assert SLUG.fullmatch(page.parent.name + '/'), page
entries = ET.parse(ROOT / 'sitemap.xml').getroot()
sitemap_urls = {entry[0].text for entry in entries}
assert sitemap_urls == canonical_urls
assert 'Disallow: /' not in (ROOT / 'robots.txt').read_text()
print('Passed: 31 pages, unique canonical URLs, descriptions, titles, structured data, local assets, slug regex, sitemap coverage, and no tool fragment links.')
