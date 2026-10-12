/* Dados para a aba Análise.
   - Histórico de preços (abertura, máxima, mínima, fechamento, volume) de cada ação e FII: arquivo oficial de
     cotações históricas da B3 (COTAHIST). O robô guarda o histórico no cache do GitHub Actions e acrescenta cada pregão.
   - Valor patrimonial, cotistas e segmento dos FIIs: informe mensal dos FIIs na CVM (dados abertos).
   - Gera dados/hist/TICKER.json (um arquivo por ativo) e dados/analise.json (os números de todos, para os destaques). */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const CACHE = process.env.CACHE_DIR || 'cache';
const DESDE = '2023-01-01';
const ANO = d => +d.slice(0, 4);

/* baixa um arquivo para o disco */
async function baixar(url, destino, log) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/126 Safari/537.36' } });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' em ' + url);
  await pipeline(Readable.fromWeb(r.body), createWriteStream(destino));
  return destino;
}
/* lê as linhas de um arquivo de dentro de um zip */
async function* linhasZip(zip, filtro, encoding = 'latin1') {
  const args = ['-p', zip]; if (filtro) args.push(filtro);
  const p = spawn('unzip', args);
  p.stdout.setEncoding(encoding);
  const rl = createInterface({ input: p.stdout, crlfDelay: Infinity });
  for await (const l of rl) yield l;
}
async function listaZip(zip) {
  const p = spawn('unzip', ['-Z1', zip]); let s = '';
  for await (const c of p.stdout) s += c;
  return s.split('\n').map(x => x.trim()).filter(Boolean);
}

/* ---------- Histórico de preços (COTAHIST) ---------- */
const num = (l, a, b) => parseInt(l.slice(a - 1, b), 10);
function linhaCotahist(l, validos) {
  if (!l.startsWith('01')) return null;
  const tpmerc = l.slice(24, 27); if (tpmerc !== '010') return null;
  const t = l.slice(12, 24).trim(); if (!validos.has(t)) return null;
  const d = l.slice(2, 10);
  return [t, [+d, num(l, 57, 69), num(l, 70, 82), num(l, 83, 95), num(l, 109, 121), Math.round(num(l, 171, 188) / 100000)]]; // preços em centavos, volume em mil reais
}
async function lerCotahist(zip, validos, hist) {
  let n = 0;
  for await (const l of linhasZip(zip)) {
    const r = linhaCotahist(l, validos); if (!r) continue;
    (hist[r[0]] ||= []).push(r[1]); n++;
  }
  return n;
}
async function carregarHistCache() {
  const f = CACHE + '/hist.json';
  if (!existsSync(f)) return null;
  try { return JSON.parse(await readFile(f, 'utf8')); } catch (e) { return null; }
}

