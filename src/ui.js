/* Telas do app (segue o protótipo aprovado). */
import { nf2, nf0, nf4, nfq, r2, num, esc, uid, semAcento, daysBetween, parse, iso, today, fmtDate, fmtDM, fmtHora, monthKey, monthName,
  MESES, MESES_LONGOS, storeGet, storeSet } from './util.js';
import { S, CLS, ORDER, TIPOS, TIPO_NOME, byDate, irRate, opsOf, ativosOf, cdbPadrao, opTotalBRL, opTotalOrig, opTaxBRL, qtdEm, posRV, posCDB,
  cdbValor, pos, carteira, retorno, dy12, yoc, fonteDe, linkedOp, fonteTxt, aReceber, proventosPendentes, dolarCripto, relatorioIR, codigoIR } from './calc.js';
import { CRIPTO, RESERVA } from './listas.js';

let store = null, root = null, versao = '';
const app = { fase: 'carregando', user: null, settings: {}, demo: false, lista: null, erro: null };
let tab = 'carteira';
const HIDE_KEY = 'mc-hide';
let hide = storeGet(HIDE_KEY) === '1';
const HID = '•••••';

/* ---------- Formatos ---------- */
const sg = (v, sign) => sign && v > 0.004 ? '+' : (v < -0.004 ? '−' : '');
const brl = (v, sign) => hide ? 'R$ ' + HID : sg(v, sign) + 'R$ ' + nf2.format(Math.abs(v));
const usdN = v => (Math.abs(v) >= 1000 ? nf0 : nf2).format(Math.abs(v));
const usd = (v, sign) => hide ? 'US$ ' + HID : sg(v, sign) + 'US$ ' + usdN(v);
const n2 = v => hide ? HID : nf2.format(v);
const pct = (v, sign = true) => (sign && v > 0 ? '+' : (v < 0 ? '−' : '')) + nf2.format(Math.abs(v * 100)).replace(/,00$/, '') + '%';
const pct1 = v => nf2.format(v * 100).replace(/0$/, '').replace(/,$/, '') + '%';
const cls = v => v > 0.004 ? 'pos' : (v < -0.004 ? 'neg' : '');
const pctCDI = p => nf2.format(p).replace(/,00$/, '') + '% do CDI';

/* ---------- Ícones ---------- */
const EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.3"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
const CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
const MORE = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
const PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
const TAB_ICONS = {
  carteira: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18v12H3z"/><path d="M16 13h2M3 7l3-3h12l3 3"/></svg>',
  proventos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.7 5 3.3 5 1.4 5 3.4-2.2 3.3-5 3.3-5-1.2-5-3"/></svg>',
  lancamentos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>'
};
const GOOGLE = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
const sigla = a => a.startsWith('Tesouro') ? (a.includes('IPCA') ? 'IPCA' : a.includes('Selic') ? 'SEL' : a.includes('Prefix') ? 'PRE' : a.includes('Renda') || a.includes('RendA') ? 'REN' : a.includes('Educa') ? 'EDU' : 'TD') : a.startsWith('CDB') ? 'CDB' : a.replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase();
const tick = (c, a) => '<span class="tick" style="background:' + CLS[c].cor + '">' + esc(sigla(a)) + '</span>';
const unid = (c, q, a) => nfq.format(q) + ' ' + (c === 'fii' ? (q === 1 ? 'cota' : 'cotas') : c === 'acao' ? (q === 1 ? 'ação' : 'ações') : c === 'tesouro' ? (q === 1 ? 'título' : 'títulos') : a);

/* ---------- Início ---------- */
export function iniciarUI(el, st, opts) {
  root = el; store = st; versao = opts.versao || '';
  root.innerHTML = '<div class="app"><header class="top"><div class="grow"><h1>Minha carteira</h1><p class="sub" id="sub"></p></div>' +
    '<button class="iconbtn" id="eye" aria-label="Esconder valores"></button><button class="iconbtn" id="more" aria-label="Mais opções">' + MORE + '</button></header>' +
    '<div class="banner" id="banner" hidden></div><main id="view"></main></div>' +
    '<button class="fab" id="fab" aria-label="Novo lançamento" hidden>' + PLUS + '</button>' +
    '<nav class="tabs" id="tabs" hidden><div class="in">' + ['carteira', 'proventos', 'lancamentos'].map(t => '<button data-tab="' + t + '">' + TAB_ICONS[t] + { carteira: 'Carteira', proventos: 'Proventos', lancamentos: 'Lançamentos' }[t] + '</button>').join('') + '</div></nav>' +
    '<div id="sheetRoot"></div><div id="toast" class="toast" role="status" hidden></div>';
  root.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); window.scrollTo(0, 0); }));
  root.querySelector('#eye').addEventListener('click', () => { hide = !hide; storeSet(HIDE_KEY, hide ? '1' : '0'); render(); });
  root.querySelector('#more').addEventListener('click', menu);
  root.querySelector('#fab').addEventListener('click', () => formulario(tab === 'proventos' ? { cls: 'fii', tipo: 'provento' } : null));
  root.querySelector('#view').addEventListener('click', e => {
    if (e.target.closest('#login')) { entrar(); return; }
    const r = e.target.closest('[data-ativo]'); if (r) detalhe(r.dataset.cls, r.dataset.ativo);
  });
  window.addEventListener('popstate', () => { if (root.querySelector('#scrim')) closeSheet(true); });
  render();
}

export function setStoreState(s) {
  app.fase = s.fase; app.user = s.user; app.demo = !!s.demo; app.erro = s.erro || null;
  if (s.ops) S.ops = s.ops;
  app.settings = s.settings || {};
  S.ignorados = app.settings.ignorados || [];
  app.pendente = !!s.pendente;
  sincronizarProventos();
  render();
  atualizarFolha();
}
export function setMercado(mk) { S.mk = mk; sincronizarProventos(); render(); atualizarFolha(); }
export function setLista(l) { app.lista = l; }
export function mostrarBanner(html, onClick) {
  const b = root.querySelector('#banner'); b.innerHTML = html; b.hidden = false;
  b.onclick = e => { if (e.target.closest('button')) onClick(); };
}

/* Proventos anunciados que já foram pagos viram lançamentos sozinhos */
const enviando = new Set();
function sincronizarProventos() {
  if (app.fase !== 'pronto') return;
  S.hoje = today();
  const novos = proventosPendentes().filter(o => !enviando.has(o.id));
  if (!novos.length) return;
  novos.forEach(o => enviando.add(o.id));
  store.salvar(novos.map(o => Object.assign({ ts: Date.now() }, o))).catch(() => novos.forEach(o => enviando.delete(o.id)));
}

async function entrar() {
  const b = root.querySelector('#login'); if (b) { b.disabled = true; b.querySelector('span').textContent = 'Abrindo o Google…'; }
  try { await store.entrar(); }
  catch (e) { toast(e && e.code === 'auth/unauthorized-domain' ? 'Este endereço não está liberado no Firebase (Domínios autorizados).' : 'Não deu para entrar. Confira a internet e tente de novo.'); }
  if (b) { b.disabled = false; b.querySelector('span').textContent = 'Entrar com Google'; }
}

