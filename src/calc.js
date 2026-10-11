/* Contas da carteira. Tudo aqui é cálculo puro sobre:
   S.ops  — lançamentos do usuário (compra, venda, provento, aporte, resgate)
   S.mk   — dados de mercado (preços, CDI, IPCA, Tesouro, proventos anunciados, dólar)
   S.hoje — data de hoje (AAAA-MM-DD) */
import { daysBetween, parse, iso, monthKey, anoAtras, addDays, r2, hash } from './util.js';

export const S = { ops: [], mk: emptyMarket(), hoje: iso(new Date()), cutoff: null, ignorados: [] };

export function emptyMarket() {
  return { precos: {}, tesouro: {}, cripto: {}, dolar: null, usdtbrl: null, cdi: [], ipca: [], anuncios: [], atualizado: {} };
}

export const CLS = {
  acao: { nome: 'Ações', cor: 'var(--c-acao)' },
  fii: { nome: 'FIIs', cor: 'var(--c-fii)' },
  tesouro: { nome: 'Tesouro Direto', cor: 'var(--c-tesouro)' },
  cdb: { nome: 'CDB', cor: 'var(--c-cdb)' },
  cripto: { nome: 'Cripto', cor: 'var(--c-cripto)' }
};
export const ORDER = ['acao', 'fii', 'tesouro', 'cdb', 'cripto'];
export const TIPOS = { acao: ['compra', 'venda', 'provento'], fii: ['compra', 'venda', 'provento'], cripto: ['compra', 'venda'], tesouro: ['compra', 'venda'], cdb: ['aporte', 'resgate'] };
export const TIPO_NOME = { compra: 'Compra', venda: 'Venda', provento: 'Provento', aporte: 'Aporte', resgate: 'Resgate' };
const IOF = [0, 96, 93, 90, 86, 83, 80, 76, 73, 70, 66, 63, 60, 56, 53, 50, 46, 43, 40, 36, 33, 30, 26, 23, 20, 16, 13, 10, 6, 3, 0];

