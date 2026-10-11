/* Dados de mercado.
   - dados/mercado.json e dados/ativos.json: feitos pelo robô (GitHub Actions) — preços da B3, CDI, IPCA, Tesouro, proventos.
   - Cripto e dólar: direto da Binance, na hora em que o app abre (o robô também guarda uma cópia). */
import { emptyMarket } from './calc.js';
import { storeGet, storeSet, iso, isBiz, addDays, today } from './util.js';

const CACHE_KEY = 'mc-mercado';
const LISTA_KEY = 'mc-ativos';

export async function carregarMercado(onUpdate) {
  let mk = emptyMarket();
  try { const c = JSON.parse(storeGet(CACHE_KEY) || 'null'); if (c) mk = Object.assign(emptyMarket(), c); } catch (e) { /* ignora */ }
  aplicarLive(mk); onUpdate(mk);
  try {
    const r = await fetch('dados/mercado.json', { cache: 'no-cache' });
    if (r.ok) {
      mk = Object.assign(emptyMarket(), await r.json());
      aplicarLive(mk);
      storeSet(CACHE_KEY, JSON.stringify(mk));
      onUpdate(mk);
    }
  } catch (e) { /* sem internet: fica com a cópia */ }
  return mk;
}
let mkLive = {};
function aplicarLive(mk) {
  if (!mkLive.ts) return;
  mk.atualizado = mk.atualizado || {};
  if (mk.atualizado.cripto && mk.atualizado.cripto > mkLive.ts) return;
  mk.cripto = Object.assign({}, mk.cripto, mkLive.cripto);
  if (mkLive.usdtbrl) mk.usdtbrl = mkLive.usdtbrl;
  mk.atualizado.cripto = mkLive.ts;
}

/* Cripto ao vivo: preço em dólar de cada moeda e o USDT em reais */
export async function criptoAoVivo(simbolos, mk) {
  const pares = [...new Set(simbolos.filter(s => s && s !== 'USDT'))].map(s => s + 'USDT');
  pares.push('USDTBRL');
  const q = encodeURIComponent(JSON.stringify(pares));
  const urls = ['https://data-api.binance.vision/api/v3/ticker/price?symbols=' + q, 'https://api.binance.com/api/v3/ticker/price?symbols=' + q];
  for (const u of urls) {
    try {
      const r = await fetch(u, { cache: 'no-store' });
      if (!r.ok) continue;
      const arr = await r.json(); if (!Array.isArray(arr)) continue;
      const cripto = {}; let usdtbrl = null;
      for (const it of arr) { const p = parseFloat(it.price); if (it.symbol === 'USDTBRL') usdtbrl = p; else cripto[it.symbol.replace(/USDT$/, '')] = p; }
      mkLive = { cripto, usdtbrl, ts: new Date().toISOString() };
      aplicarLive(mk);
      storeSet(CACHE_KEY, JSON.stringify(mk));
      return true;
    } catch (e) { /* tenta a próxima */ }
  }
  // moedas que não existem na Binance: tenta uma por uma não vale a pena; ficam com o preço do robô
  return false;
}

/* Lista de ativos para o autocompletar (ações, FIIs e Tesouro); fica guardada no aparelho */
export async function carregarLista() {
  let l = null;
  try { l = JSON.parse(storeGet(LISTA_KEY) || 'null'); } catch (e) { /* ignora */ }
  try {
    const r = await fetch('dados/ativos.json', { cache: 'no-cache' });
    if (r.ok) { l = await r.json(); storeSet(LISTA_KEY, JSON.stringify(l)); }
  } catch (e) { /* sem internet */ }
  return l;
}

/* ---------- Modo demonstração: mercado de exemplo ---------- */
export function mercadoExemplo() {
  const mk = emptyMarket();
  const hoje = today();
  const r = (Math.pow(1.1415, 1 / 252) - 1) * 100;
  for (let d = '2024-01-02'; d < hoje; d = addDays(d, 1)) { const D = new Date(d + 'T12:00'); if (isBiz(D)) mk.cdi.push([d, +r.toFixed(6)]); }
  for (let y = 2024, m = 1; y * 100 + m <= +hoje.slice(0, 4) * 100 + (+hoje.slice(5, 7)) - 1; m++) { if (m > 12) { m = 1; y++; } mk.ipca.push([y + '-' + String(m).padStart(2, '0'), 0.36]); }
  mk.precos = { ITSA4: 11.05, BBAS3: 23.90, WEGE3: 41.20, MXRF11: 9.62, HGLG11: 162.30, KNCR11: 104.10, PETR4: 31.80 };
  mk.tesouro = { 'Tesouro Selic 2031': 17480.50, 'Tesouro IPCA+ 2035': 2186.40 };
  mk.cripto = { BTC: 118500, ETH: 3620 };
  mk.dolar = 5.36; mk.usdtbrl = 5.38;
  const L = []; const add = (t, tipo, com, pag, v) => L.push({ t, tipo, com, pag, v });
  const base = new Date(hoje + 'T12:00');
  for (let i = -12; i <= 0; i++) {
    const comD = new Date(base.getFullYear(), base.getMonth() + i, 0), pagD = new Date(base.getFullYear(), base.getMonth() + i, 14);
    while (!isBiz(comD)) comD.setDate(comD.getDate() - 1);
    const com = iso(comD), pag = iso(pagD);
    add('MXRF11', 'Rendimento', com, pag, i % 2 ? 0.09 : 0.10);
    add('HGLG11', 'Rendimento', com, pag, 1.10);
    add('KNCR11', 'Rendimento', com, addDays(pag, 1), +(1.30 + i * 0.01).toFixed(2));
  }
  const prox = new Date(base.getFullYear(), base.getMonth() + 1, 20);
  add('BBAS3', 'Dividendo', iso(prox), addDays(iso(prox), 20), 0.4215);
  add('ITSA4', 'JCP', addDays(iso(prox), 10), addDays(iso(prox), 45), 0.02);
  add('BBAS3', 'JCP', addDays(hoje, -200), addDays(hoje, -180), 0.523);
  add('ITSA4', 'Dividendo', addDays(hoje, -220), addDays(hoje, -200), 0.55);
  mk.anuncios = L;
  const agora = new Date().toISOString();
  mk.atualizado = { b3: agora, cripto: agora, cdi: agora, ipca: agora, tesouro: agora, proventos: agora, exemplo: true };
  return mk;
}
