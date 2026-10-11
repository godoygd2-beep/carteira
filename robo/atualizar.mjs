/* Robô de dados de mercado (roda no GitHub Actions).
   Junta dados públicos e grava saida/dados/mercado.json e saida/dados/ativos.json, que o app lê.
   Nenhum dado pessoal passa por aqui.

   Fontes:
   - Preços e lista de ativos da B3: brapi (GET /api/v2/tickers, não exige token)
   - CDI diário (série 12) e IPCA mensal (série 433): Banco Central
   - Preços do Tesouro Direto: Tesouro Transparente (arquivo PrecoTaxaTesouroDireto.csv)
   - Cripto e USDT em reais: Binance (dados públicos)
   - Dólar: AwesomeAPI
   - Proventos de FIIs: FundosNET da B3 (avisos de rendimentos)
   - Proventos de ações: B3 (proventos em dinheiro de cada empresa)

   Cada fonte é independente: se uma falhar, o robô mantém o último valor publicado. */
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const OUT = process.env.SAIDA || 'saida/dados';
const SITE = process.env.SITE_URL || (process.env.GITHUB_REPOSITORY ? 'https://' + process.env.GITHUB_REPOSITORY.split('/')[0].toLowerCase() + '.github.io/' + process.env.GITHUB_REPOSITORY.split('/')[1] + '/' : '');
const DIAS = +(process.env.DIAS || 3);           // dias de avisos de FIIs para buscar nesta rodada
const FORCAR = (process.env.FORCAR || '').split(',').filter(Boolean); // ex.: "tesouro,acoes"
const SONDA = process.env.SONDA === '1';         // mostra amostras das respostas (para conferir as fontes)
const HORA = 3600e3;
const agora = new Date();
const log = (...a) => console.log('[' + new Date().toISOString().slice(11, 19) + ']', ...a);
const sonda = (nome, x) => { if (SONDA) console.log('--- SONDA ' + nome + ' ---\n' + (typeof x === 'string' ? x : JSON.stringify(x, null, 1)).slice(0, 2500)); };

const UA = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36', 'Accept': 'application/json, text/plain, */*', 'Accept-Language': 'pt-BR,pt;q=0.9' };
async function get(url, opt = {}, tentativas = 3) {
  let ult;
  for (let i = 0; i < tentativas; i++) {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), opt.timeout || 30000);
      const r = await fetch(url, { headers: Object.assign({}, UA, opt.headers || {}), signal: ctl.signal });
      clearTimeout(t);
      if (!r.ok) throw new Error('HTTP ' + r.status + ' em ' + url.slice(0, 120));
      return opt.texto ? await r.text() : opt.binario ? Buffer.from(await r.arrayBuffer()) : await r.json();
    } catch (e) { ult = e; await new Promise(r => setTimeout(r, 1500 * (i + 1))); }
  }
  throw ult;
}
const iso = d => d.toISOString().slice(0, 10);
const dmY = d => String(d.getUTCDate()).padStart(2, '0') + '/' + String(d.getUTCMonth() + 1).padStart(2, '0') + '/' + d.getUTCFullYear();
const brData = s => { const m = /(\d{2})\/(\d{2})\/(\d{4})/.exec(s || ''); return m ? m[3] + '-' + m[2] + '-' + m[1] : null; };
// "1.234,56" (padrão brasileiro) ou "0.0508" (ponto decimal)
const brNum = s => { if (typeof s === 'number') return s; s = String(s ?? '').trim(); return s.includes(',') ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s); };
const velho = (ts, horas) => !ts || (agora - new Date(ts)) > horas * HORA;
// roda fn em até n itens ao mesmo tempo
async function emLotes(lista, n, fn) { let i = 0; const out = []; await Promise.all(Array.from({ length: n }, async () => { while (i < lista.length) { const k = i++; out[k] = await fn(lista[k]); } })); return out; }

/* ---------- Dados publicados antes (para manter o que não for atualizado agora) ---------- */
async function anterior() {
  const vazio = { mk: { atualizado: {}, precos: {}, tesouro: {}, cripto: {}, cdi: [], ipca: [], anuncios: [] }, ativos: { acao: [], fii: [], tesouro: [] } };
  if (!SITE) return vazio;
  try {
    const [mk, ativos, estado] = await Promise.all([get(SITE + 'dados/mercado.json?x=' + Date.now(), {}, 2), get(SITE + 'dados/ativos.json?x=' + Date.now(), {}, 2).catch(() => vazio.ativos),
      get(SITE + 'dados/robo.json?x=' + Date.now(), {}, 2).catch(() => ({}))]);
    log('dados anteriores: ok');
    return { mk: Object.assign(vazio.mk, mk, { fnetLidos: estado.fnetLidos || [] }), ativos };
  } catch (e) { log('sem dados anteriores (' + e.message + ')'); return vazio; }
}