export const byDate = (a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : (a.ts || 0) - (b.ts || 0);
export const irRate = d => d <= 180 ? .225 : d <= 360 ? .20 : d <= 720 ? .175 : .15;
export const iofRate = d => d >= 30 ? 0 : IOF[Math.max(1, d)] / 100;

export const opsOf = (c, a) => S.ops.filter(o => o.cls === c && (a == null || o.ativo === a) && (!S.cutoff || o.data <= S.cutoff)).sort(byDate);
export const ativosOf = c => [...new Set(opsOf(c).map(o => o.ativo))];
export const cdbPadrao = () => ativosOf('cdb')[0] || null;
export function classeDe(ticker) { const o = S.ops.find(x => x.ativo === ticker && (x.cls === 'acao' || x.cls === 'fii')); return o ? o.cls : null; }

/* ---------- Preços ---------- */
export const dolarCripto = () => S.mk.usdtbrl || S.mk.dolar || 5.4;
function ultimoPreco(c, a) { const os = opsOf(c, a).filter(o => o.preco > 0); return os.length ? os[os.length - 1].preco : 0; }
export function precoAtual(c, a) {
  if (c === 'cripto') { if (a === 'USDT') return 1; const p = S.mk.cripto[a]; return p > 0 ? p : ultimoPreco(c, a); }
  if (c === 'tesouro') { const p = S.mk.tesouro[a]; return p > 0 ? p : ultimoPreco(c, a); }
  const p = S.mk.precos[a]; return p > 0 ? p : ultimoPreco(c, a);
}
export const temCotacao = (c, a) => c === 'cripto' ? (a === 'USDT' || S.mk.cripto[a] > 0) : c === 'tesouro' ? S.mk.tesouro[a] > 0 : S.mk.precos[a] > 0;

/* Valor de um lançamento em reais (compra = total pago, venda = total recebido) */
export const opTotalOrig = o => o.tipo === 'compra' ? o.qtd * o.preco + (o.taxas || 0) : o.qtd * o.preco - (o.taxas || 0);
export function opTotalBRL(o) {
  if (o.tipo === 'provento' || o.cls === 'cdb') return o.valor;
  return opTotalOrig(o) * (o.cls === 'cripto' ? (o.dolar || dolarCripto()) : 1);
}
export const opTaxBRL = o => (o.taxas || 0) * (o.cls === 'cripto' ? (o.dolar || dolarCripto()) : 1);

export function qtdEm(c, a, data) {
  let q = 0;
  for (const o of opsOf(c, a)) { if (o.data > data) break; if (o.tipo === 'compra') q += o.qtd; else if (o.tipo === 'venda') q -= o.qtd; }
  return Math.max(0, q);
}

/* ---------- Ações, FIIs e cripto: preço médio com taxas (cripto também em dólar) ---------- */
export function posRV(c, a) {
  let qtd = 0, custo = 0, custoUSD = 0, realizado = 0, prov = 0, taxas = 0, taxasUSD = 0;
  for (const o of opsOf(c, a)) {
    const f = c === 'cripto' ? (o.dolar || dolarCripto()) : 1;
    if (o.tipo === 'compra') { const t = opTotalOrig(o); qtd += o.qtd; custoUSD += t; custo += t * f; taxas += (o.taxas || 0) * f; taxasUSD += o.taxas || 0; }
    else if (o.tipo === 'venda') { const fr = qtd ? Math.min(1, o.qtd / qtd) : 0; realizado += opTotalOrig(o) * f - custo * fr; custo *= 1 - fr; custoUSD *= 1 - fr; qtd -= o.qtd; taxas += (o.taxas || 0) * f; taxasUSD += o.taxas || 0; }
    else if (o.tipo === 'provento') prov += o.valor;
  }
  if (qtd < 1e-9) { qtd = 0; custo = 0; custoUSD = 0; }
  const preco = precoAtual(c, a), mult = c === 'cripto' ? dolarCripto() : 1;
  const valorUSD = qtd * preco, valor = valorUSD * mult;
  return { qtd, custo, custoUSD, pm: qtd ? (c === 'cripto' && a !== 'USDT' ? custoUSD : custo) / qtd : 0, preco, valor, valorUSD, res: valor - custo, resPct: custo ? valor / custo - 1 : 0, realizado, prov, taxas, taxasUSD, cotado: temCotacao(c, a) };
}

/* ---------- Inflação (IPCA mês a mês) ---------- */
export function fInf(data) {
  const ip = S.mk.ipca || []; if (!ip.length) return 1;
  const m0 = monthKey(data), d = parse(data);
  const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  let f = 1;
  for (const [m, v] of ip) {
    if (m > m0) f *= 1 + v / 100;
    else if (m === m0) f *= Math.pow(1 + v / 100, (dim - d.getDate() + 1) / dim);
  }
  return f;
}

/* Retorno total: valor de hoje + vendas + proventos − tudo que foi pago.
   Versão real: cada valor corrigido pela inflação até hoje. */
export function retorno(c, a) {
  const p = posRV(c, a); let inv = 0, invR = 0, vend = 0, vendR = 0, prov = 0, provR = 0, first = null;
  for (const o of opsOf(c, a)) {
    const v = opTotalBRL(o), f = fInf(o.data);
    if (o.tipo === 'compra') { inv += v; invR += v * f; if (!first) first = o.data; }
    else if (o.tipo === 'venda') { vend += v; vendR += v * f; }
    else if (o.tipo === 'provento') { prov += v; provR += v * f; }
  }
  const total = p.valor + vend + prov - inv, real = p.valor + vendR + provR - invR;
  return { valoriz: p.res, realizado: p.realizado, prov, total, pct: inv ? total / inv : 0, real, realPct: invR ? real / invR : 0, ipca: first ? fInf(first) - 1 : 0, temIpca: (S.mk.ipca || []).length > 0 };
}
export function dy12(a) {
  const ini = anoAtras(S.hoje), preco = S.mk.precos[a]; if (!preco) return null;
  const s = (S.mk.anuncios || []).filter(A => A.t === a && A.pag > ini && A.pag <= S.hoje).reduce((t, A) => t + A.v, 0);
  return s ? s / preco : null;
}
export function yoc(c, a) {
  const ini = anoAtras(S.hoje), p = posRV(c, a); if (!p.custo) return null;
  const s = opsOf(c, a).filter(o => o.tipo === 'provento' && o.data > ini).reduce((t, o) => t + o.valor, 0);
  return s / p.custo;
}

/* ---------- Tesouro: lotes por data de compra, IR pelo prazo de cada lote ---------- */
export function posTesouro(a) {
  let lots = [], realizado = 0, taxas = 0;
  for (const o of opsOf('tesouro', a)) {
    taxas += o.taxas || 0;
    if (o.tipo === 'compra') lots.push({ data: o.data, qtd: o.qtd, custo: o.qtd * o.preco + (o.taxas || 0) });
    else if (o.tipo === 'venda') {
      let rem = o.qtd, custoSai = 0;
      for (const L of lots) { if (rem <= 1e-12) break; const t = Math.min(rem, L.qtd), c = L.custo * t / L.qtd; L.custo -= c; L.qtd -= t; custoSai += c; rem -= t; }
      lots = lots.filter(L => L.qtd > 1e-9); realizado += o.qtd * o.preco - (o.taxas || 0) - custoSai;
    }
  }
  const preco = precoAtual('tesouro', a); let qtd = 0, custo = 0, valor = 0, iof = 0, ir = 0, wd = 0;
  for (const L of lots) {
    const v = L.qtd * preco, g = v - L.custo, d = daysBetween(L.data, S.hoje); let i1 = 0, i2 = 0;
    if (g > 0) { i1 = g * iofRate(d); i2 = (g - i1) * irRate(d); }
    qtd += L.qtd; custo += L.custo; valor += v; iof += i1; ir += i2; wd += L.custo * d;
  }
  const liq = valor - iof - ir, avgDays = custo ? wd / custo : 0;
  return { qtd, custo, preco, valor, iof, ir, liq, res: valor - custo, resPct: custo ? valor / custo - 1 : 0, liqPct: custo ? liq / custo - 1 : 0, aa: anual(custo, liq, avgDays), realizado, taxas, lots, cotado: temCotacao('tesouro', a) };
}

/* ---------- CDB: CDI de cada dia útil (Banco Central) ---------- */
function idxDe(d) { // primeira posição da série com data >= d
  const s = S.mk.cdi; let lo = 0, hi = s.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (s[m][0] < d) lo = m + 1; else hi = m; }
  return lo;
}
/* Fator do CDI de "de" (inclusive) até "ate" (exclusive), a pct% do CDI */
export function fatorCDI(de, ate, pct) {
  const s = S.mk.cdi; let f = 1;
  for (let i = idxDe(de); i < s.length && s[i][0] < ate; i++) f *= 1 + s[i][1] / 100 * pct / 100;
  return f;
}
export function ultimoDiaCDI() { const s = S.mk.cdi; const i = idxDe(S.hoje) - 1; return i >= 0 ? s[i][0] : null; }

