/* Fundamentos das empresas (balanços entregues à CVM, dados abertos).
   - DFP: demonstrações anuais (5 anos de histórico).
   - ITR: trimestrais (para somar os últimos 12 meses).
   - FCA: liga cada empresa aos códigos de negociação (PETR3, PETR4…).
   Gera dados/fundamentos.json: indicadores dos últimos 12 meses e histórico anual de cada empresa. */
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { existsSync, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const CACHE = process.env.CACHE_DIR || 'cache';
const BASE = 'https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/';

async function baixar(url, destino) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/126 Safari/537.36' } });
  if (!r.ok) throw new Error('HTTP ' + r.status + ' em ' + url);
  await pipeline(Readable.fromWeb(r.body), createWriteStream(destino));
}
async function listaZip(zip) { const p = spawn('unzip', ['-Z1', zip]); let s = ''; for await (const c of p.stdout) s += c; return s.split('\n').map(x => x.trim()).filter(Boolean); }
async function* linhasZip(zip, arq) {
  const p = spawn('unzip', ['-p', zip, arq]); p.stdout.setEncoding('latin1');
  for await (const l of createInterface({ input: p.stdout, crlfDelay: Infinity })) yield l;
}
const campos = l => l.split(';').map(x => x.replace(/^"|"$/g, '').trim());
const prof = cod => cod.split('.').length;

/* Contas que interessam em cada demonstração */
const RE_DEPREC = /deprecia|amortiza|exaust/i;
const RE_CAPEX = /(aquisi|compra|adi[cç][aã]o|investimento).*(imobilizad|intang)|(imobilizad|intang).*(aquisi|compra|adi[cç])/i;
function interessa(tipo, cod, ds) {
  if (tipo === 'DRE') return prof(cod) <= 2;
  if (tipo === 'BPA') return ['1', '1.01', '1.01.01', '1.01.02'].includes(cod);
  if (tipo === 'BPP') return ['2', '2.01', '2.01.04', '2.02', '2.02.01'].includes(cod) || prof(cod) === 2;
  if (tipo === 'DFC') return ['6.01', '6.02', '6.03'].includes(cod) || (cod.startsWith('6.01.01.') && RE_DEPREC.test(ds)) || (cod.startsWith('6.02.') && prof(cod) === 3 && RE_CAPEX.test(ds));
  return false;
}

/* Lê um zip (DFP ou ITR) e guarda: dados[cd][chave] = { cod: [valor, descrição] }
   chave = tipo|fim|início|ordem (início só em DRE/DFC) */
async function lerZip(zip, dados, empresas, log) {
  const arqs = await listaZip(zip);
  for (const cons of ['con', 'ind']) {
    for (const tipo of ['DRE', 'BPA', 'BPP', 'DFC_MI', 'DFC_MD']) {
      const arq = arqs.find(a => new RegExp('_' + tipo + '_' + cons + '_', 'i').test(a)); if (!arq) continue;
      const T = tipo.startsWith('DFC') ? 'DFC' : tipo;
      let cab = null, n = 0;
      for await (const l of linhasZip(zip, arq)) {
        const c = campos(l);
        if (!cab) { cab = Object.fromEntries(c.map((h, i) => [h.toUpperCase(), i])); continue; }
        const cod = c[cab.CD_CONTA], ds = c[cab.DS_CONTA];
        if (!interessa(T, cod, ds)) continue;
        const cd = c[cab.CD_CVM], ver = +c[cab.VERSAO] || 1;
        const fim = c[cab.DT_FIM_EXERC] || c[cab.DT_REFER], ini = cab.DT_INI_EXERC != null ? c[cab.DT_INI_EXERC] : '';
        const ordem = /PEN/i.test(c[cab.ORDEM_EXERC]) ? 'P' : 'U';
        const esc = /MIL/i.test(c[cab.ESCALA_MOEDA]) ? 1000 : 1;
        const v = parseFloat(c[cab.VL_CONTA]) * esc; if (!isFinite(v)) continue;
        const ref = c[cab.DT_REFER];
        empresas[cd] = empresas[cd] || { cnpj: c[cab.CNPJ_CIA], nome: c[cab.DENOM_CIA] };
        const E = (dados[cd] ||= {});
        // consolidado vale mais que individual; versão mais nova vale mais que a antiga
        const k = T + '|' + fim + '|' + ini + '|' + ordem + '|' + ref;
        const atual = E[k];
        if (atual && (atual._cons === 'con' && cons === 'ind' || (atual._cons === cons && atual._ver > ver))) continue;
        if (!atual || atual._ver !== ver || atual._cons !== cons) E[k] = { _ver: ver, _cons: cons };
        E[k][cod] = [v, ds]; n++;
      }
      if (log && n) log('  ' + arq + ': ' + n + ' linhas úteis');
    }
  }
}