export async function historico(ativos, opts) {
  const { log, sonda, forcar, agora } = opts;
  await mkdir(CACHE, { recursive: true });
  const validos = new Set([...(ativos.acao || []), ...(ativos.fii || [])].map(([t]) => t));
  let H = forcar ? null : await carregarHistCache();
  const base = 'https://bvmf.bmfbovespa.com.br/InstDados/SerHist/';
  if (!H) {
    log('histórico: montando do zero desde ' + DESDE);
    H = { ate: null, hist: {} };
    for (let a = ANO(DESDE); a <= agora.getUTCFullYear(); a++) {
      const zip = CACHE + '/A' + a + '.zip';
      try {
        await baixar(base + 'COTAHIST_A' + a + '.ZIP', zip, log);
        const n = await lerCotahist(zip, validos, H.hist);
        log('histórico ' + a + ': ' + n + ' pregões-ativo');
        await rm(zip, { force: true });
      } catch (e) { log('histórico ' + a + ': ' + e.message); if (a < agora.getUTCFullYear()) throw e; }
    }
  } else {
    // acrescenta os pregões que faltam (arquivo diário), até 15 dias para trás
    const ult = H.ate || 0; let novos = 0;
    for (let i = 15; i >= 0; i--) {
      const d = new Date(agora - i * 864e5); const ymd = +d.toISOString().slice(0, 10).replace(/-/g, '');
      if (ymd <= ult || d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
      const nome = 'COTAHIST_D' + String(d.getUTCDate()).padStart(2, '0') + String(d.getUTCMonth() + 1).padStart(2, '0') + d.getUTCFullYear() + '.ZIP';
      const zip = CACHE + '/D.zip';
      try { await baixar(base + nome, zip, log); novos += await lerCotahist(zip, validos, H.hist); await rm(zip, { force: true }); }
      catch (e) { /* feriado ou arquivo ainda não publicado */ }
    }
    log('histórico: ' + novos + ' pregões-ativo novos');
  }
  // arruma: ordena, tira repetidos, corta o que for anterior a DESDE
  const lim = +DESDE.replace(/-/g, ''); let ate = 0;
  for (const t of Object.keys(H.hist)) {
    const m = new Map(); for (const r of H.hist[t]) if (r[0] >= lim) m.set(r[0], r);
    H.hist[t] = [...m.values()].sort((a, b) => a[0] - b[0]);
    const u = H.hist[t].at(-1); if (u && u[0] > ate) ate = u[0];
  }
  H.ate = ate;
  await writeFile(CACHE + '/hist.json', JSON.stringify(H));
  if (sonda) sonda('histórico PETR4', (H.hist.PETR4 || []).slice(-3));
  log('histórico: ' + Object.keys(H.hist).length + ' ativos, último pregão ' + ate);
  return H;
}

/* ---------- Informe mensal dos FIIs (CVM) ---------- */
function g0(c, cab, nome) { const i = cab.findIndex(h => h === nome); const j = i >= 0 ? i : cab.findIndex(h => h.includes(nome)); return j >= 0 ? c[j] : ''; }
function csvLinha(l) { return l.split(';').map(x => x.replace(/^"|"$/g, '').trim()); }
export async function cvmFII(opts) {
  const { log, sonda, agora } = opts;
  const out = {}; // ticker -> { vp, cotistas, seg, pl, ref }
  const ultimo = {}; // cnpj -> dados mais recentes
  const isinDe = {}, segDe = {}, nomeDe = {}, apDe = {}, refGeral = {};
  for (const a of [agora.getUTCFullYear() - 1, agora.getUTCFullYear()]) {
    const zip = CACHE + '/cvm' + a + '.zip';
    try { await baixar('https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_' + a + '.zip', zip, log); }
    catch (e) { log('CVM ' + a + ': ' + e.message); continue; }
    const arqs = await listaZip(zip);
    for (const arq of arqs) {
      const tipo = /geral/i.test(arq) ? 'geral' : /complemento/i.test(arq) ? 'comp' : /ativo/i.test(arq) ? 'ap' : null; if (!tipo) continue;
      let cab = null;
      for await (const l of linhasZip(zip, arq)) {
        const c = csvLinha(l);
        if (!cab) { cab = c.map(x => x.toLowerCase()); if (sonda) sonda('CVM ' + arq, cab.join(' | ')); continue; }
        const g = nome => g0(c, cab, nome);
        if (tipo === 'ap') {
          const n = h => { const v = parseFloat(g(h)); return isFinite(v) ? v : 0; };
          const cnpjA = g('cnpj'), refA = g('data_referencia');
          const total = n('total_investido') || 0; if (!(total > 0)) continue;
          const papel = ['cri', 'cri_cra', 'lci', 'lci_lca', 'lig', 'letras_hipotecarias', 'certificados_deposito_valores_mobiliarios', 'debentures', 'notas_promissorias'].reduce((t, k) => t + n(k), 0);
          const comp = { total, papel, imoveis: n('direitos_bens_imoveis') + n('acoes_sociedades_atividades_fii') + n('cotas_sociedades_atividades_fii'), fii: n('fii'), ref: refA };
          if (!apDe[cnpjA] || refA > apDe[cnpjA].ref) apDe[cnpjA] = comp;
          continue;
        }
        const cnpj = g0(c, cab, 'cnpj'), ref = g0(c, cab, 'data_referencia');
        if (tipo === 'geral') {
          if (refGeral[cnpj] && ref < refGeral[cnpj]) continue; refGeral[cnpj] = ref;
          const isin = g('codigo_isin'); if (isin) isinDe[cnpj] = isin.toUpperCase();
          segDe[cnpj] = g('segmento_atuacao'); nomeDe[cnpj] = g('nome_fundo_classe');
        } else {
          const vp = parseFloat((g('valor_patrimonial_cotas') || g('valor_patrimonial_cota')).replace(',', '.'));
          const cot = parseInt(g('total_numero_cotistas') || g('numero_cotistas'), 10);
          const pl = parseFloat(g('patrimonio_liquido').replace(',', '.'));
          if (!(vp > 0)) continue;
          if (!ultimo[cnpj] || ref > ultimo[cnpj].ref) ultimo[cnpj] = { vp, cot, pl, ref };
        }
      }
    }
    await rm(zip, { force: true });
  }
  for (const [cnpj, d] of Object.entries(ultimo)) {
    const isin = isinDe[cnpj] || ''; if (!/^BR[A-Z]{4}CTF/.test(isin)) continue;
    const t = isin.slice(2, 6) + '11';
    out[t] = { vp: +d.vp.toFixed(4), cot: d.cot || null, seg: tipoFII(segDe[cnpj], apDe[cnpj], nomeDe[cnpj]), nome: nomeFII(nomeDe[cnpj]), ref: d.ref };
  }
  log('CVM: ' + Object.keys(out).length + ' FIIs com valor patrimonial');
  if (sonda) sonda('CVM tipos', ['MXRF11', 'HGLG11', 'KNCR11', 'KNRI11', 'XPML11', 'BCFF11', 'HFOF11', 'VISC11', 'CPTS11', 'BTLG11'].map(t => t + ': ' + (out[t] ? out[t].seg + ' · ' + out[t].nome : '—')).join('\n'));
  return out;
}

/* Tipo do FII pela carteira declarada à CVM: papel (CRI/LCI), fundo de fundos, tijolo (segmento) ou híbrido */
const TIJOLO = ['Logística', 'Shoppings', 'Escritórios', 'Lajes Corporativas', 'Residencial', 'Hospital', 'Varejo', 'Hotel', 'Agências', 'Educacional'];
function tipoFII(seg, ap, nome) {
  seg = (seg || '').trim();
  if (!TIJOLO.includes(seg)) { // segmento genérico na CVM: tenta pelo nome do fundo
    const n = nome || '';
    if (/log[ií]st|\blog\b/i.test(n)) seg = 'Logística';
    else if (/shopping|malls?\b/i.test(n)) seg = 'Shoppings';
    else if (/corporat|lajes|escrit|office/i.test(n)) seg = 'Escritórios';
  }
  if (ap && ap.total > 0) {
    if (ap.fii / ap.total > 0.5) return 'Fundo de fundos';
    if (ap.papel / ap.total > 0.6) return 'Papel (recebíveis)';
    if (ap.imoveis / ap.total > 0.6) return TIJOLO.includes(seg) ? seg : 'Tijolo (vários)';
    return 'Híbrido';
  }
  if (/t[íi]tulos/i.test(seg)) return 'Papel (recebíveis)';
  return TIJOLO.includes(seg) ? seg : (seg ? 'Híbrido' : '');
}
function nomeFII(n) {
  n = (n || '').replace(/^(FII|FUNDO DE INVESTIMENTO IMOBILI[AÁ]RIO)\s*[-–]?\s*/i, '').replace(/\s*-?\s*(FII|FUNDO DE INVESTIMENTO IMOBILI[AÁ]RIO).*$/i, '').replace(/ RESPONSABILIDADE LIMITADA/i, '').trim();
  n = n.replace(/\s+(RL|R\.L\.|RESP\.? LTDA\.?)$/i, '');
  return n.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase());
}