function lotNet(L, ate) {
  const g = L.valor * fatorCDI(L.data, ate, L.pct), y = g - L.valor, d = daysBetween(L.data, ate);
  const i1 = y > 0 ? y * iofRate(d) : 0, i2 = y > 0 ? (y - i1) * irRate(d) : 0;
  return { g, i1, i2, net: g - i1 - i2, d };
}
/* Aportes são lotes. Resgate = valor líquido que cai na conta; sai dos aportes mais antigos. */
export function cdbLots(a, cutoff) {
  let lots = [];
  for (const o of opsOf('cdb', a)) {
    if (o.data > cutoff) break;
    if (o.tipo === 'aporte') lots.push({ data: o.data, valor: o.valor, pct: o.pct || 100 });
    else if (o.tipo === 'resgate') {
      let rem = o.valor;
      for (const L of lots) { if (rem <= 1e-6) break; const n = lotNet(L, o.data).net; const f = Math.min(1, rem / n); L.valor *= 1 - f; rem -= f * n; }
      lots = lots.filter(L => L.valor > 0.005);
    }
  }
  return lots;
}
export function cdbValor(a, asOf, cutoff) {
  const lots = cdbLots(a, cutoff || asOf); let aplicado = 0, bruto = 0, iof = 0, ir = 0, wd = 0;
  for (const L of lots) { const n = lotNet(L, asOf); aplicado += L.valor; bruto += n.g; iof += n.i1; ir += n.i2; wd += L.valor * n.d; }
  return { aplicado, bruto, iof, ir, liq: bruto - iof - ir, avgDays: aplicado ? wd / aplicado : 0, pct: lots.length ? lots[lots.length - 1].pct : 100, lots };
}
export function posCDB(a) {
  const v = cdbValor(a, S.hoje);
  const d1 = ultimoDiaCDI();
  const hoje = d1 ? cdbValor(a, S.hoje, d1).liq - cdbValor(a, d1, d1).liq : 0;
  return Object.assign(v, { valor: v.bruto, custo: v.aplicado, res: v.bruto - v.aplicado, resPct: v.aplicado ? v.bruto / v.aplicado - 1 : 0,
    acum: v.liq - v.aplicado, liqPct: v.aplicado ? v.liq / v.aplicado - 1 : 0, aa: anual(v.aplicado, v.liq, v.avgDays), hoje, diaHoje: d1, taxas: 0, cotado: true });
}
function anual(base, liq, dias) { if (!base || dias < 30) return null; return Math.pow(liq / base, 365 / dias) - 1; }