/* ---------- Telas ---------- */
function render() {
  if (!root) return;
  S.hoje = today();
  const view = root.querySelector('#view'), logado = app.fase === 'pronto';
  root.querySelector('#eye').innerHTML = hide ? EYE_OFF : EYE;
  root.querySelector('#eye').setAttribute('aria-label', hide ? 'Mostrar valores' : 'Esconder valores');
  root.querySelector('#eye').hidden = !logado;
  root.querySelector('#more').hidden = !logado;
  root.querySelector('#fab').hidden = !logado;
  root.querySelector('#tabs').hidden = !logado;
  root.querySelector('#sub').textContent = app.demo ? 'Modo demonstração · dados de exemplo' : (logado ? subtitulo() : '');
  root.querySelectorAll('.tabs button').forEach(b => { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (app.fase === 'login') { view.innerHTML = vLogin(); return; }
  if (app.fase === 'erro') { view.innerHTML = '<div class="card empty">Não deu para abrir o app. Confira a internet e abra de novo.</div>'; return; }
  if (!logado) { view.innerHTML = '<div class="card empty">Abrindo sua carteira…</div>'; return; }
  view.innerHTML = tab === 'carteira' ? vCarteira() : tab === 'proventos' ? vProventos() : vLancamentos();
}
function subtitulo() {
  const t = (S.mk.atualizado || {}).b3;
  return t ? 'Cotações de ' + fmtHora(t) : 'Cotações ainda não carregadas';
}

function vLogin() {
  return '<section class="login"><div class="login-mark" aria-hidden="true"><svg viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="var(--accent)"/><path d="M14 44l12-12 8 8 16-18" fill="none" stroke="var(--accent-ink)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="22" r="4" fill="var(--accent-ink)"/></svg></div>' +
    '<h2>Sua carteira, sempre atualizada</h2><p>Ações, FIIs, Tesouro, CDB e cripto num lugar só. Entre com a sua conta Google: seus lançamentos ficam guardados só para você.</p>' +
    '<button class="google" id="login">' + GOOGLE + '<span>Entrar com Google</span></button></section>';
}

function vCarteira() {
  const k = carteira(); const res = k.total - k.custo;
  if (!k.ordem.length) return '<div class="card empty"><b>Sua carteira está vazia.</b><br>Toque em + para registrar a primeira compra ou o seu CDB.</div>';
  let h = '<section class="hero"><span class="label">Patrimônio</span>' +
    '<div class="big num">' + brl(k.total) + '</div>' +
    '<div class="delta num ' + cls(res) + '">' + brl(res, true) + ' (' + pct(k.custo ? res / k.custo : 0) + ') <small>de valorização sobre o que você investiu</small></div></section>';

  for (const c of k.ordem) {
    const C = k.classes[c]; const r = C.valor - C.custo;
    let meta;
    if (c === 'cdb') meta = brl(C.liq) + ' líquido';
    else if (c === 'cripto') meta = brl(C.valor) + ' · <span class="' + cls(r) + '">' + brl(r, true) + '</span>';
    else meta = brl(C.valor) + ' · <span class="' + cls(r) + '">' + pct(C.custo ? r / C.custo : 0) + '</span>';
    h += '<section class="sec"><div class="sec-h"><h2><span class="dot" style="background:' + CLS[c].cor + '"></span>' + CLS[c].nome + '</h2><div class="meta num">' + meta + '</div></div><div class="list">';
    for (const p of C.items) {
      let l1, l2, rv, rs;
      const semCot = p.cotado ? '' : ' · sem cotação';
      if (c === 'cdb') { l1 = pctCDI(p.pct); l2 = 'Aplicado ' + n2(p.aplicado); rv = brl(p.liq); rs = 'líquido'; }
      else if (c === 'tesouro') { l1 = unid(c, p.qtd) + semCot; l2 = 'Investido ' + n2(p.custo); rv = brl(p.valor); rs = 'líquido <span class="' + cls(p.liqPct) + '">' + brl(p.liq) + '</span>'; }
      else if (p.ativo === 'USDT') { l1 = unid(c, p.qtd, p.ativo); l2 = 'PM ' + n2(p.pm) + ' · Atual ' + nf2.format(dolarCripto()); rv = brl(p.valor); rs = '<span class="' + cls(p.res) + '">' + brl(p.res, true) + '</span>'; }
      else if (c === 'cripto') { l1 = unid(c, p.qtd, p.ativo) + semCot; l2 = 'PM ' + (hide ? HID : usdN(p.pm)) + ' · Atual ' + usdN(p.preco); rv = usd(p.valorUSD); rs = '<span class="' + cls(p.res) + '">' + brl(p.res, true) + '</span>'; }
      else { const d = dy12(p.ativo); l1 = unid(c, p.qtd) + (d ? ' · DY ' + pct1(d) : '') + semCot; l2 = 'PM ' + n2(p.pm) + ' · Atual ' + nf2.format(p.preco); rv = brl(p.valor); rs = '<span class="' + cls(p.res) + '">' + pct(p.resPct) + '</span>'; }
      h += '<button class="row" data-ativo="' + esc(p.ativo) + '" data-cls="' + c + '">' + tick(c, p.ativo) +
        '<span class="main"><span class="t">' + esc(p.ativo) + '</span><span class="s s1 num">' + l1 + '</span><span class="s s1 num">' + l2 + '</span></span>' +
        '<span class="r num"><span class="v">' + rv + '</span><span class="s">' + rs + '</span></span></button>';
      if (c === 'cdb' && p.diaHoje) {
        h += '<div class="strip"><div><span>Rendeu em ' + fmtDM(p.diaHoje) + '</span><b class="' + cls(p.hoje) + '">' + brl(p.hoje, true) + '</b></div>' +
          '<div><span>Rendimento acumulado</span><b class="' + cls(p.acum) + '">' + brl(p.acum, true) + '</b></div></div>';
      }
    }
    h += '</div>' + (c === 'cdb' ? '<p class="note">Valores já descontados de IR e IOF.</p>' : '') + '</section>';
  }

  const rf = [...k.classes.cdb.items, ...k.classes.tesouro.items].filter(p => p.aa != null).sort((a, b) => b.aa - a.aa);
  if (rf.length > 1) {
    h += '<section class="sec rf"><div class="sec-h"><h2>Renda fixa lado a lado</h2><div class="meta">líquido de IR, ao ano</div></div><div class="list">';
    for (const p of rf) h += '<button class="row" data-ativo="' + esc(p.ativo) + '" data-cls="' + p.cls + '"><span class="dot" style="background:' + CLS[p.cls].cor + '"></span>' +
      '<span class="main"><span class="t">' + esc(p.ativo) + '</span><span class="s num">' + pct(p.liqPct) + ' líquido desde a compra</span></span>' +
      '<span class="r pct num ' + cls(p.aa) + '">' + pct(p.aa, false) + '</span></button>';
    h += '</div><p class="note">Conta aproximada: o rendimento líquido acumulado é convertido para "ao ano" pelo tempo médio de cada aplicação.</p></section>';
  }

  h += '<section class="sec"><div class="sec-h"><h2>Divisão da carteira</h2></div><div class="card"><div class="bar">';
  for (const c of k.ordem) h += '<span style="width:' + (k.classes[c].valor / k.total * 100) + '%;background:' + CLS[c].cor + '"></span>';
  h += '</div><div class="legend">';
  for (const c of k.ordem) {
    const v = k.classes[c].valor;
    h += '<div><span class="dot" style="background:' + CLS[c].cor + '"></span><span>' + CLS[c].nome + '</span><span class="num muted">' + brl(v) + '</span><b class="num" style="min-width:52px;text-align:right">' + pct(v / k.total, false) + '</b></div>';
  }
  h += '</div>' + (k.classes.cripto.items.length ? '<p class="note" style="margin-bottom:0">Cripto convertida pelo USDT em reais de agora (R$ ' + nf2.format(dolarCripto()) + ').</p>' : '') + '</div></section>';
  return h;
}

function quando(s) { const d = daysBetween(S.hoje, s); return d === 1 ? 'amanhã' : 'em ' + d + ' dias'; }
function vProventos() {
  const fut = aReceber();
  const provs = S.ops.filter(o => o.tipo === 'provento').sort(byDate).reverse();
  const mes = monthKey(S.hoje), ano = S.hoje.slice(0, 4);
  const recMes = provs.filter(o => monthKey(o.data) === mes).reduce((s, o) => s + o.valor, 0);
  const aRecMes = fut.filter(a => monthKey(a.pag) === mes).reduce((s, a) => s + a.total, 0);
  const recAno = provs.filter(o => o.data.startsWith(ano)).reduce((s, o) => s + o.valor, 0);
  const aRecAno = fut.filter(a => a.pag.startsWith(ano)).reduce((s, a) => s + a.total, 0);
  let h = '<section class="card"><span class="label">' + MESES_LONGOS[+mes.slice(5) - 1] + ' de ' + ano + '</span>' +
    '<div class="pair"><div><span>Recebido</span><div class="mid num pos">' + brl(recMes) + '</div></div>' +
    '<div><span>A receber</span><div class="mid num">' + brl(aRecMes) + '</div></div></div>' +
    '<div class="yearline"><span class="muted">Recebido em ' + ano + '</span><b class="num">' + brl(recAno) + '</b></div>' +
    (aRecAno > aRecMes + 0.004 ? '<div class="yearline thin"><span class="muted">A receber até dezembro</span><span class="num">' + brl(aRecAno) + '</span></div>' : '') + '</section>';

  if (fut.length) {
    const totFut = fut.reduce((s, a) => s + a.total, 0);
    h += '<section class="sec"><div class="sec-h"><h2>Próximos pagamentos</h2><div class="meta num">' + brl(totFut) + '</div></div><div class="list">';
    for (const a of fut) {
      h += '<button class="row" data-ativo="' + esc(a.t) + '" data-cls="' + a.cls + '">' + tick(a.cls, a.t) +
        '<span class="main"><span class="t">' + esc(a.t) + ' <span class="chip">' + esc(a.tipo) + '</span></span>' +
        '<span class="s num">R$ ' + nf4.format(a.v) + ' × ' + unid(a.cls, a.q) + '</span>' +
        '<span class="s num">' + (a.com ? 'Data com ' + fmtDM(a.com) : 'Data com a confirmar') + (a.est ? ' · valor estimado' : '') + '</span></span>' +
        '<span class="r num"><span class="v pos">' + brl(a.total) + '</span><span class="s">paga ' + fmtDM(a.pag) + '</span><span class="s soon">' + quando(a.pag) + '</span></span></button>';
    }
    h += '</div><p class="note">Valores anunciados pelos fundos e empresas. No dia do pagamento eles passam para Recebidos sozinhos, com a quantidade que você tinha na data com. "Valor estimado": a data com ainda não chegou, então a conta usa o que você tem hoje.</p></section>';
  } else {
    h += '<p class="note" style="margin-top:12px">Nenhum pagamento anunciado para os seus ativos agora. Quando um fundo ou empresa anunciar, ele aparece aqui.</p>';
  }
  if (provs.length) {
    const now = parse(S.hoje), months = [];
    for (let i = 11; i >= 0; i--) months.push(iso(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7));
    const tot = {}; provs.forEach(o => { const k = monthKey(o.data); tot[k] = (tot[k] || 0) + o.valor; });
    const soma12 = months.reduce((s, m) => s + (tot[m] || 0), 0), max = Math.max(1, ...months.map(m => tot[m] || 0));
    h += '<section class="sec"><div class="sec-h"><h2>Recebidos</h2><div class="meta">últimos 12 meses</div></div><div class="card"><div class="mid num">' + brl(soma12) + '</div>' +
      '<div class="delta num"><small>média de ' + brl(soma12 / 12) + ' por mês</small></div><div class="months" aria-hidden="true">';
    months.forEach((m, i) => { const v = tot[m] || 0; h += '<div><span class="b' + (i === 11 ? ' cur' : '') + '" style="height:' + (v / max * 82) + 'px"></span><em>' + MESES[+m.slice(5) - 1] + '</em></div>'; });
    h += '</div></div></section>';
    let cur = '', n = 0;
    for (const o of provs) {
      const k = monthKey(o.data);
      if (k !== cur) { if (n >= 60) break; if (cur) h += '</div></section>'; cur = k; h += '<section class="sec"><div class="sec-h"><h2>' + monthName(k) + '</h2><div class="meta num">' + brl(tot[k]) + '</div></div><div class="list">'; }
      n++;
      h += '<button class="row" data-ativo="' + esc(o.ativo) + '" data-cls="' + o.cls + '">' + tick(o.cls, o.ativo) +
        '<span class="main"><span class="t">' + esc(o.ativo) + '</span><span class="s">' + esc(o.provTipo || 'Provento') + ' · ' + fmtDate(o.data) + (o.auto ? ' · automático' : '') + '</span></span>' +
        '<span class="r num v pos">' + brl(o.valor) + '</span></button>';
    }
    h += '</div></section>';
  }
  return h;
}

function opLine(o) {
  if (o.tipo === 'provento') return esc(o.provTipo || 'Provento') + (o.auto ? ' · automático' : '');
  if (o.de) { const m = S.ops.find(x => x.id === o.de); if (m) return (m.tipo === 'compra' ? 'Pagou a compra de ' : 'Valor da venda de ') + esc(m.ativo); }
  if (o.cls === 'cdb') return o.tipo === 'aporte' ? pctCDI(o.pct || 100) : 'Valor líquido resgatado';
  let s;
  if (o.ativo === 'USDT') s = nfq.format(o.qtd) + ' × ' + brl(o.preco * (o.dolar || dolarCripto()));
  else if (o.cls === 'cripto') s = nfq.format(o.qtd) + ' × ' + usd(o.preco) + (o.taxas ? ' · taxas ' + usd(o.taxas) : '') + ' · dólar ' + nf2.format(o.dolar || dolarCripto());
  else s = nfq.format(o.qtd) + ' × ' + brl(o.preco) + (o.taxas ? ' · taxas ' + brl(o.taxas) : '');
  if (o.link) s += ' · ' + fonteTxt(o.fonte, o.tipo);
  return s;
}
function vLancamentos() {
  const ops = S.ops.slice().sort(byDate).reverse().filter(o => o.tipo !== 'provento' && !o.de);
  if (!ops.length) return '<div class="card empty">Nenhum lançamento ainda. Toque em + para registrar sua primeira compra.</div>';
  const ano = S.hoje.slice(0, 4), taxAno = ops.filter(o => o.data.startsWith(ano)).reduce((s, o) => s + opTaxBRL(o), 0);
  const taxMes = {}; ops.forEach(o => { const k = monthKey(o.data); taxMes[k] = (taxMes[k] || 0) + opTaxBRL(o); });
  let h = '<section class="card"><span class="label">Taxas pagas em ' + ano + '</span><div class="big num" style="font-size:30px">' + brl(taxAno) + '</div>' +
    '<div class="delta"><small>Corretagem, B3 e corretora de cripto, como você registrou em cada compra e venda.</small></div></section>';
  let cur = '';
  ops.forEach(o => {
    const k = monthKey(o.data);
    if (k !== cur) {
      if (cur) h += '</div></section>'; cur = k;
      h += '<section class="sec"><div class="sec-h"><h2>' + monthName(k) + '</h2><div class="meta num">' + (taxMes[k] > 0.004 ? 'taxas ' + brl(taxMes[k]) : 'sem taxas') + '</div></div><div class="list">';
    }
    h += '<button class="row" data-ativo="' + esc(o.ativo) + '" data-cls="' + o.cls + '">' + tick(o.cls, o.ativo) +
      '<span class="main"><span class="t">' + esc(o.ativo) + ' <span class="chip ' + o.tipo + '">' + TIPO_NOME[o.tipo] + '</span></span><span class="s num">' + fmtDate(o.data) + ' · ' + opLine(o) + '</span></span>' +
      '<span class="r num v">' + brl(opTotalBRL(o)) + '</span></button>';
  });
  return h + '</div></section>';
}

/* ---------- Folhas (janelas que sobem de baixo) ---------- */
let folhaAtual = null; // função que redesenha a folha aberta quando os dados mudam
function openSheet(title, body, onMount, redesenhar) {
  const ja = !!root.querySelector('#scrim');
  root.querySelector('#sheetRoot').innerHTML = '<div class="scrim" id="scrim"><div class="sheet' + (ja ? ' noanim' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '">' +
    '<div class="sheet-h"><h3>' + esc(title) + '</h3><button class="iconbtn" id="closeSheet" aria-label="Fechar">' + CLOSE + '</button></div>' +
    '<div class="sheet-b" id="sheetBody">' + body + '</div></div></div>';
  if (!ja) { try { history.pushState({ folha: 1 }, ''); } catch (e) { /* ignora */ } }
  root.querySelector('#scrim').addEventListener('click', e => { if (e.target.id === 'scrim') closeSheet(); });
  root.querySelector('#closeSheet').addEventListener('click', () => closeSheet());
  folhaAtual = redesenhar || null;
  onMount && onMount(root.querySelector('#sheetBody'));
}
function closeSheet(doHistorico) {
  if (!root.querySelector('#scrim')) return;
  root.querySelector('#sheetRoot').innerHTML = ''; folhaAtual = null;
  if (!doHistorico) { try { if (history.state && history.state.folha) history.back(); } catch (e) { /* ignora */ } }
}
function atualizarFolha() { if (folhaAtual && root.querySelector('#scrim')) { const sb = root.querySelector('#sheetBody'), y = sb ? sb.scrollTop : 0; folhaAtual(); const nb = root.querySelector('#sheetBody'); if (nb) nb.scrollTop = y; } }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

function kv(pairs) { if (pairs.length % 2) pairs.push(['', '']); return '<div class="kv">' + pairs.map(([k, v, c]) => '<div><span>' + k + '</span><b class="' + (c || '') + '">' + v + '</b></div>').join('') + '</div>'; }

async function excluir(id) {
  const o = S.ops.find(x => x.id === id); if (!o) return;
  const ids = [id];
  if (o.link) ids.push(o.link);
  const tarefas = [store.excluir(ids)];
  if (o.de) { const m = S.ops.find(x => x.id === o.de); if (m) tarefas.push(store.excluirCampo(m.id, ['link', 'fonte'])); }
  if (o.auto) tarefas.push(store.ajustes({ ignorados: [...new Set([...(app.settings.ignorados || []), o.id])] }));
  await Promise.all(tarefas);
}

function blocoRetorno(c, a) {
  const R = retorno(c, a); const l = (k, v, cl) => '<div class="l num"><span>' + k + '</span><span class="' + (cl || '') + '">' + v + '</span></div>';
  let h = '<div class="ret"><h4>Quanto este ativo te rendeu</h4>';
  h += l('Valorização das cotas', brl(R.valoriz, true), cls(R.valoriz));
  if (c !== 'cripto') h += l('Proventos recebidos', brl(R.prov, true), cls(R.prov));
  if (Math.abs(R.realizado) > 0.004) h += l('Lucro nas vendas', brl(R.realizado, true), cls(R.realizado));
  h += '<div class="l tot num"><span>Retorno total</span><span class="' + cls(R.total) + '">' + brl(R.total, true) + ' · ' + pct(R.pct) + '</span></div>';
  if (R.temIpca) h += '<div class="real"><span class="muted" style="font-size:14px">Descontando a inflação</span><div class="num" style="font-weight:700;font-size:16px;margin-top:2px"><span class="' + cls(R.real) + '">' + brl(R.real, true) + ' · ' + pct(R.realPct) + '</span></div>' +
    '<p class="note" style="margin:6px 0 0">Inflação (IPCA) desde a primeira compra: ' + pct(R.ipca, false) + '. Cada valor que você pagou ou recebeu é corrigido até hoje; o que sobra é o ganho de verdade.</p></div>';
  return h + '</div>';
}

function detalhe(c, a) {
  const desenhar = () => {
    if (!opsOf(c, a).length) { closeSheet(); return; }
    const p = pos(c, a); let h = '';
    if (c === 'cdb') {
      h += kv([['Rende', pctCDI(p.pct)], ['Aplicado', brl(p.aplicado)], ['Valor bruto', brl(p.bruto)], ['IR + IOF', brl(-(p.ir + p.iof))],
        ['Líquido', brl(p.liq)], [p.diaHoje ? 'Rendeu em ' + fmtDM(p.diaHoje) : 'Rendeu no dia', brl(p.hoje, true), cls(p.hoje)],
        ['Rendimento acumulado', brl(p.acum, true), cls(p.acum)], ['Líquido ao ano', p.aa == null ? '—' : pct(p.aa, false)]]);
      h += '<p class="note">IR de cada aporte pelo tempo aplicado: 22,5% até 180 dias, 20% até 360, 17,5% até 720 e 15% depois disso. IOF só nos primeiros 30 dias. Resgates saem dos aportes mais antigos primeiro. CDI oficial de cada dia útil (Banco Central).</p>';
      h += '<div class="sec-h" style="margin-top:16px"><h2>Aportes em aberto</h2></div><div class="list">';
      p.lots.forEach(L => { const d = daysBetween(L.data, S.hoje); h += '<div class="row"><span class="main"><span class="t">' + fmtDate(L.data) + '</span><span class="s">' + d + ' dias · IR ' + pct(irRate(d), false) + '</span></span><span class="r num v">' + brl(L.valor) + '</span></div>'; });
      h += '</div>';
    } else if (c === 'tesouro') {
      h += kv([['Títulos', nfq.format(p.qtd)], ['Preço unitário', brl(p.preco)], ['Investido', brl(p.custo)], ['Valor bruto', brl(p.valor)],
        ['IR estimado', brl(-(p.ir + p.iof))], ['Líquido', brl(p.liq), cls(p.liq - p.custo)], ['Líquido acumulado', pct(p.liqPct), cls(p.liqPct)], ['Líquido ao ano', p.aa == null ? '—' : pct(p.aa, false)]]);
      h += '<p class="note">IR pelo tempo de cada compra, igual ao CDB. Preço de resgate do Tesouro Direto' + (p.cotado ? ', atualizado todo dia útil.' : ': ainda sem cotação para este título, por isso usa o preço da sua compra.') + '</p>';
    } else if (a === 'USDT') {
      h += kv([['Quantidade', nfq.format(p.qtd)], ['Preço médio', brl(p.pm)], ['Cotação', brl(dolarCripto())], ['Valor atual', brl(p.valor)],
        ['Valorização', brl(p.res, true) + ' · ' + pct(p.resPct), cls(p.res)], ['Lucro nas trocas', brl(p.realizado, true), cls(p.realizado)]]);
      h += '<p class="note">USDT em reais: o preço médio é quanto você pagou em reais por cada USDT. "Lucro nas trocas" é o ganho ou a perda com o dólar quando você usou USDT para comprar outras criptos.</p>';
    } else if (c === 'cripto') {
      h += kv([['Quantidade', nfq.format(p.qtd)], ['Preço médio', usd(p.pm)], ['Cotação', usd(p.preco)], ['Valor atual', usd(p.valorUSD)],
        ['Em reais', brl(p.valor)], ['Valorização', brl(p.res, true) + ' · ' + pct(p.resPct), cls(p.res)], ['Taxas pagas', usd(p.taxasUSD)], ['USDT em reais', 'R$ ' + nf2.format(dolarCripto())]]);
      h += blocoRetorno(c, a);
      h += '<p class="note">Valores em dólar. Os resultados são em reais: comparam o valor de hoje com o que você pagou em reais, usando o dólar do dia de cada compra.' + (p.cotado ? '' : ' Esta moeda ainda não tem cotação; o app usa o preço da sua compra.') + '</p>';
    } else {
      const d = dy12(a), y = yoc(c, a);
      h += kv([['Quantidade', nfq.format(p.qtd)], ['Preço médio', brl(p.pm)], ['Cotação', p.cotado ? brl(p.preco) : 'sem cotação'], ['Valor atual', brl(p.valor)],
        ['Valorização', brl(p.res, true) + ' · ' + pct(p.resPct), cls(p.res)], ['Taxas pagas', brl(p.taxas)],
        ['DY 12 meses', d == null ? '—' : pct1(d)], ['Yield on cost', y == null ? '—' : pct1(y)]]);
      h += '<p class="note"><b>DY</b>: quanto o ativo pagou por ' + (c === 'fii' ? 'cota' : 'ação') + ' nos últimos 12 meses, dividido pela cotação de hoje. <b>Yield on cost</b>: quanto você recebeu nos últimos 12 meses, dividido pelo que você pagou nas ' + (c === 'fii' ? 'cotas' : 'ações') + ' que tem.</p>';
      h += blocoRetorno(c, a);
      h += '<p class="note">O preço médio inclui as taxas de compra. Cotação da B3 com cerca de 30 minutos de atraso.</p>';
    }
    const todos = opsOf(c, a).reverse(), ops = todos.slice(0, 12);
    h += '<div class="sec-h" style="margin-top:16px"><h2>Lançamentos</h2><div class="meta">' + (todos.length > 12 ? 'últimos 12 de ' + todos.length : todos.length) + '</div></div><div class="list ops">';
    ops.forEach(o => {
      const tot = c === 'cripto' && a !== 'USDT' && o.tipo !== 'provento' ? usd(opTotalOrig(o)) : brl(opTotalBRL(o));
      h += '<div class="row"><span class="main"><span class="t"><span class="chip ' + o.tipo + '">' + TIPO_NOME[o.tipo] + '</span> ' + fmtDate(o.data) + '</span><span class="s num">' + opLine(o) + '</span></span>' +
        '<span class="r"><span class="v num">' + tot + '</span><button class="del" data-del="' + o.id + '">Excluir</button></span></div>';
    });
    h += '</div><div style="margin-top:14px"><button class="primary" id="addHere">Lançar em ' + esc(a) + '</button></div>';
    openSheet(a, h, b => {
      b.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', async () => {
        if (!btn.classList.contains('armed')) { btn.classList.add('armed'); btn.textContent = 'Confirmar'; return; }
        const o = S.ops.find(x => x.id === btn.dataset.del);
        const msg = o && o.link ? 'Excluído e desfeito no ' + (o.fonte === 'usdt' ? 'USDT' : 'CDB') : 'Lançamento excluído';
        btn.disabled = true;
        try { await excluir(btn.dataset.del); toast(msg); } catch (e) { toast('Não deu para excluir. Tente de novo.'); btn.disabled = false; }
      }));
      b.querySelector('#addHere').addEventListener('click', () => formulario({ cls: c, ativo: a }));
    }, desenhar);
  };
  desenhar();
}