/* ---------- Leitura das demonstrações de uma empresa ---------- */
const val = (o, cod) => o && o[cod] ? o[cod][0] : null;
function porDs(o, re, depth) { if (!o) return null; for (const [cod, x] of Object.entries(o)) { if (cod.startsWith('_')) continue; if ((!depth || prof(cod) === depth) && re.test(x[1])) return x[0]; } return null; }
function lucroDe(dre) {
  if (!dre) return null;
  // última linha de lucro do período (consolidado), nível 2
  let melhor = null;
  for (const [cod, x] of Object.entries(dre)) {
    if (cod.startsWith('_') || prof(cod) !== 2) continue;
    if (/lucro|preju[ií]zo/i.test(x[1]) && /(per[ií]odo|exerc[ií]cio)/i.test(x[1]) && !/antes|operacional|bruto|por a[cç][aã]o/i.test(x[1])) {
      if (!melhor || cod.localeCompare(melhor[0], undefined, { numeric: true }) > 0) melhor = [cod, x[0]];
    }
  }
  return melhor ? melhor[1] : val(dre, '3.11') ?? val(dre, '3.09');
}
function ehFinanceira(dre) {
  const r = dre && dre['3.01'] ? dre['3.01'][1] : '';
  return /intermedia[cç][aã]o financeira|pr[eê]mios|receitas de opera[cç][oõ]es|seguros/i.test(r);
}
function fluxo(E, T, fim, ini, ordem) { // DRE ou DFC de um período
  for (const [k, o] of Object.entries(E)) { const p = k.split('|'); if (p[0] === T && p[1] === fim && p[2] === ini && p[3] === ordem) return o; }
  return null;
}
function itensDRE(dre) {
  if (!dre) return null;
  return { receita: val(dre, '3.01'), ebit: val(dre, '3.05'), lucro: lucroDe(dre), fin: ehFinanceira(dre) };
}
function itensDFC(dfc) {
  if (!dfc) return null;
  let dep = 0, capex = 0;
  for (const [cod, x] of Object.entries(dfc)) {
    if (cod.startsWith('_')) continue;
    if (cod.startsWith('6.01.01.') && RE_DEPREC.test(x[1])) dep += Math.abs(x[0]);
    if (cod.startsWith('6.02.') && RE_CAPEX.test(x[1]) && x[0] < 0) capex += x[0];
  }
  return { fco: val(dfc, '6.01'), dep, capex };
}
function itensBal(bpa, bpp) {
  if (!bpa || !bpp) return null;
  const caixa = (val(bpa, '1.01.01') || 0) + (val(bpa, '1.01.02') || 0);
  const divida = (val(bpp, '2.01.04') || 0) + (val(bpp, '2.02.01') || 0);
  const pl = porDs(bpp, /patrim[oô]nio l[ií]quido consolidado/i, 2) ?? porDs(bpp, /patrim[oô]nio l[ií]quido/i, 2) ?? val(bpp, '2.03');
  return { caixa, divida, divLiq: divida - caixa, pl, ac: val(bpa, '1.01'), pc: val(bpp, '2.01'), ativo: val(bpa, '1') };
}
function balanco(E, data, ordem) {
  let bpa = null, bpp = null;
  for (const [k, o] of Object.entries(E)) { const p = k.split('|'); if (p[1] !== data || p[3] !== ordem) continue; if (p[0] === 'BPA') bpa = o; if (p[0] === 'BPP') bpp = o; }
  return itensBal(bpa, bpp);
}
const soma = (a, b, c) => a == null ? null : a + (b ?? 0) - (c ?? 0);