/* ---------- B3: preços e lista (brapi) ---------- */
async function acoes(mk, ativos) {
  const precos = {}, acao = [], fii = [];
  let page = 1, total = 0;
  for (;;) {
    const j = await get('https://brapi.dev/api/v2/tickers?limit=100&page=' + page + '&sortBy=symbol&sortOrder=asc');
    if (page === 1) sonda('brapi v2 tickers', { pagination: j.pagination, primeiro: (j.results || [])[0] });
    for (const it of j.results || []) {
      const s = it.symbol; if (!s) continue;
      const p = it.quote && it.quote.lastPrice;
      if (p > 0) precos[s] = +(+p).toFixed(4);
      if (it.isActive === false) continue;
      const nome = (it.name || it.longName || '').trim();
      const sub = it.subType || '', tipo = it.assetType || '';
      if (sub === 'fii' || sub === 'fi-infra' || sub === 'fi-agro') fii.push([s, nome]);
      else if (tipo === 'stock' || tipo === 'bdr' || sub === 'etf' || sub === 'unit' || sub === 'stock') acao.push([s, nome]);
      total++;
    }
    const pg = j.pagination || {};
    if (!pg.hasNextPage || page >= 200) break;
    page++;
  }
  if (Object.keys(precos).length < 50) throw new Error('poucos preços (' + Object.keys(precos).length + ')');
  mk.precos = precos; ativos.acao = acao; ativos.fii = fii;
  mk.atualizado.b3 = agora.toISOString();
  log('B3: ' + Object.keys(precos).length + ' preços, ' + acao.length + ' ações/ETFs/BDRs, ' + fii.length + ' FIIs');
}

/* ---------- Banco Central: CDI e IPCA ---------- */
async function bcb(mk) {
  const ini = new Date(Date.UTC(agora.getUTCFullYear() - 3, 0, 1));
  const cdi = await get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=' + dmY(ini) + '&dataFinal=' + dmY(agora));
  sonda('BCB CDI', cdi.slice(-3));
  mk.cdi = cdi.map(x => [brData(x.data), +brNum(x.valor)]).filter(x => x[0] && x[1] >= 0);
  mk.atualizado.cdi = agora.toISOString();
  const ip = await get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/' + (agora.getUTCFullYear() - 8) + '&dataFinal=' + dmY(agora));
  sonda('BCB IPCA', ip.slice(-3));
  mk.ipca = ip.map(x => [brData(x.data).slice(0, 7), +brNum(x.valor)]).filter(x => x[0]);
  mk.atualizado.ipca = agora.toISOString();
  log('BCB: ' + mk.cdi.length + ' dias de CDI (último ' + (mk.cdi.at(-1) || [])[0] + '), ' + mk.ipca.length + ' meses de IPCA');
}