export function pos(c, a) { return c === 'tesouro' ? posTesouro(a) : c === 'cdb' ? posCDB(a) : posRV(c, a); }
export function carteira() {
  const out = { classes: {}, total: 0, custo: 0 };
  for (const c of ORDER) {
    const items = ativosOf(c).map(a => Object.assign({ ativo: a, cls: c }, pos(c, a))).filter(p => p.valor > 0.005).sort((x, y) => y.valor - x.valor);
    const C = { items, valor: 0, custo: 0, liq: 0, valorUSD: 0 };
    items.forEach(p => { C.valor += p.valor; C.custo += p.custo; C.liq += p.liq ?? p.valor; C.valorUSD += p.valorUSD || 0; });
    out.classes[c] = C; out.total += C.valor; out.custo += C.custo;
  }
  out.ordem = ORDER.filter(c => out.classes[c].items.length).sort((x, y) => out.classes[y].valor - out.classes[x].valor);
  return out;
}

/* ---------- Pagar com / guardar em: CDB ou USDT ---------- */
// Compras e vendas de cripto (menos o próprio USDT) usam o USDT, se você tiver; o resto usa o CDB.
export function fonteDe(c, ativo, tipo) {
  if (c === 'cdb' || !['compra', 'venda'].includes(tipo)) return null;
  if (c === 'cripto' && String(ativo).toUpperCase() !== 'USDT' && ativosOf('cripto').includes('USDT')) return 'usdt';
  return cdbPadrao() ? 'cdb' : null;
}
export function linkedOp(o, fonte, cdbNome, cdbPct) {
  if (fonte === 'cdb') {
    const v = r2(opTotalBRL(o));
    return o.tipo === 'compra' ? { cls: 'cdb', tipo: 'resgate', ativo: cdbNome, data: o.data, valor: v, de: o.id }
      : { cls: 'cdb', tipo: 'aporte', ativo: cdbNome, data: o.data, valor: v, pct: cdbPct, de: o.id };
  }
  const u = r2(opTotalOrig(o));
  return { cls: 'cripto', tipo: o.tipo === 'compra' ? 'venda' : 'compra', ativo: 'USDT', data: o.data, qtd: u, preco: 1, taxas: 0, dolar: o.dolar, de: o.id };
}
export const fonteTxt = (fonte, tipo) => tipo === 'compra' ? (fonte === 'usdt' ? 'pago com USDT' : 'pago com o CDB') : (fonte === 'usdt' ? 'guardado em USDT' : 'guardado no CDB');