/* Junta tudo de uma empresa: anual (DFP) e últimos 12 meses (ITR) */
function montarEmpresa(D, I) {
  // anos do DFP: períodos de 12 meses terminando em 31/12
  const anos = {};
  for (const [k, o] of Object.entries(D || {})) {
    const [T, fim, ini, ordem] = k.split('|');
    if (!fim.endsWith('-12-31')) continue;
    const y = fim.slice(0, 4), A = (anos[y] ||= { ano: +y });
    if (T === 'DRE' && ini === y + '-01-01') Object.assign(A, itensDRE(o));
    if (T === 'DFC' && ini === y + '-01-01') Object.assign(A, itensDFC(o));
  }
  for (const y of Object.keys(anos)) { const b = balanco(D, y + '-12-31', 'U') || balanco(D, y + '-12-31', 'P'); if (b) Object.assign(anos[y], b); }
  const lista = Object.values(anos).filter(a => a.receita != null || a.lucro != null).sort((a, b) => a.ano - b.ano).slice(-6);
  if (!lista.length) return null;
  const ult = lista[lista.length - 1];
  // últimos 12 meses: DFP do último ano + acumulado do ITR mais recente − mesmo período do ano anterior
  let ttm = Object.assign({}, ult), ref = ult.ano + '-12-31', fonte = 'anual';
  const itrFins = [...new Set(Object.keys(I || {}).map(k => k.split('|')).filter(p => p[0] === 'DRE' && p[3] === 'U').map(p => p[1]))].sort();
  const fimItr = itrFins[itrFins.length - 1];
  if (fimItr && fimItr > ref) {
    const y = fimItr.slice(0, 4), ini = y + '-01-01', ant = (+y - 1) + fimItr.slice(4), iniAnt = (+y - 1) + '-01-01';
    const atu = itensDRE(fluxo(I, 'DRE', fimItr, ini, 'U')), pas = itensDRE(fluxo(I, 'DRE', ant, iniAnt, 'P'));
    const fAtu = itensDFC(fluxo(I, 'DFC', fimItr, ini, 'U')), fPas = itensDFC(fluxo(I, 'DFC', ant, iniAnt, 'P'));
    const base = anos[String(+y - 1)];
    if (atu && pas && base && +y - 1 === ult.ano) {
      ttm = { receita: soma(base.receita, atu.receita, pas.receita), ebit: soma(base.ebit, atu.ebit, pas.ebit), lucro: soma(base.lucro, atu.lucro, pas.lucro), fin: atu.fin };
      if (fAtu && fPas && base.fco != null) Object.assign(ttm, { fco: soma(base.fco, fAtu.fco, fPas.fco), dep: soma(base.dep, fAtu.dep, fPas.dep), capex: soma(base.capex, fAtu.capex, fPas.capex) });
      else Object.assign(ttm, { fco: null, dep: null, capex: null });
      ref = fimItr; fonte = '12m';
    }
    const b = balanco(I, fimItr, 'U'); if (b) Object.assign(ttm, b);
  }
  return { anos: lista, ttm, ref, fonte };
}

/* Indicadores a partir dos números */
const div = (a, b) => (a == null || b == null || b === 0) ? null : a / b;
const r4 = v => v == null || !isFinite(v) ? null : +v.toFixed(4);
function indicadores(e, mcap, setorFin) {
  const t = e.ttm;
  // bancos, seguradoras e holdings: margem, dívida e caixa não se medem como numa empresa comum
  const holding = t.receita == null || t.receita <= 0 || (t.lucro > 0 && t.lucro > 0.8 * t.receita);
  const fin = !!t.fin || !!setorFin || holding;
  const ebitda = t.ebit != null ? t.ebit + (t.dep || 0) : null;
  const fcl = t.fco != null ? t.fco + (t.capex || 0) : null;
  const anosLucro = e.anos.slice(-5).filter(a => a.lucro > 0).length;
  const a5 = e.anos.slice(-5), pri = a5[0], ul = a5[a5.length - 1], n = ul && pri ? ul.ano - pri.ano : 0;
  const cagr = (x, y) => n > 0 && x > 0 && y > 0 ? Math.pow(y / x, 1 / n) - 1 : null;
  const I = {
    fin, roe: div(t.lucro, t.pl), ml: div(t.lucro, t.receita), anosLucro, nAnos: a5.length,
    cRec: cagr(pri && pri.receita, ul && ul.receita), cLuc: cagr(pri && pri.lucro, ul && ul.lucro),
    pl: mcap ? div(mcap, t.lucro) : null, pvp: mcap ? div(mcap, t.pl) : null
  };
  if (!fin) Object.assign(I, {
    me: div(t.ebit, t.receita), dle: ebitda > 0 ? div(t.divLiq, ebitda) : null, dlpl: div(t.divLiq, t.pl), lc: div(t.ac, t.pc),
    fcoL: t.lucro > 0 && t.receita > 0 && t.lucro / t.receita >= 0.03 ? div(t.fco, t.lucro) : null, fcl, evEbit: mcap && t.ebit > 0 ? div(mcap + (t.divLiq || 0), t.ebit) : null, ebitda
  });
  for (const k of Object.keys(I)) if (typeof I[k] === 'number') I[k] = r4(I[k]);
  return I;
}