/* ---------- Tesouro Direto ---------- */
const NOMES_TD = [
  [/renda\+|renda \+|aposentadoria/i, 'Tesouro RendA+', -19],
  [/educa/i, 'Tesouro Educa+', -4],
  [/ipca\+? com juros/i, 'Tesouro IPCA+ com Juros Semestrais', 0],
  [/ipca/i, 'Tesouro IPCA+', 0],
  [/igpm/i, 'Tesouro IGPM+ com Juros Semestrais', 0],
  [/prefixado com juros/i, 'Tesouro Prefixado com Juros Semestrais', 0],
  [/prefixado/i, 'Tesouro Prefixado', 0],
  [/selic/i, 'Tesouro Selic', 0]
];
function nomeTD(tipo, venc) {
  const ano = +venc.slice(0, 4);
  for (const [re, nome, ajuste] of NOMES_TD) if (re.test(tipo)) return nome + ' ' + (ano + ajuste);
  return tipo + ' ' + ano;
}
async function tesouro(mk, ativos) {
  const url = 'https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv';
  const buf = await get(url, { binario: true, timeout: 120000 });
  let txt = buf.toString('utf8'); if (txt.includes('�')) txt = buf.toString('latin1');
  const linhas = txt.split(/\r?\n/).filter(Boolean);
  sonda('Tesouro CSV', linhas.slice(0, 3).join('\n'));
  const cab = linhas[0].split(';').map(s => s.trim().toLowerCase());
  const col = n => cab.findIndex(c => c.includes(n));
  const iTipo = col('tipo'), iVenc = col('vencimento'), iBase = col('data base'), iVenda = col('pu venda'), iPuBase = col('pu base'), iCompra = col('pu compra');
  const ult = new Map();
  for (const l of linhas.slice(1)) {
    const c = l.split(';'); const base = brData(c[iBase]), venc = brData(c[iVenc]); if (!base || !venc) continue;
    const k = c[iTipo] + '|' + venc, u = ult.get(k);
    if (!u || base > u.base) ult.set(k, { tipo: c[iTipo], venc, base, venda: brNum(c[iVenda]), pubase: brNum(c[iPuBase]), compra: brNum(c[iCompra]) });
  }
  const maisNova = [...ult.values()].reduce((m, x) => x.base > m ? x.base : m, '');
  const limite = iso(new Date(new Date(maisNova + 'T12:00Z') - 10 * 864e5));
  const precos = {}, lista = [];
  for (const x of ult.values()) {
    if (x.base < limite || x.venc < iso(agora)) continue;
    const nome = nomeTD(x.tipo, x.venc), pu = x.venda > 0 ? x.venda : x.pubase;
    if (!(pu > 0)) continue;
    precos[nome] = +pu.toFixed(2);
    lista.push([nome, 'vence em ' + x.venc.slice(8, 10) + '/' + x.venc.slice(5, 7) + '/' + x.venc.slice(0, 4)]);
  }
  if (lista.length < 5) throw new Error('poucos títulos (' + lista.length + ')');
  mk.tesouro = precos; ativos.tesouro = lista.sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true }));
  mk.atualizado.tesouro = new Date(maisNova + 'T12:00:00-03:00').toISOString();
  log('Tesouro: ' + lista.length + ' títulos (preços de ' + maisNova + ')');
}