/* ---------- Indicadores ---------- */
function agrupar(rows, tipo) { // diário -> semanal ou mensal
  if (tipo === 'D') return rows;
  const out = []; let cur = null, key = null;
  for (const r of rows) {
    const s = String(r[0]); const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8)));
    let k;
    if (tipo === 'M') k = s.slice(0, 6);
    else { const seg = new Date(d); seg.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); k = seg.toISOString().slice(0, 10); }
    if (k !== key) { if (cur) out.push(cur); key = k; cur = [r[0], r[1], r[2], r[3], r[4], r[5]]; }
    else { cur[2] = Math.max(cur[2], r[2]); cur[3] = Math.min(cur[3], r[3]); cur[4] = r[4]; cur[5] += r[5]; }
  }
  if (cur) out.push(cur);
  return out;
}
export function ifr(closes, n = 14) { // IFR (RSI) de Wilder
  if (closes.length <= n) return null;
  let g = 0, p = 0;
  for (let i = 1; i <= n; i++) { const d = closes[i] - closes[i - 1]; if (d > 0) g += d; else p -= d; }
  g /= n; p /= n;
  for (let i = n + 1; i < closes.length; i++) { const d = closes[i] - closes[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; p = (p * (n - 1) + Math.max(-d, 0)) / n; }
  return p === 0 ? 100 : 100 - 100 / (1 + g / p);
}

/* Junta tudo em analise.json e grava um arquivo de histórico por ativo */
export async function gerarAnalise(H, mk, ativos, fiiCVM, saida, opts) {
  const { log, agora } = opts;
  await mkdir(saida + '/hist', { recursive: true });
  const hoje = +agora.toISOString().slice(0, 10).replace(/-/g, '');
  const ini12 = new Date(agora - 365 * 864e5).toISOString().slice(0, 10);
  const nomes = new Map([...(ativos.acao || []).map(x => [x[0], ['acao', x[1]]]), ...(ativos.fii || []).map(x => [x[0], ['fii', x[1]]])]);
  const prov = {}; for (const a of mk.anuncios || []) (prov[a.t] ||= []).push(a);
  const A = {}; let arquivos = 0;
  for (const [t, [cls, nome]] of nomes) {
    let rows = (H.hist[t] || []).slice();
    const preco = mk.precos[t];
    if (!rows.length && !preco) continue;
    // pregão de hoje com o preço atual (enquanto o arquivo oficial do dia não sai)
    const hUTC = agora.getUTCHours() + agora.getUTCMinutes() / 60, diaUtil = agora.getUTCDay() > 0 && agora.getUTCDay() < 6;
    if (preco > 0 && rows.length && rows.at(-1)[0] < hoje && diaUtil && hUTC >= 13.1 && Math.round(preco * 100) !== rows.at(-1)[4]) {
      const c = Math.round(preco * 100); rows.push([hoje, c, c, c, c, 0]);
    }
    const recentes = rows.slice(-260);
    const closes = rows.map(r => r[4] / 100);
    const liq = recentes.slice(-30).filter(r => r[5] > 0);
    const P = (prov[t] || []).filter(a => a.pag > ini12 && a.pag <= agora.toISOString().slice(0, 10));
    // meses com pagamento (feito ou já anunciado) nos últimos 12 meses-calendário, contando o atual
    const mAtual = agora.toISOString().slice(0, 7), m12 = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth() - 11, 1)).toISOString().slice(0, 7);
    const meses = new Set((prov[t] || []).filter(a => a.pag.slice(0, 7) >= m12 && a.pag.slice(0, 7) <= mAtual).map(a => a.pag.slice(0, 7)));
    const somaP = P.reduce((s, a) => s + a.v, 0);
    const ultP = [...(prov[t] || [])].filter(a => a.pag <= agora.toISOString().slice(0, 10)).sort((a, b) => a.pag < b.pag ? -1 : 1).at(-1);
    const fii = cls === 'fii' ? fiiCVM[t] : null;
    const p = preco || (closes.at(-1) || 0);
    const x = { c: cls, n: (fii && fii.nome) || nome };
    if (p) x.p = +p.toFixed(2);
    if (fii) { x.seg = fii.seg; x.vp = fii.vp; x.pvp = p ? +(p / fii.vp).toFixed(3) : null; if (fii.cot) x.cot = fii.cot; x.ref = fii.ref; }
    if (somaP && p) x.dy = +(somaP / p).toFixed(4);
    x.mp = meses.size; if (somaP) x.pm = +(somaP / Math.max(1, meses.size)).toFixed(4);
    if (ultP) { x.up = ultP.v; x.upd = ultP.pag; }
    if (liq.length) x.liq = Math.round(liq.reduce((s, r) => s + r[5], 0) / liq.length); // mil reais por dia
    if (recentes.length > 20) {
      x.mn = Math.min(...recentes.map(r => r[3])) / 100; x.mx = Math.max(...recentes.map(r => r[2])) / 100;
      const ano = rows.find(r => r[0] >= +ini12.replace(/-/g, ''));
      if (ano) x.v12 = +(p / (ano[4] / 100) - 1).toFixed(4);
      const rD = ifr(closes), rS = ifr(agrupar(rows, 'S').map(r => r[4])), rM = ifr(agrupar(rows, 'M').map(r => r[4]));
      if (rD != null) x.iD = +rD.toFixed(1); if (rS != null) x.iS = +rS.toFixed(1); if (rM != null) x.iM = +rM.toFixed(1);
    }
    A[t] = x;
    if (rows.length) { await writeFile(saida + '/hist/' + t + '.json', JSON.stringify(rows)); arquivos++; }
  }
  await writeFile(saida + '/analise.json', JSON.stringify({ atualizado: agora.toISOString(), ate: H.ate, ativos: A }));
  log('análise: ' + Object.keys(A).length + ' ativos, ' + arquivos + ' arquivos de histórico');
}