/* ---------- Rodada ---------- */
export async function fundamentos(ativos, mk, opts) {
  const { log, sonda, agora, forcar } = opts;
  await mkdir(CACHE, { recursive: true });
  const Y = agora.getUTCFullYear();
  const cacheF = CACHE + '/fund-dfp.json';
  // DFP (anual) muda pouco: guarda pronto no cache e só baixa de novo uma vez por semana
  let dfp = null;
  if (!forcar && existsSync(cacheF)) { try { dfp = JSON.parse(await readFile(cacheF, 'utf8')); if ((agora - new Date(dfp.ts)) > 7 * 864e5) dfp = null; } catch (e) { dfp = null; } }
  if (!dfp) {
    const D = {}, emp = {};
    for (let a = Y - 5; a <= Y; a++) {
      const zip = CACHE + '/dfp.zip';
      try { await baixar(BASE + 'DFP/DADOS/dfp_cia_aberta_' + a + '.zip', zip); log('DFP ' + a + ': baixado'); await lerZip(zip, D, emp, sonda ? log : null); }
      catch (e) { log('DFP ' + a + ': ' + e.message); }
      await rm(zip, { force: true });
    }
    dfp = { ts: agora.toISOString(), D, emp };
    await writeFile(cacheF, JSON.stringify(dfp));
  }
  // ITR do ano atual (e do anterior, para os primeiros meses do ano)
  const I = {}, empI = {};
  for (const a of [Y - 1, Y]) {
    const zip = CACHE + '/itr.zip';
    try { await baixar(BASE + 'ITR/DADOS/itr_cia_aberta_' + a + '.zip', zip); log('ITR ' + a + ': baixado'); await lerZip(zip, I, empI, sonda ? log : null); }
    catch (e) { log('ITR ' + a + ': ' + e.message); }
    await rm(zip, { force: true });
  }
  // códigos de negociação de cada empresa (FCA)
  const tickersDe = {}; const validos = new Set((ativos.acao || []).map(([t]) => t));
  for (const a of [Y, Y - 1]) {
    const zip = CACHE + '/fca.zip';
    try {
      await baixar(BASE + 'FCA/DADOS/fca_cia_aberta_' + a + '.zip', zip);
      const arq = (await listaZip(zip)).find(x => /valor_mobiliario/i.test(x));
      let cab = null;
      for await (const l of linhasZip(zip, arq)) {
        const c = campos(l); if (!cab) { cab = c.map(h => h.toLowerCase()); continue; }
        const g = n => c[cab.findIndex(h => h.includes(n))] || '';
        const t = g('codigo_negociacao').toUpperCase(), cnpj = g('cnpj_companhia');
        if (t && validos.has(t)) (tickersDe[cnpj] ||= new Set()).add(t);
      }
      await rm(zip, { force: true });
      if (Object.keys(tickersDe).length) break;
    } catch (e) { log('FCA ' + a + ': ' + e.message); }
  }
  const empresas = Object.assign({}, dfp.emp, empI);
  const out = { atualizado: agora.toISOString(), empresas: {}, tickers: {} };
  let n = 0;
  for (const [cd, info] of Object.entries(empresas)) {
    const ts = [...(tickersDe[info.cnpj] || [])]; if (!ts.length) continue;
    const e = montarEmpresa(dfp.D[cd], I[cd]); if (!e) continue;
    // valor de mercado: soma das classes (preço × ações) não está disponível; usa o maior valor de mercado informado entre os códigos
    const mcap = Math.max(0, ...ts.map(t => (mk.mcap || {})[t] || 0)) || null;
    const ind = indicadores(e, mcap, ts.some(t => (mk.setor || {})[t] === 'Finance'));
    out.empresas[cd] = {
      n: info.nome, ref: e.ref, f: e.fonte, ind, mc: mcap,
      h: { a: e.anos.map(x => x.ano), r: e.anos.map(x => x.receita), l: e.anos.map(x => x.lucro), dl: e.anos.map(x => x.divLiq ?? null), eb: e.anos.map(x => x.ebit != null ? x.ebit + (x.dep || 0) : null) }
    };
    for (const t of ts) out.tickers[t] = cd;
    n++;
  }
  if (sonda) for (const t of ['PETR4', 'WEGE3', 'ITUB4', 'BBAS3', 'VALE3', 'TAEE11']) { const cd = out.tickers[t]; sonda('fundamentos ' + t, cd ? out.empresas[cd] : 'sem dados'); }
  if (sonda) { const cont = {}; for (const v of Object.values(mk.setor || {})) cont[v] = (cont[v] || 0) + 1; sonda('setores', cont); sonda('financeiras', Object.entries(out.tickers).filter(([t, cd]) => out.empresas[cd].ind.fin).map(([t]) => t).join(' ')); }
  log('Fundamentos: ' + n + ' empresas, ' + Object.keys(out.tickers).length + ' códigos');
  return out;
}