/* ---------- Cripto e dólar ---------- */
const CRIPTO = ['BTC', 'ETH', 'USDC', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'LINK', 'AVAX', 'DOT', 'LTC', 'TRX', 'TON', 'SUI', 'POL', 'SHIB', 'PEPE', 'NEAR', 'APT', 'ARB', 'OP', 'ATOM', 'UNI', 'AAVE', 'RENDER', 'FET', 'HBAR', 'XLM', 'BCH', 'ETC'];
async function cripto(mk) {
  const j = await get('https://data-api.binance.vision/api/v3/ticker/price');
  const map = new Map(j.map(x => [x.symbol, +x.price]));
  const out = {};
  for (const s of CRIPTO) { const p = map.get(s + 'USDT'); if (p > 0) out[s] = p; }
  mk.cripto = out; mk.usdtbrl = map.get('USDTBRL') || mk.usdtbrl;
  mk.atualizado.cripto = agora.toISOString();
  log('Cripto: ' + Object.keys(out).length + ' moedas, USDT/BRL ' + mk.usdtbrl);
}
async function dolar(mk) {
  let v = 0;
  try { const j = await get('https://economia.awesomeapi.com.br/json/last/USD-BRL', {}, 1); v = +(j.USDBRL && j.USDBRL.bid); }
  catch (e) { const j = await get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1?formato=json'); v = brNum(j[0].valor); }
  if (v > 0) { mk.dolar = v; mk.atualizado.dolar = agora.toISOString(); }
  log('Dólar: ' + mk.dolar);
}

/* ---------- Proventos de FIIs: FundosNET ---------- */
function tag(xml, nome) { const m = new RegExp('<' + nome + '[^>]*>([^<]*)</' + nome + '>', 'i').exec(xml); return m ? m[1].trim() : ''; }
function blocos(xml, nome) { const out = [], re = new RegExp('<' + nome + '[^>]*>([\\s\\S]*?)</' + nome + '>', 'gi'); let m; while ((m = re.exec(xml))) out.push(m[1]); return out; }
async function proventosFII(mk) {
  const fim = agora, ini = new Date(agora - DIAS * 864e5);
  const docs = []; let s = 0;
  for (;;) {
    const url = 'https://fnet.bmfbovespa.com.br/fnet/publico/pesquisarGerenciadorDocumentosDados?d=' + (s / 200 | 0) + '&s=' + s + '&l=200&o%5B0%5D%5BdataEntrega%5D=desc' +
      '&tipoFundo=1&idCategoriaDocumento=14&idTipoDocumento=41&idEspecieDocumento=0&dataInicial=' + encodeURIComponent(dmY(ini)) + '&dataFinal=' + encodeURIComponent(dmY(fim));
    const j = await get(url, { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': 'https://fnet.bmfbovespa.com.br/fnet/publico/abrirGerenciadorDocumentosCVM' } });
    if (s === 0) sonda('FundosNET lista', { total: j.recordsTotal, filtrados: j.recordsFiltered, primeiro: (j.data || [])[0] });
    const d = j.data || []; docs.push(...d);
    if (d.length < 200 || docs.length >= (j.recordsFiltered || j.recordsTotal || 0) || s > 20000) break;
    s += 200;
  }
  const lidos = new Set(mk.fnetLidos || []);
  const fazer = docs.filter(d => d.status !== 'IC' && d.situacaoDocumento !== 'I' && !lidos.has(d.id));
  log('FundosNET: ' + docs.length + ' avisos de rendimento nos últimos ' + DIAS + ' dias, ' + fazer.length + ' novos');
  const fiis = new Set(Object.keys(mk.precos || {}));
  const novos = [];
  let falhas = 0, primeiro = true;
  await emLotes(fazer, 10, async d => {
    try {
      let raw = await get('https://fnet.bmfbovespa.com.br/fnet/publico/downloadDocumento?id=' + d.id, { texto: true });
      raw = raw.trim(); if (raw.startsWith('"')) raw = JSON.parse(raw);
      let xml = raw; if (!raw.includes('<')) xml = Buffer.from(raw, 'base64').toString('utf8');
      if (primeiro) { primeiro = false; sonda('FundosNET documento', xml); }
      const provs = blocos(xml, 'Provento'); if (!provs.length) provs.push(xml);
      for (const pv of provs) {
      const ticker = tickerFII(tag(pv, 'CodNegociacao') || tag(xml, 'CodNegociacao'), tag(pv, 'CodISIN') || tag(xml, 'CodISIN'), fiis);
      if (!ticker) continue;
      for (const [bloco, tipo] of [['Rendimento', 'Rendimento'], ['Amortizacao', 'Amortização']]) {
        for (const b of blocos(pv, bloco)) {
          const v = brNum(tag(b, 'ValorProventoCota') || tag(b, 'ValorProvento') || '0');
          const com = brData(tag(b, 'DataBase')) || (tag(b, 'DataBase') || '').slice(0, 10);
          const pag = brData(tag(b, 'DataPagamento')) || (tag(b, 'DataPagamento') || '').slice(0, 10);
          const t = ticker;
          if (t && v > 0 && /^\d{4}-\d{2}-\d{2}$/.test(pag)) novos.push({ t, tipo, com: /^\d{4}-\d{2}-\d{2}$/.test(com) ? com : null, pag, v: +v.toFixed(8), doc: d.id });
        }
      }
      }
      lidos.add(d.id);
    } catch (e) { falhas++; }
  });
  mk.fnetLidos = [...lidos].slice(-8000);
  log('FundosNET: ' + novos.length + ' proventos lidos' + (falhas ? ', ' + falhas + ' documentos com erro' : ''));
  if (fazer.length > 5 && !novos.length) throw new Error('nenhum provento lido dos documentos');
  juntar(mk, novos, 'fii');
  mk.atualizado.proventos = agora.toISOString();
}

/* Código de negociação do FII: o do documento, ou montado pelo ISIN (BRMXRFCTF008 → MXRF11) */
function tickerFII(cod, isin, existentes) {
  cod = (cod || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (/^[A-Z]{4}1[1-3]B?$/.test(cod)) return cod;
  isin = (isin || '').toUpperCase();
  if (/^BR[A-Z]{4}CTF/.test(isin)) { const t = isin.slice(2, 6) + '11'; if (!existentes.size || existentes.has(t)) return t; }
  return null;
}
/* Ação pelo ISIN: BRABCBACNPR4 → ABCB4 (OR=3, PR=4, PA=5, PB=6, PC=7, PD=8; units CDA=11) */
function tickerAcao(isin) {
  isin = (isin || '').toUpperCase(); if (!/^BR[A-Z0-9]{4}/.test(isin)) return null;
  const emp = isin.slice(2, 6), tipo = isin.slice(6, 9), cl = isin.slice(9, 11);
  if (tipo === 'CDA') return emp + '11';
  if (tipo !== 'ACN') return null;
  const n = { OR: 3, PR: 4, PA: 5, PB: 6, PC: 7, PD: 8 }[cl];
  return n ? emp + n : null;
}

/* ---------- Proventos de FIIs: B3 (histórico de cada fundo, uma vez por dia) ---------- */
async function proventosFIIb3(mk, ativos) {
  const fundos = [...new Set((ativos.fii || []).map(([t]) => t.slice(0, 4)))];
  const fiis = new Set((ativos.fii || []).map(([t]) => t));
  const novos = []; let falhas = 0, primeiro = true, vazios = 0;
  await emLotes(fundos, 4, async base => {
    try {
      const q = Buffer.from(JSON.stringify({ cnpj: '0', identifierFund: base, typeFund: 7 })).toString('base64');
      const j = await get('https://sistemaswebb3-listados.b3.com.br/fundsProxy/fundsCall/GetListedSupplementFunds/' + q, { timeout: 20000 }, 2);
      if (primeiro) { primeiro = false; sonda('B3 FII', { base, chaves: Object.keys(j || {}), exemplo: (j.cashDividends || []).slice(0, 2) }); }
      const lista = j.cashDividends || []; if (!lista.length) vazios++;
      for (const p of lista) {
        const pag = brData(p.paymentDate), com = brData(p.lastDatePrior), v = brNum(p.rate);
        if (!pag || !(v > 0)) continue;
        const t = tickerFII('', p.isinCode || p.assetIssued, fiis) || (fiis.has(base + '11') ? base + '11' : null);
        if (!t) continue;
        const lbl = (p.label || '').toUpperCase();
        novos.push({ t, tipo: lbl.includes('AMORT') ? 'Amortização' : 'Rendimento', com, pag, v: +v.toFixed(8) });
      }
    } catch (e) { falhas++; }
    await new Promise(r => setTimeout(r, 200));
  });
  log('B3 FIIs: ' + fundos.length + ' fundos, ' + novos.length + ' proventos' + (vazios ? ', ' + vazios + ' sem histórico' : '') + (falhas ? ', ' + falhas + ' com erro' : ''));
  if (fundos.length && falhas > fundos.length / 2) throw new Error('B3 recusou a maioria das consultas de FIIs');
  juntar(mk, novos.filter(x => x.pag >= iso(new Date(agora - 400 * 864e5))), 'fiiB3');
  mk.atualizado.proventosFII = agora.toISOString();
}

/* ---------- Proventos de ações: B3 ---------- */
async function proventosAcoes(mk, ativos) {
  const empresas = [...new Set((ativos.acao || []).map(([t]) => t).filter(t => /^[A-Z]{4}(3|4|5|6|11)$/.test(t)).map(t => t.slice(0, 4)))];
  const novos = []; let falhas = 0, primeiro = true;
  await emLotes(empresas, 4, async emp => {
    try {
      const q = Buffer.from(JSON.stringify({ issuingCompany: emp, language: 'pt-br' })).toString('base64');
      const j = await get('https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetListedSupplementCompany/' + q, {}, 2);
      const arr = Array.isArray(j) ? j : [j];
      for (const c of arr) {
        if (primeiro && c && c.cashDividends && c.cashDividends.length) { primeiro = false; sonda('B3 empresa', { emp, codes: c.code, otherCodes: c.otherCodes, exemplo: c.cashDividends.slice(0, 2) }); }
        const codigos = (c.otherCodes || []).map(o => [o.isin, o.code]);
        for (const p of c.cashDividends || []) {
          const pag = brData(p.paymentDate), com = brData(p.lastDatePrior), v = brNum(p.rate);
          if (!pag || !(v > 0)) continue;
          const isin = p.isinCode || p.assetIssued || '';
          const t = (codigos.find(x => x[0] === isin) || [])[1] || tickerAcao(isin);
          if (!t || (Object.keys(mk.precos).length && !mk.precos[t])) continue;
          const lbl = (p.label || '').toUpperCase();
          const tipo = lbl.includes('JRS') || lbl.includes('JUROS') ? 'JCP' : lbl.includes('REND') ? 'Rendimento' : 'Dividendo';
          novos.push({ t, tipo, com, pag, v: +v.toFixed(8) });
        }
      }
    } catch (e) { falhas++; }
    await new Promise(r => setTimeout(r, 250));
  });
  log('B3 ações: ' + empresas.length + ' empresas, ' + novos.length + ' proventos' + (falhas ? ', ' + falhas + ' com erro' : ''));
  if (empresas.length && falhas > empresas.length / 2) throw new Error('B3 recusou a maioria das consultas');
  juntar(mk, novos.filter(x => x.pag >= iso(new Date(agora - 400 * 864e5))), 'acao');
  mk.atualizado.proventosAcoes = agora.toISOString();
}

/* Junta proventos novos com os anteriores, sem repetir, e guarda só os últimos 13 meses e os futuros */
function juntar(mk, novos, origem) {
  const lim = iso(new Date(agora - 400 * 864e5));
  const chave = a => a.t + '|' + a.tipo + '|' + a.com + '|' + a.pag + '|' + a.v;
  const map = new Map();
  // a fonte "completa" (B3) substitui o que ela mesma tinha trazido antes; o FundosNET só acrescenta
  for (const a of mk.anuncios || []) if (a.pag >= lim && !(origem !== 'fii' && a.o === origem)) map.set(chave(a), a);
  for (const a of novos) { const x = { t: a.t, tipo: a.tipo, com: a.com, pag: a.pag, v: a.v }; if (origem !== 'fii') x.o = origem; if (!map.has(chave(x)) || origem !== 'fii') map.set(chave(x), x); }
  mk.anuncios = [...map.values()].sort((a, b) => a.pag < b.pag ? -1 : a.pag > b.pag ? 1 : a.t.localeCompare(b.t));
}

/* ---------- Rodada ---------- */
const { mk, ativos } = await anterior();
mk.atualizado = mk.atualizado || {};
if (FORCAR.includes('limpar')) { log('limpando dados anteriores'); mk.anuncios = []; mk.fnetLidos = []; mk.atualizado = {}; }
const tarefas = [
  ['acoes', () => acoes(mk, ativos), true],
  ['cripto', () => cripto(mk), true],
  ['dolar', () => dolar(mk), true],
  ['bcb', () => bcb(mk), velho(mk.atualizado.cdi, 6)],
  ['tesouro', () => tesouro(mk, ativos), velho(mk.atualizado.tesouro, 20)],
  ['fii', () => proventosFII(mk), true],
  ['proventosFII', () => proventosFIIb3(mk, ativos), velho(mk.atualizado.proventosFII, 20)],
  ['proventosAcoes', () => proventosAcoes(mk, ativos), velho(mk.atualizado.proventosAcoes, 20)]
];
const erros = [];
for (const [nome, fn, precisa] of tarefas) {
  if (!precisa && !FORCAR.includes(nome)) { log(nome + ': ainda atual, pulando'); continue; }
  try { await fn(); } catch (e) { erros.push(nome); log('ERRO em ' + nome + ': ' + e.message); }
}
mk.atualizado.robo = agora.toISOString();
{ const porO = {}; (mk.anuncios || []).forEach(a => { porO[a.o || 'fundosnet'] = (porO[a.o || 'fundosnet'] || 0) + 1; });
  log('resumo: CDI último ' + JSON.stringify((mk.cdi || []).at(-1)) + ', IPCA último ' + JSON.stringify((mk.ipca || []).at(-1)) + ', dólar ' + mk.dolar + ', USDT ' + mk.usdtbrl +
    ', ITSA4 ' + mk.precos.ITSA4 + ', MXRF11 ' + mk.precos.MXRF11 + ', Selic 2031 ' + (mk.tesouro || {})['Tesouro Selic 2031'] + ', anúncios ' + JSON.stringify(porO));
  log('MXRF11: ' + JSON.stringify((mk.anuncios || []).filter(a => a.t === 'MXRF11').slice(-3)) + ' · ITSA4: ' + JSON.stringify((mk.anuncios || []).filter(a => a.t === 'ITSA4').slice(-3)));
  log('futuros: ' + (mk.anuncios || []).filter(a => a.pag > iso(agora)).length + ', tamanhos KB: ' + JSON.stringify(Object.fromEntries(Object.entries(mk).map(([k, v]) => [k, JSON.stringify(v).length / 1024 | 0])))); }
await mkdir(OUT, { recursive: true });
const lidos = mk.fnetLidos || []; delete mk.fnetLidos;
await writeFile(OUT + '/mercado.json', JSON.stringify(mk));
await writeFile(OUT + '/robo.json', JSON.stringify({ fnetLidos: lidos }));
await writeFile(OUT + '/ativos.json', JSON.stringify(ativos));
log('gravado: ' + OUT + ' (' + (JSON.stringify(mk).length / 1024 | 0) + ' KB)' + (erros.length ? ' · falharam: ' + erros.join(', ') : ''));
if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, '### Dados de mercado\n' + (erros.length ? 'Falharam: ' + erros.join(', ') : 'Tudo certo') + '\n', { flag: 'a' }).catch(() => {});