/* ---------- Novo lançamento ---------- */
let F = null;
function formulario(pre) {
  F = Object.assign({ cls: 'acao', tipo: null, ativo: '', data: S.hoje, qtd: '', preco: '', taxas: '', valor: '', pct: '100', provTipo: 'Rendimento', usarLink: true, dolar: nf2.format(dolarCripto()) }, pre || {});
  if (F.cls === 'cdb' && !F.ativo) F.ativo = cdbPadrao() || 'CDB Inter';
  if (F.ativo === 'USDT' && !F.preco) F.preco = '1,00';
  if (F.cls === 'acao' && F.tipo === 'provento') F.provTipo = 'Dividendo';
  if (!F.tipo) F.tipo = TIPOS[F.cls][0];
  openSheet('Novo lançamento', '<div id="formBox"></div>', () => drawForm());
}
function listaDe(c) {
  if (c === 'cripto') return CRIPTO;
  const l = app.lista && app.lista[c]; return l && l.length ? l : (RESERVA[c] || []);
}
function sugestoes(c, q) {
  const Q = semAcento(q.trim()); if (!Q) return [];
  const lista = listaDe(c), meus = ativosOf(c), nomes = new Map(lista.map(x => [x[0], x[1]]));
  const base = [...meus.map(a => [a, nomes.get(a) || '', true]), ...lista.filter(x => !meus.includes(x[0])).map(x => [x[0], x[1], false])];
  const comeca = [], contem = [];
  for (const x of base) { const t = semAcento(x[0]); if (t === Q) continue; if (t.startsWith(Q)) comeca.push(x); else if (t.includes(Q) || semAcento(x[1]).includes(Q)) contem.push(x); if (comeca.length >= 6) break; }
  return [...comeca, ...contem].slice(0, 6);
}
function drawForm() {
  const box = root.querySelector('#formBox'); if (!box) return;
  const c = F.cls, t = F.tipo;
  let h = '<div class="form"><div class="cls">' + ORDER.map(k => '<button type="button" data-c="' + k + '" aria-pressed="' + (k === c) + '">' + CLS[k].nome + '</button>').join('') + '</div>';
  h += '<div class="seg">' + TIPOS[c].map(k => '<button type="button" data-t="' + k + '" aria-pressed="' + (k === t) + '">' + TIPO_NOME[k] + '</button>').join('') + '</div>';
  const ph = c === 'acao' ? 'Código ou nome. Ex.: PETR4' : c === 'fii' ? 'Código ou nome. Ex.: MXRF11' : c === 'cripto' ? 'Ex.: BTC ou USDT' : c === 'tesouro' ? 'Ex.: Tesouro Selic 2031' : 'Ex.: CDB Inter';
  const maius = c === 'acao' || c === 'fii' || c === 'cripto';
  h += '<div class="field"><label for="f-ativo">' + (c === 'cdb' ? 'Aplicação' : c === 'tesouro' ? 'Título' : 'Ativo') + '</label><input id="f-ativo" autocomplete="off" spellcheck="false" placeholder="' + ph + '" value="' + esc(F.ativo) + '"' + (maius ? ' autocapitalize="characters" class="upper"' : '') + '><div class="sug" id="f-sug" role="listbox" aria-label="Sugestões" hidden></div></div>';
  h += '<div class="field"><label for="f-data">Data</label><input id="f-data" type="date" value="' + F.data + '" max="' + S.hoje + '"></div>';
  if (t === 'provento') {
    h += '<div class="two"><div class="field"><label for="f-prov">Tipo</label><select id="f-prov">' + ['Rendimento', 'Dividendo', 'JCP'].map(x => '<option' + (x === F.provTipo ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="f-valor">Valor recebido (R$)</label><input id="f-valor" inputmode="decimal" placeholder="0,00" value="' + esc(F.valor) + '"></div></div>' +
      '<p class="note" style="margin:-6px 2px 0">Os proventos anunciados entram sozinhos. Use isto só para algo que não apareceu.</p>';
  } else if (c === 'cdb') {
    h += '<div class="two"><div class="field"><label for="f-valor">' + (t === 'aporte' ? 'Valor (R$)' : 'Valor líquido (R$)') + '</label><input id="f-valor" inputmode="decimal" placeholder="0,00" value="' + esc(F.valor) + '"></div>' +
      (t === 'aporte' ? '<div class="field"><label for="f-pct">% do CDI</label><input id="f-pct" inputmode="decimal" value="' + esc(F.pct) + '"></div>' : '<div></div>') + '</div>';
  } else if (c === 'cripto') {
    h += '<div class="two"><div class="field"><label for="f-qtd">Quantidade</label><input id="f-qtd" inputmode="decimal" placeholder="0,01" value="' + esc(F.qtd) + '"></div>' +
      '<div class="field"><label for="f-preco">Preço (US$)</label><input id="f-preco" inputmode="decimal" placeholder="0,00" value="' + esc(F.preco) + '"></div></div>' +
      '<div class="two"><div class="field"><label for="f-taxas">Taxas (US$)</label><input id="f-taxas" inputmode="decimal" placeholder="0,00" value="' + esc(F.taxas) + '"></div>' +
      '<div class="field"><label for="f-dolar">Dólar do dia (R$)</label><input id="f-dolar" inputmode="decimal" value="' + esc(F.dolar) + '"></div></div>' +
      '<p class="note" id="f-usdtnote" style="margin:-6px 2px 0"' + (String(F.ativo).toUpperCase() === 'USDT' ? '' : ' hidden') + '>USDT: use preço 1,00 e, no dólar, quanto você pagou em reais por cada USDT.</p>';
  } else {
    h += '<div class="two"><div class="field"><label for="f-qtd">Quantidade</label><input id="f-qtd" inputmode="decimal" placeholder="' + (c === 'tesouro' ? '0,01' : '100') + '" value="' + esc(F.qtd) + '"></div>' +
      '<div class="field"><label for="f-preco">Preço ' + (c === 'tesouro' ? 'do título' : 'unitário') + ' (R$)</label><input id="f-preco" inputmode="decimal" placeholder="0,00" value="' + esc(F.preco) + '"></div></div>' +
      '<div class="field"><label for="f-taxas">Taxas (R$)</label><input id="f-taxas" inputmode="decimal" placeholder="0,00 — da nota da corretora" value="' + esc(F.taxas) + '"></div>';
  }
  if (t === 'compra' || t === 'venda') h += '<label class="check" for="f-link" id="f-linkbox" hidden><input type="checkbox" id="f-link"' + (F.usarLink ? ' checked' : '') + '><span><b id="f-linkt"></b><small id="f-links"></small></span></label>';
  h += '<div class="total num" id="f-total"></div><div class="err" id="f-err" role="alert" hidden></div><button class="primary" id="f-save">Salvar ' + TIPO_NOME[t].toLowerCase() + '</button></div>';
  box.innerHTML = h;
  box.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { F.cls = b.dataset.c; F.tipo = TIPOS[F.cls][0]; F.ativo = F.cls === 'cdb' ? (cdbPadrao() || 'CDB Inter') : ''; drawForm(); }));
  box.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { F.tipo = b.dataset.t; if (F.tipo === 'provento') F.provTipo = F.cls === 'fii' ? 'Rendimento' : 'Dividendo'; drawForm(); }));
  const bind = (id, key) => { const el = box.querySelector('#' + id); if (el) el.addEventListener('input', () => { F[key] = el.value; totalForm(); }); };
  bind('f-ativo', 'ativo'); bind('f-data', 'data'); bind('f-qtd', 'qtd'); bind('f-preco', 'preco'); bind('f-taxas', 'taxas'); bind('f-valor', 'valor'); bind('f-pct', 'pct'); bind('f-dolar', 'dolar');
  const sel = box.querySelector('#f-prov'); if (sel) sel.addEventListener('change', () => { F.provTipo = sel.value; });
  const ck = box.querySelector('#f-link'); if (ck) ck.addEventListener('change', () => { F.usarLink = ck.checked; totalForm(); });
  // autocompletar: sugestões abaixo do campo, filtrando enquanto digita
  const ai = box.querySelector('#f-ativo'), sugEl = box.querySelector('#f-sug');
  const mostrar = () => {
    const it = sugestoes(c, ai.value);
    sugEl.innerHTML = it.map(x => '<button type="button" class="sugi" role="option" data-v="' + esc(x[0]) + '"><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span>' + (x[2] ? '<em>na carteira</em>' : '') + '</button>').join('');
    sugEl.hidden = !it.length;
  };
  ai.addEventListener('input', mostrar); ai.addEventListener('focus', mostrar);
  ai.addEventListener('blur', () => setTimeout(() => { sugEl.hidden = true; }, 150));
  sugEl.addEventListener('mousedown', e => e.preventDefault());
  sugEl.addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    F.ativo = b.dataset.v; ai.value = F.ativo; sugEl.hidden = true;
    if (c === 'cripto' && F.ativo === 'USDT' && !F.preco) { F.preco = '1,00'; const pr = box.querySelector('#f-preco'); if (pr) pr.value = F.preco; }
    const pr = box.querySelector('#f-preco');
    if (pr && !F.preco && F.tipo !== 'provento') { const p = c === 'cripto' ? S.mk.cripto[F.ativo] : c === 'tesouro' ? S.mk.tesouro[F.ativo] : S.mk.precos[F.ativo]; if (p > 0 && F.data === S.hoje) { F.preco = nf2.format(p); pr.value = F.preco; } }
    totalForm(); const nx = box.querySelector('#f-qtd') || box.querySelector('#f-valor'); if (nx) nx.focus();
  });
  totalForm();
}
function formOrig() { const q = num(F.qtd), p = num(F.preco), tx = num(F.taxas) || 0; return q * p + (F.tipo === 'compra' ? tx : -tx); }
function formTotalBRL() { if (F.tipo === 'provento' || F.cls === 'cdb') return num(F.valor); return formOrig() * (F.cls === 'cripto' ? num(F.dolar) : 1); }
function totalForm() {
  const el = root.querySelector('#f-total'); if (!el) return;
  const v = formTotalBRL(); const lab = F.tipo === 'compra' ? 'Total pago' : F.tipo === 'venda' ? 'Total recebido' : 'Total';
  let val = isNaN(v) ? '—' : brl(v);
  if (F.cls === 'cripto' && F.tipo !== 'provento') { const u = formOrig(); if (!isNaN(u)) val = usd(u) + ' · ' + val; }
  el.innerHTML = '<span>' + lab + '</span><span>' + val + '</span>';
  const un = root.querySelector('#f-usdtnote'); if (un) un.hidden = String(F.ativo).trim().toUpperCase() !== 'USDT';
  const box = root.querySelector('#f-linkbox'); if (!box) return;
  const fonte = fonteDe(F.cls, F.ativo, F.tipo), d = F.data || S.hoje, cdb = cdbPadrao();
  box.hidden = !fonte; if (!fonte) return;
  const lt = root.querySelector('#f-linkt'), ls = root.querySelector('#f-links');
  if (F.tipo === 'compra') {
    lt.textContent = fonte === 'usdt' ? 'Pagar com USDT' : 'Tirar o valor do ' + cdb;
    ls.textContent = !F.usarLink ? 'Nada será descontado.' :
      fonte === 'usdt' ? 'Disponível em ' + fmtDM(d) + ': ' + (hide ? HID : nf2.format(qtdEm('cripto', 'USDT', d))) + ' USDT. A venda do USDT é lançada sozinha.'
        : 'Disponível em ' + fmtDM(d) + ': ' + brl(cdbValor(cdb, d).liq) + ' líquido. O resgate é lançado sozinho.';
  } else {
    lt.textContent = fonte === 'usdt' ? 'Guardar o valor em USDT' : 'Guardar o valor no ' + cdb;
    ls.textContent = !F.usarLink ? 'O valor não será guardado em lugar nenhum.' : fonte === 'usdt' ? 'Entra como compra de USDT, sem taxa.' : 'Entra como aporte no CDB, no mesmo % do CDI.';
  }
}
function erro(m) { const e = root.querySelector('#f-err'); e.textContent = m; e.hidden = false; }
async function salvar() {
  const c = F.cls, t = F.tipo;
  let ativo = String(F.ativo || '').trim().replace(/\s+/g, ' '); if (c === 'acao' || c === 'fii' || c === 'cripto') ativo = ativo.toUpperCase();
  if (!ativo) return erro('Digite o nome do ativo.');
  if (!F.data || F.data > S.hoje) return erro('Escolha uma data até hoje.');
  const o = { id: uid(), cls: c, tipo: t, ativo, data: F.data, ts: Date.now() };
  let ligado = null;
  if (t === 'provento' || c === 'cdb') {
    o.valor = num(F.valor); if (!(o.valor > 0)) return erro('Digite o valor em reais, por exemplo 150,00.');
    if (t === 'provento') o.provTipo = F.provTipo;
    if (t === 'aporte') { o.pct = num(F.pct); if (!(o.pct > 0)) return erro('Digite o percentual do CDI, por exemplo 100.'); }
    if (t === 'resgate') { const v = cdbValor(ativo, F.data).liq; if (o.valor > v + 0.01) return erro('O saldo líquido nessa data é ' + brl(v) + '. Digite um valor menor.'); }
  } else {
    o.qtd = num(F.qtd); o.preco = num(F.preco); o.taxas = num(F.taxas) || 0;
    if (!(o.qtd > 0)) return erro('Digite a quantidade.');
    if (!(o.preco > 0)) return erro('Digite o preço.');
    if (o.taxas < 0) return erro('As taxas não podem ser negativas.');
    if (c === 'cripto') { o.dolar = num(F.dolar); if (!(o.dolar > 0)) return erro('Digite a cotação do dólar, por exemplo 5,38.'); }
    if (t === 'venda') { const q = pos(c, ativo).qtd; if (o.qtd > q + 1e-9) return erro('Você tem ' + nfq.format(q) + ' de ' + ativo + '. Digite uma quantidade até esse valor.'); }
    const fonte = fonteDe(c, ativo, t);
    if (fonte && F.usarLink) {
      const cdb = cdbPadrao();
      if (t === 'compra' && fonte === 'cdb') { const disp = cdbValor(cdb, F.data).liq, tot = opTotalBRL(o); if (tot > disp + 0.01) return erro('O ' + cdb + ' tinha ' + brl(disp) + ' líquido nessa data. Desmarque a opção ou ajuste a compra.'); }
      if (t === 'compra' && fonte === 'usdt') { const disp = qtdEm('cripto', 'USDT', F.data), tot = opTotalOrig(o); if (tot > disp + 0.01) return erro('Você tinha ' + nf2.format(disp) + ' USDT nessa data e a compra custa ' + nf2.format(tot) + '. Desmarque a opção ou ajuste a compra.'); }
      ligado = Object.assign({ id: uid(), taxas: 0, ts: o.ts + 1 }, linkedOp(o, fonte, cdb, cdb ? cdbValor(cdb, F.data).pct : 100));
      o.link = ligado.id; o.fonte = fonte;
    }
  }
  const btn = root.querySelector('#f-save'); btn.disabled = true;
  try {
    const p = store.salvar(ligado ? [o, ligado] : [o]);
    // offline o Firestore guarda e envia depois: não espera a resposta para fechar
    await Promise.race([p, new Promise(r => setTimeout(r, 1500))]);
    p.catch(() => toast('Não deu para salvar. Confira a internet.'));
  } catch (e) { btn.disabled = false; return erro('Não deu para salvar. Tente de novo.'); }
  closeSheet();
  toast(!ligado ? TIPO_NOME[t] + ' registrada' : t === 'compra' ? 'Compra registrada e paga com ' + (o.fonte === 'usdt' ? 'USDT' : 'o CDB') : 'Venda registrada e valor guardado ' + (o.fonte === 'usdt' ? 'em USDT' : 'no CDB'));
}
document.addEventListener('click', e => { if (e.target && e.target.id === 'f-save') salvar(); });

