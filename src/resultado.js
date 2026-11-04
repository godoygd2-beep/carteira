/* Resultado da carteira inteira: quanto você ganhou de verdade, contando proventos, renda fixa e inflação,
   e quanto teria se o mesmo dinheiro tivesse ficado no CDI.
   - Entradas e saídas de dinheiro "de fora": compras e aportes pagos por você; vendas, resgates e proventos que saíram.
     O que só muda de lugar (compra paga com o CDB, venda guardada no USDT) não conta.
   - Valor da carteira no passado: ações e FIIs pelo preço de fechamento do dia (histórico da B3), CDB pelo CDI de cada dia.
     Tesouro e cripto não têm histórico no app: o ganho até hoje é distribuído em linha reta no tempo. */
import { S, ORDER, opsOf, ativosOf, posRV, posTesouro, cdbValor, opTotalBRL, fInf, fatorCDI, qtdEm } from './calc.js';
import { addDays, daysBetween } from './util.js';

const ymd = d => +d.replace(/-/g, '');
function fechamento(rows, d) { // último fechamento até a data d
  const k = ymd(d); let lo = 0, hi = rows.length - 1, r = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (rows[m][0] <= k) { r = m; lo = m + 1; } else hi = m - 1; }
  return r >= 0 ? rows[r][4] / 100 : null;
}

export function fluxosExternos() {
  const out = [];
  for (const o of S.ops) {
    if (o.de) continue;                                    // lançamento automático: dinheiro só mudou de lugar
    if (o.tipo === 'provento') { out.push({ data: o.data, v: -o.valor }); continue; }
    if (o.link) continue;                                  // compra paga pelo CDB/USDT ou venda guardada nele
    const v = opTotalBRL(o);
    if (o.tipo === 'compra' || o.tipo === 'aporte') out.push({ data: o.data, v });
    else if (o.tipo === 'venda' || o.tipo === 'resgate') out.push({ data: o.data, v: -v });
  }
  return out.sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : 0);
}

/* valor de hoje e custo de hoje de cada ativo (para estimar Tesouro e cripto no passado) */
function hojeDe(c, a) {
  if (c === 'cdb') { const v = cdbValor(a, S.hoje); return { valor: v.liq, custo: v.aplicado }; }
  if (c === 'tesouro') { const p = posTesouro(a); return { valor: p.liq, custo: p.custo }; }
  const p = posRV(c, a); return { valor: p.valor, custo: p.custo };
}

export function patrimonioEm(t, hist, info) {
  if (t >= S.hoje) return ORDER.reduce((s, c) => s + ativosOf(c).reduce((x, a) => x + info[c + a].valor, 0), 0);
  const ant = S.cutoff; S.cutoff = t; let v = 0;
  try {
    for (const c of ORDER) for (const a of ativosOf(c)) {
      if (c === 'cdb') { v += cdbValor(a, addDays(t, 1), t).liq; continue; }
      const I = info[c + a];
      if ((c === 'acao' || c === 'fii') && hist[a]) {
        const q = qtdEm(c, a, t); if (q <= 0) continue;
        const p = fechamento(hist[a], t);
        if (p != null) { v += q * p; continue; }
      }
      const custo = c === 'tesouro' ? posTesouro(a).custo : posRV(c, a).custo; if (!(custo > 0)) continue;
      const r = I.custo > 0 ? I.valor / I.custo - 1 : 0;
      const tot = Math.max(1, daysBetween(I.d0, S.hoje)), w = Math.min(1, Math.max(0, daysBetween(I.d0, t) / tot));
      v += custo * (1 + r * w);
    }
  } finally { S.cutoff = ant; }
  return v;
}

/* periodo: 'tudo' | '12m' | 'ano' */
export function calcularResultado(periodo, hist) {
  const fl = fluxosExternos(); if (!fl.length) return null;
  const info = {};
  for (const c of ORDER) for (const a of ativosOf(c)) { const os = opsOf(c, a); info[c + a] = Object.assign(hojeDe(c, a), { d0: os.length ? os[0].data : S.hoje }); }
  const primeiro = addDays(fl[0].data, -1);
  let P = periodo === '12m' ? addDays(S.hoje, -365) : periodo === 'ano' ? (+S.hoje.slice(0, 4) - 1) + '-12-31' : primeiro;
  if (P < primeiro) P = primeiro;
  // datas do gráfico: uma por semana (ou por dia, em períodos curtos) e hoje
  const dias = daysBetween(P, S.hoje), passo = dias > 400 ? 7 : dias > 120 ? 3 : 1;
  const datas = []; for (let d = P; d < S.hoje; d = addDays(d, passo)) datas.push(d); datas.push(S.hoje);
  const V0 = patrimonioEm(P, hist, info);
  let cdi = V0, inf = V0, base = V0, baseInf = V0 * (fInf(P) / fInf(S.hoje) || 1), A = 0, W = 0, k = 0;
  const serie = [];
  while (k < fl.length && fl[k].data <= P) k++;
  for (let i = 0; i < datas.length; i++) {
    const t = datas[i], tp = i ? datas[i - 1] : P;
    if (i) { cdi *= fatorCDI(tp, t, 100); inf *= fInf(tp) / fInf(t); }
    while (k < fl.length && fl[k].data <= t) {
      const f = fl[k++];
      cdi += f.v * fatorCDI(f.data, t, 100); inf += f.v * fInf(f.data) / fInf(t);
      if (f.v > 0) { A += f.v; base += f.v; baseInf += f.v * fInf(f.data) / fInf(S.hoje); } else W -= f.v;
    }
    serie.push({ t, carteira: patrimonioEm(t, hist, info), cdi, inf });
  }
  const fim = serie[serie.length - 1];
  const res = fim.carteira + W - A - V0;
  const out = { periodo, P, V0, A, W, res, resPct: base ? res / base : 0, real: fim.carteira - fim.inf, realPct: baseInf ? (fim.carteira - fim.inf) / baseInf : 0,
    vsCdi: fim.carteira - fim.cdi, cdiFim: fim.cdi, serie, temIpca: (S.mk.ipca || []).length > 0 };
  if (periodo === 'tudo' || P === primeiro) {
    let valoriz = 0, vendas = 0, prov = 0, fixa = 0;
    for (const c of ['acao', 'fii', 'cripto']) for (const a of ativosOf(c)) { const p = posRV(c, a); valoriz += p.res; vendas += p.realizado; prov += p.prov; }
    for (const a of ativosOf('tesouro')) { const p = posTesouro(a); fixa += p.liq - p.custo; vendas += p.realizado; }
    for (const a of ativosOf('cdb')) { let f = cdbValor(a, S.hoje).liq; for (const o of opsOf('cdb', a)) f += o.tipo === 'resgate' ? o.valor : -o.valor; fixa += f; }
    out.partes = { valoriz, prov, fixa, vendas };
  }
  return out;
}
