#!/usr/bin/env python3
"""Import the public VilaVix catalog from sitemaps and server-rendered pages.
No authentication, proxy rotation, user-agent spoofing or blocked-route bypass.
Requires Python 3.10+ and curl. Writes only catalog/import report outputs.
"""
import argparse
import concurrent.futures
import hashlib
import html
import json
import re
import subprocess
import time
import unicodedata
import urllib.parse
import xml.etree.ElementTree as ET
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

BASE = 'https://vilaviximoveis.com.br'
ROOT = Path(__file__).resolve().parents[1]
NEXT_RE = re.compile(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.S)

def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')

def atomic_json(path, data):
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    tmp.replace(path)

def slug(value):
    value = unicodedata.normalize('NFKD', str(value or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', value).strip('-')

def number(value, positive=False):
    if value is None or value == '':
        return None
    try:
        result = float(str(value).replace(',', '.'))
        if result < 0 or (positive and result == 0):
            return None
        return int(result) if result.is_integer() else result
    except (ValueError, TypeError):
        return None

def clean_text(value):
    text = str(value or '')
    text = re.sub(r'<(?:br\s*/?|/p|/div|/li)>', '\n', text, flags=re.I)
    text = re.sub(r'<[^>]*>', '', text)
    return html.unescape(text).replace('\r\n', '\n').strip()

def named(value):
    return value.get('nome', '') if isinstance(value, dict) else str(value or '')

def photo_urls(photos):
    result = []
    for photo in photos or []:
        if not isinstance(photo, dict):
            continue
        value = photo.get('url_foto') or photo.get('url_spaces_cdn') or photo.get('url_marca')
        if value and urllib.parse.urlparse(value).scheme in ('https', 'http') and value not in result:
            result.append(value)
    return result

def parse_next(page):
    match = NEXT_RE.search(page)
    if not match:
        raise ValueError('Page does not contain public __NEXT_DATA__')
    return json.loads(match.group(1))['props']['pageProps']

def normalize(record, source_url, imported_at, city_states=None):
    code = str(record.get('referencia') or record['id']).strip()
    purpose = 'aluguel' if '/aluguel/' in source_url or (record.get('aluguel') and not record.get('venda')) else 'venda'
    show_price = bool(record.get('exibir_preco_locacao' if purpose == 'aluguel' else 'exibir_preco_venda'))
    original_price = number(record.get('preco_locacao' if purpose == 'aluguel' else 'preco_venda'), positive=True) if show_price else None
    promotional_price = number((record.get('preco_especial') or {}).get('preco_especial_locacao' if purpose == 'aluguel' else 'preco_especial_venda'), positive=True) if show_price else None
    price = promotional_price or original_price
    own_photos = photo_urls(record.get('fotos'))
    development = record.get('empreendimento') or {}
    development_photos = photo_urls(development.get('fotos')) if record.get('usa_fotos_empreendimento') else []
    photos = list(dict.fromkeys(own_photos + development_photos))
    area_fields = ('terreno', 'area_total', 'area_privativa', 'area_util', 'area_construida') if any(t in named(record.get('tipo')).lower() for t in ['terreno', 'área de terra']) else ('area_privativa', 'area_util', 'area_construida', 'area_total')
    area = next((number(record.get(key), positive=True) for key in area_fields if number(record.get(key), positive=True) is not None), None)
    area_source = next((key for key in area_fields if number(record.get(key), positive=True) is not None), None)
    features = []
    for item in record.get('caracteristicas') or []:
        text = named(item.get('caracteristica')) if isinstance(item, dict) else str(item)
        if text and text not in features:
            features.append(text)
    title = clean_text(record.get('titulo'))
    city = named(record.get('cidade'))
    district = named(record.get('bairro'))
    state = named(record.get('estado')) or (city_states or {}).get(city)
    # Do not substitute the real estate agency's address for a listing address.
    address = None
    if record.get('mostrar_endereco') and record.get('endereco'):
        address = ', '.join(str(v) for v in [record.get('endereco'), record.get('numero')] if v)
    return {
        'id': 'legacy-' + code,
        'codigo': code,
        'legacyId': str(record['id']),
        'slug': slug(title or f'{named(record.get("tipo"))} {district} {city}') + '-' + slug(code),
        'titulo': title or ' · '.join(v for v in [named(development), named(record.get('tipo')), district] if v),
        'tipo': named(record.get('tipo')),
        'finalidade': purpose,
        'bairro': district,
        'cidade': city,
        'estado': state or None,
        'preco': price,
        'precoOriginal': original_price if promotional_price else None,
        'quartos': number(record.get('dormitorios')),
        'suites': number(record.get('suites')),
        'banheiros': number(record.get('banheiros')),
        'vagas': number(record.get('garagems')),
        'area': area,
        'areaFonte': area_source,
        'areaUnidade': record.get('area_tipo') or None,
        'areaPrivativa': number(record.get('area_privativa'), positive=True),
        'areaTotal': number(record.get('area_total'), positive=True),
        'areaTerreno': number(record.get('terreno'), positive=True),
        'descricao': clean_text(record.get('descricao')),
        'fotos': photos,
        'img': photos[0] if photos else None,
        'status': 'disponivel',
        'destaque': bool(record.get('destaque')),
        'caracteristicas': features,
        'endereco': address,
        'condominio': number(record.get('preco_condominio')) if record.get('exibir_preco_condominio') else None,
        'iptu': number(record.get('preco_iptu')) if record.get('exibir_preco_iptu') else None,
        'empreendimento': named(development) or None,
        'categoria': named(record.get('categoria')) or None,
        'dataEntrega': record.get('data_entrega') or None,
        'atualizadoNaOrigem': record.get('data_edicao') or None,
        'sourceUrl': source_url,
        'importedAt': imported_at,
    }

class Importer:
    def __init__(self, args):
        self.args = args
        self.cache = Path(args.cache)
        self.cache.mkdir(parents=True, exist_ok=True)
        self.started_at = now()
        self.discovery = []
        self.failures = []
        self.results = {}
        self.skipped = []
        self.city_states = {}
        self.public_api_audit = None
        self.company = {}
        self.home_counter = None
        self.city_counter = None

    def fetch(self, url, name=None):
        path = self.cache / (name or hashlib.sha256(url.encode()).hexdigest() + '.html')
        if path.exists() and not self.args.refresh:
            return path.read_text(encoding='utf-8')
        # curl's normal public HTTP client, with no custom identity or access tokens.
        completed = subprocess.run(['curl', '--silent', '--show-error', '--location', '--max-time', '45', '--fail', url], capture_output=True)
        if completed.returncode:
            raise RuntimeError(completed.stderr.decode(errors='replace').strip())
        content = completed.stdout.decode('utf-8')
        path.write_text(content, encoding='utf-8')
        time.sleep(self.args.delay)
        return content

    def query_public_api(self, query, key):
        path = self.cache / (key + '.json')
        if path.exists() and not self.args.refresh:
            return json.loads(path.read_text(encoding='utf-8'))
        completed = subprocess.run([
            'curl', '--silent', '--show-error', '--location', '--max-time', '45', '--fail',
            BASE + '/api/gql', '-H', 'Content-Type: application/json', '-H', 'codsite: 2169',
            '-H', 'dominion: ' + BASE, '-H', 'x-graphql-client-name: ' + BASE,
            '--data-binary', json.dumps({'query': query}),
        ], capture_output=True)
        if completed.returncode:
            raise RuntimeError(completed.stderr.decode(errors='replace').strip())
        data = json.loads(completed.stdout)
        if data.get('errors'):
            raise RuntimeError('Public API returned GraphQL errors')
        path.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
        time.sleep(self.args.delay)
        return data

    def audit_public_api(self):
        def get_page(page):
            query = '{ imoveis_busca(pagina: ' + str(page) + ', ordenar: Inclusao, ordem: desc) { count imoveis { id referencia } } }'
            return self.query_public_api(query, f'public-api-page-{page}')['data']['imoveis_busca']
        try:
            first = get_page(1)
            total = first['count']
            page_size = len(first['imoveis'])
            pages = (total + page_size - 1) // page_size if page_size else 1
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.args.workers) as pool:
                responses = [first] + list(pool.map(get_page, range(2, pages + 1)))
            ids = {str(item['id']) for response in responses for item in response['imoveis']}
            imported_ids = {item['legacyId'] for item in self.results.values()}
            self.public_api_audit = {
                'endpoint': BASE + '/api/gql', 'authentication': 'none', 'status': 'ok',
                'pages': pages, 'pageSize': page_size, 'reportedCount': total,
                'distinctIds': len(ids), 'missingFromCatalog': sorted(ids - imported_ids),
                'notInApi': sorted(imported_ids - ids),
            }
        except Exception as error:
            self.public_api_audit = {'endpoint': BASE + '/api/gql', 'status': 'error', 'error': str(error)}

    def discover(self):
        home = parse_next(self.fetch(BASE, 'home.html'))['allDataHome']
        self.home_counter = home['site'].get('total_imoveis')
        self.city_counter = sum(city.get('imoveis', 0) for city in home.get('cidades', []))
        contact = home['site'].get('Dados') or {}
        self.company = {
            'name': contact.get('empresa'), 'phone': contact.get('tel1'),
            'whatsapp': '5527981360170' if contact.get('tel1_whats') and re.sub(r'\D', '', contact.get('tel1', '')) == '27981360170' else None,
            'email': (contact.get('email1') or '').lower(), 'street': contact.get('endereco'),
            'district': contact.get('bairro'), 'city': contact.get('cidade'), 'state': contact.get('estado'),
            'postalCodeAsPublished': contact.get('cep'), 'creci': contact.get('creci') or None,
            'logo': home['site'].get('url_logo'), 'sourceUrl': BASE,
        }
        try:
            states = self.query_public_api('{ estados { id nome pais } }', 'public-api-states')['data']['estados']
            state_by_id = {state['id']: {'Espírito Santo': 'ES'}.get(state['nome'], state['nome']) for state in states}
            self.city_states = {city['nome']: state_by_id[city['id_estado']] for city in home.get('cidades', []) if city.get('id_estado') in state_by_id}
        except Exception:
            pass  # Missing state metadata remains null; it never blocks actual listings.
        root_xml = self.fetch(BASE + '/sitemap.xml', 'sitemap.xml')
        self.discovery.append({'url': BASE + '/sitemap.xml', 'status': 'ok', 'kind': 'sitemap-index'})
        children = [e.text for e in ET.fromstring(root_xml).findall('{*}sitemap/{*}loc')]
        urls = set()
        for url in children:
            # All public sitemap entries are read; listing URLs only are imported.
            try:
                body = self.fetch(url, urllib.parse.urlparse(url).path.strip('/'))
                xml = ET.fromstring(body)
                locations = [e.text for e in xml.findall('{*}url/{*}loc')]
                listings = [location for location in locations if '/imovel/' in location]
                urls.update(listings)
                self.discovery.append({'url': url, 'status': 'ok', 'locations': len(locations), 'listingUrls': len(listings)})
            except Exception as error:
                self.discovery.append({'url': url, 'status': 'error', 'error': str(error)})
        return sorted(urls, key=lambda value: int(value.rsplit('/', 1)[-1]))

    def one(self, url):
        try:
            page = self.fetch(url)
            props = parse_next(page)
            record = props.get('imovel')
            if props.get('notFound') or not record:
                return {'skip': {'url': url, 'reason': 'Listing not found in public page'}}
            if record.get('disponivel') is False:
                return {'skip': {'url': url, 'reason': 'Explicitly unavailable in source'}}
            return {'record': normalize(record, url, now(), self.city_states)}
        except Exception as error:
            return {'error': {'url': url, 'error': str(error)}}

    def save(self, complete=False, write_catalog=True):
        catalog = sorted(self.results.values(), key=lambda item: int(item['legacyId']))
        if write_catalog:
            atomic_json(ROOT / 'data/catalog.json', catalog)
        report = {
            'source': BASE,
            'startedAt': self.started_at,
            'updatedAt': now(),
            'complete': complete,
            'method': 'Public sitemap discovery followed by server-rendered __NEXT_DATA__ on each listing page; plain curl HTTPS requests.',
            'discovery': self.discovery,
            'discoveredListingUrls': len(self.urls),
            'sourceHomeCounter': self.home_counter,
            'sourceCityCounterSum': self.city_counter,
            'publicApiAudit': self.public_api_audit,
            'verifiedCompany': self.company,
            'importedListings': len(catalog),
            'failedListings': self.failures,
            'skippedListings': self.skipped,
            'counts': {
                'cities': dict(Counter(item['cidade'] for item in catalog)),
                'types': dict(Counter(item['tipo'] for item in catalog)),
                'purposes': dict(Counter(item['finalidade'] for item in catalog)),
                'photos': sum(len(item['fotos']) for item in catalog),
                'uniquePhotos': len({photo for item in catalog for photo in item['fotos']}),
                'withoutPhotos': sum(not item['fotos'] for item in catalog),
                'priceOnRequest': sum(item['preco'] is None for item in catalog),
                'withoutDescription': sum(not item['descricao'] for item in catalog),
                'withoutArea': sum(item['area'] is None for item in catalog),
            },
            'notes': [
                'A listing present in the public sitemap/detail page is imported as disponivel unless the source explicitly marks it unavailable. Availability and asking price must be confirmed with the agency.',
                'Hidden prices, condominium/IPTU fees and addresses are not published even when present in client page data.',
                'Missing facts remain null/empty; state is filled only when source city ID and public state metadata establish it, never from the agency address.',
                'The displayed promotional price is used when present, with the original asking price preserved as precoOriginal.',
                'Photos are original public URLs, including development photos only when usa_fotos_empreendimento is enabled. No stock replacements.',
                'Area uses private/useful/built/total, in that order; land listings use land/total first. Original area fields and the selected field are preserved.',
            ],
        }
        atomic_json(ROOT / 'data/import-report.json', report)

    def run(self):
        self.urls = self.discover()
        print(f'Discovered {len(self.urls)} listing URLs', flush=True)
        selected = self.urls[:self.args.limit] if self.args.limit else self.urls
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.args.workers) as pool:
            for index, result in enumerate(pool.map(self.one, selected), 1):
                if 'record' in result:
                    record = result['record']
                    if record['id'] in self.results and self.results[record['id']]['legacyId'] != record['legacyId']:
                        self.failures.append({'url': record['sourceUrl'], 'error': 'Duplicate public reference code: ' + record['codigo']})
                    else:
                        self.results[record['id']] = record
                elif 'error' in result:
                    self.failures.append(result['error'])
                else:
                    self.skipped.append(result['skip'])
                if index % 10 == 0 or index == len(selected):
                    if self.args.incremental:
                        self.save()
                    print(f'{index}/{len(selected)} pages; {len(self.results)} imported; {len(self.failures)} failures; {len(self.skipped)} skipped', flush=True)
        self.audit_public_api()
        api_matches = self.public_api_audit.get('status') == 'ok' and self.public_api_audit.get('distinctIds') == self.public_api_audit.get('reportedCount') and not self.public_api_audit.get('missingFromCatalog') and not self.public_api_audit.get('notInApi')
        complete = not self.args.limit and not self.failures and api_matches
        self.save(complete=complete, write_catalog=complete or self.args.incremental)
        print(f'Complete: {complete}; public API audit: {self.public_api_audit}', flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache', default='/tmp/vilavix-catalog-import')
    parser.add_argument('--workers', type=int, default=3)
    parser.add_argument('--delay', type=float, default=0.2)
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--refresh', action='store_true')
    parser.add_argument('--incremental', action='store_true', help='Explicitly allow publishing partial results while importing')
    Importer(parser.parse_args()).run()