/* ---------- Menu ---------- */
function menu() {
  const u = app.user || {};
  const at = S.mk.atualizado || {};
  const linha = (k, v) => '<div class="l"><span>' + k + '</span><span class="num">' + v + '</span></div>';
  const h = '<div class="menu">' +
    '<section class="ret"><h4>Conta</h4>' + (app.demo ? '<p class="note" style="margin:0">Modo demonstração: os dados são de exemplo e ficam só neste aparelho.</p>' :
      '<div class="l"><span>Entrou como</span><span class="ell">' + esc(u.email || '') + '</span></div>') +
    '<button class="ghost" id="m-sair" style="margin-top:10px">' + (app.demo ? 'Voltar aos dados de exemplo' : 'Sair da conta') + '</button></section>' +
    '<section class="ret"><h4>Última atualização</h4>' +
      linha('Ações e FIIs', fmtHora(at.b3)) + linha('Cripto e USDT', fmtHora(at.cripto)) + linha('Tesouro Direto', fmtHora(at.tesouro)) +
      linha('CDI', fmtHora(at.cdi)) + linha('Proventos anunciados', fmtHora(at.proventos)) +
      '<p class="note" style="margin:6px 0 0">As cotações da B3 são atualizadas a cada 30 minutos nos dias úteis, das 10h às 18h, com cerca de 30 minutos de atraso. Cripto atualiza toda vez que você abre o app.</p></section>' +
    '<button class="menuitem" id="m-ir"><b>Relatório para o IR</b><span>Posição em 31/12 e proventos do ano</span></button>' +
    '<button class="menuitem" id="m-bkp"><b>Cópia de segurança</b><span>Baixar todos os lançamentos numa planilha</span></button>' +
    '<p class="note" style="text-align:center">Minha Carteira · versão ' + esc(versao) + '</p></div>';
  openSheet('Menu', h, b => {
    const s = b.querySelector('#m-sair');
    s.addEventListener('click', async () => {
      if (!s.dataset.armed) { s.dataset.armed = '1'; s.textContent = app.demo ? 'Toque de novo para apagar o que você testou' : 'Toque de novo para sair'; s.classList.add('danger'); return; }
      closeSheet(); await store.sair();
    });
    b.querySelector('#m-ir').addEventListener('click', () => relatorio(+S.hoje.slice(0, 4) - 1));
    b.querySelector('#m-bkp').addEventListener('click', copia);
  });
}