/* ---------- Proventos anunciados ---------- */
export const chaveAnuncio = A => A.t + '|' + A.tipo + '|' + A.com + '|' + A.pag + '|' + A.v;
export const idAnuncio = A => 'p' + hash(chaveAnuncio(A));
/* Os já pagos viram lançamentos de provento (com a quantidade que você tinha na data com) */
export function proventosPendentes() {
  const out = [], ign = new Set(S.ignorados || []), tem = new Set(S.ops.map(o => o.id));
  for (const A of S.mk.anuncios || []) {
    if (A.pag > S.hoje || !A.com) continue;
    const id = idAnuncio(A); if (tem.has(id) || ign.has(id)) continue;
    const c = classeDe(A.t); if (!c) continue;
    const q = qtdEm(c, A.t, A.com); if (q <= 0) continue;
    out.push({ id, cls: c, tipo: 'provento', ativo: A.t, data: A.pag, valor: r2(q * A.v), provTipo: A.tipo, auto: true, porCota: A.v, qtdCom: q });
  }
  return out;
}
export function aReceber() {
  const out = [];
  for (const A of S.mk.anuncios || []) {
    if (A.pag <= S.hoje) continue;
    const c = classeDe(A.t); if (!c) continue;
    const est = !A.com || A.com > S.hoje, q = est ? posRV(c, A.t).qtd : qtdEm(c, A.t, A.com);
    if (q > 0) out.push(Object.assign({ cls: c, q, est, total: r2(q * A.v) }, A));
  }
  return out.sort((x, y) => x.pag < y.pag ? -1 : x.pag > y.pag ? 1 : 0);
}

/* ---------- Relatório para o IR: posição em 31/12 e proventos do ano ---------- */
export function relatorioIR(ano) {
  const fim = ano + '-12-31', antes = S.cutoff; S.cutoff = fim;
  const bens = [];
  try {
    for (const c of ORDER) for (const a of ativosOf(c)) {
      if (c === 'cdb') {
        const v = cdbValor(a, addDays(fim, 1), fim);
        if (v.aplicado > 0.005) bens.push({ cls: c, ativo: a, qtd: null, valor: v.bruto, nota: 'saldo bruto em 31/12' });
      } else if (c === 'tesouro') {
        const p = posTesouro(a); if (p.qtd > 0) bens.push({ cls: c, ativo: a, qtd: p.qtd, valor: p.custo, nota: 'custo de compra' });
      } else {
        const p = posRV(c, a); if (p.qtd > 0) bens.push({ cls: c, ativo: a, qtd: p.qtd, valor: p.custo, nota: 'custo de compra' });
      }
    }
  } finally { S.cutoff = antes; }
  const provs = S.ops.filter(o => o.tipo === 'provento' && o.data.startsWith(ano));
  const porTipo = {}, porAtivo = {};
  for (const o of provs) {
    const t = o.cls === 'fii' ? 'Rendimentos de FIIs' : (o.provTipo === 'JCP' ? 'JCP' : 'Dividendos');
    porTipo[t] = (porTipo[t] || 0) + o.valor;
    const k = t + '|' + o.ativo; porAtivo[k] = (porAtivo[k] || 0) + o.valor;
  }
  return { ano, bens, porTipo, porAtivo };
}
export function codigoIR(c, a) {
  if (c === 'acao') return '03 · 01';
  if (c === 'fii') return '07 · 03';
  if (c === 'tesouro' || c === 'cdb') return '04 · 02';
  if (c === 'cripto') return a === 'BTC' ? '08 · 01' : (['USDT', 'USDC', 'DAI', 'FDUSD'].includes(a) ? '08 · 03' : '08 · 02');
  return '';
}