function relatorio(ano) {
  const R = relatorioIR(String(ano));
  const anos = [...new Set(S.ops.map(o => +o.data.slice(0, 4)))].sort((a, b) => b - a);
  if (!anos.includes(ano)) anos.push(ano);
  let h = '<div class="field"><label for="ir-ano">Ano</label><select id="ir-ano">' + anos.sort((a, b) => b - a).map(a => '<option' + (a === ano ? ' selected' : '') + '>' + a + '</option>').join('') + '</select></div>';
  h += '<div class="sec-h" style="margin-top:16px"><h2>Bens e direitos em 31/12/' + ano + '</h2></div>';
  if (!R.bens.length) h += '<div class="card empty">Nenhum ativo em 31/12/' + ano + '.</div>';
  else {
    h += '<div class="list">';
    for (const b of R.bens) {
      h += '<div class="row">' + tick(b.cls, b.ativo) + '<span class="main"><span class="t">' + esc(b.ativo) + '</span>' + (b.qtd != null ? '<span class="s num">' + unid(b.cls, b.qtd, b.ativo) + '</span>' : '') + '<span class="s num">Grupo ' + codigoIR(b.cls, b.ativo).replace(' · ', ' · código ') + '</span></span>' +
        '<span class="r num"><span class="v">' + brl(b.valor) + '</span><span class="s">' + b.nota + '</span></span></div>';
    }
    h += '</div><p class="note">Em bens e direitos vale o <b>custo de compra</b> (preço médio com taxas × quantidade), não o valor de mercado. Cripto em reais, pelo dólar do dia de cada compra. Grupo/código são sugestões: confira no programa da Receita e no informe da corretora e do banco.</p>';
  }
  const tipos = Object.keys(R.porTipo);
  h += '<div class="sec-h" style="margin-top:16px"><h2>Proventos recebidos em ' + ano + '</h2></div>';
  if (!tipos.length) h += '<div class="card empty">Nenhum provento em ' + ano + '.</div>';
  else {
    h += '<div class="list">';
    for (const t of tipos) {
      h += '<div class="row"><span class="main"><span class="t">' + t + '</span><span class="s">' + (t === 'JCP' ? 'tributação exclusiva (já descontada)' : 'isentos') + '</span></span><span class="r num v pos">' + brl(R.porTipo[t]) + '</span></div>';
      Object.keys(R.porAtivo).filter(k => k.startsWith(t + '|')).sort().forEach(k => {
        h += '<div class="row sub"><span class="main"><span class="s">' + esc(k.split('|')[1]) + '</span></span><span class="r num s">' + brl(R.porAtivo[k]) + '</span></div>';
      });
    }
    h += '</div><p class="note">Os valores são os que o app registrou. O informe de rendimentos da corretora é o documento oficial.</p>';
  }
  h += '<button class="ghost" id="ir-csv" style="margin-top:14px">Baixar este relatório (planilha)</button>';
  openSheet('Relatório para o IR', h, b => {
    b.querySelector('#ir-ano').addEventListener('change', e => relatorio(+e.target.value));
    b.querySelector('#ir-csv').addEventListener('click', () => {
      const L = [['Bens e direitos em 31/12/' + ano], ['Ativo', 'Classe', 'Grupo/código', 'Quantidade', 'Valor (R$)', 'Observação']];
      R.bens.forEach(x => L.push([x.ativo, CLS[x.cls].nome, codigoIR(x.cls, x.ativo), x.qtd == null ? '' : nfq.format(x.qtd), nf2.format(x.valor), x.nota]));
      L.push([]); L.push(['Proventos recebidos em ' + ano]); L.push(['Tipo', 'Ativo', 'Valor (R$)']);
      Object.keys(R.porAtivo).sort().forEach(k => { const [t, a] = k.split('|'); L.push([t, a, nf2.format(R.porAtivo[k])]); });
      baixar('relatorio-ir-' + ano + '.csv', L);
    });
  });
}

function copia() {
  const L = [['Data', 'Tipo', 'Classe', 'Ativo', 'Quantidade', 'Preço', 'Taxas', 'Dólar', 'Valor (R$)', '% do CDI', 'Provento', 'Observação']];
  S.ops.slice().sort(byDate).forEach(o => {
    const obs = o.de ? (S.ops.find(x => x.id === o.de) ? 'automático: ' + opLine(o) : 'automático') : (o.link ? fonteTxt(o.fonte, o.tipo) : (o.auto ? 'provento automático' : ''));
    L.push([fmtDate(o.data), TIPO_NOME[o.tipo], CLS[o.cls].nome, o.ativo, o.qtd != null ? nfq.format(o.qtd) : '', o.preco != null ? nfq.format(o.preco) : '', o.taxas ? nfq.format(o.taxas) : '',
      o.dolar ? nf2.format(o.dolar) : '', nf2.format(opTotalBRL(o)), o.pct ? nf2.format(o.pct) : '', o.provTipo || '', obs.replace(/<[^>]+>/g, '')]);
  });
  baixar('minha-carteira-' + S.hoje + '.csv', L);
  toast('Planilha baixada');
}
function baixar(nome, linhas) {
  const csv = '﻿' + linhas.map(r => r.map(v => { v = String(v ?? ''); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

let tt;
export function toast(m) { const el = root.querySelector('#toast'); el.textContent = m; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => { el.hidden = true; }, 2600); }

/* para os testes */
window.__carteira = { S, carteira, posCDB, posRV, aReceber, retorno, dy12, yoc, relatorioIR };
