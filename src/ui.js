/* Telas do app (segue o protótipo aprovado). */
import { nf2, nf0, nf4, nfq, r2, num, esc, uid, semAcento, daysBetween, parse, iso, today, fmtDate, fmtDM, fmtHora, monthKey, monthName,
  MESES, MESES_LONGOS, storeGet, storeSet, storeDel } from './util.js';
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
  lancamentos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  analise: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'
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
    '<nav class="tabs" id="tabs" hidden><div class="in">' + ['carteira', 'proventos', 'lancamentos', 'analise'].map(t => '<button data-tab="' + t + '">' + TAB_ICONS[t] + { carteira: 'Carteira', proventos: 'Proventos', lancamentos: 'Lançamentos', analise: 'Análise' }[t] + '</button>').join('') + '</div></nav>' +
    '<div id="sheetRoot"></div><div id="toast" class="toast" role="status" hidden></div>' +
    '<div class="lock" id="lock" hidden><div class="lock-in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 11c0 3.5-1 6.5-2.5 9M8.5 6.6A6 6 0 0 1 18 11c0 1.5-.1 3-.4 4.4M6 9a6 6 0 0 0-.1 1.1c0 2.4-.6 4.6-1.6 6.6M15 11a3 3 0 0 0-6 0c0 2.2-.5 4.3-1.4 6.2M14.6 20.4c.6-1.6 1-3.3 1.2-5"/></svg>' +
    '<h2>Minha carteira</h2><p>Use a sua digital para abrir.</p><button class="primary" id="lock-ok">Desbloquear</button>' +
    '<button class="linkbtn" id="lock-google">Não consigo usar a digital</button><p class="err" id="lock-err" hidden></p></div></div>';
  root.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); window.scrollTo(0, 0); }));
  root.querySelector('#eye').addEventListener('click', () => { hide = !hide; storeSet(HIDE_KEY, hide ? '1' : '0'); render(); });
  root.querySelector('#more').addEventListener('click', menu);
  root.querySelector('#fab').addEventListener('click', () => formulario(tab === 'proventos' ? { cls: 'fii', tipo: 'provento' } : null));
  root.querySelector('#view').addEventListener('click', e => {
    if (e.target.closest('#login')) { entrar(); return; }
    const ed = e.target.closest('[data-edit]'); if (ed) { editar(ed.dataset.edit); return; }
    const fi = e.target.closest('[data-ficha]'); if (fi) { ficha(fi.dataset.ficha); return; }
    const ac = e.target.closest('[data-acls]'); if (ac) { analiseCls = ac.dataset.acls; render(); return; }
    if (e.target.closest('#a-crit')) { criterios(); return; }
    if (e.target.closest('#a-mais')) { analiseLimite += 30; render(); return; }
    const r = e.target.closest('[data-ativo]'); if (r) detalhe(r.dataset.cls, r.dataset.ativo);
  });
  window.addEventListener('popstate', () => { if (root.querySelector('#scrim')) closeSheet(true); });
  root.querySelector('#lock-ok').addEventListener('click', () => desbloquear());
  root.querySelector('#lock-google').addEventListener('click', async () => {
    const b = root.querySelector('#lock-google');
    if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Toque de novo para sair e entrar com a conta Google (o bloqueio será desligado)'; return; }
    storeDel(LOCK_KEY); root.querySelector('#lock').hidden = true; await store.sair();
  });
  if (storeGet(LOCK_KEY)) bloquear();
  document.addEventListener('visibilitychange', () => {
    if (!storeGet(LOCK_KEY)) return;
    if (document.visibilityState === 'hidden') { escondidoEm = Date.now(); return; }
    if (escondidoEm && Date.now() - escondidoEm > 60000) bloquear();
  });
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

/* ---------- Bloqueio com digital (biometria do celular, pelo navegador) ----------
   Ao ligar, o celular cria uma chave de acesso só para este app; para abrir, o celular pede a digital (ou o desbloqueio de tela).
   É uma trava local: os dados continuam protegidos pelo login Google. */
const LOCK_KEY = 'mc-lock';
let escondidoEm = 0, desbloqueando = false;
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function biometriaDisponivel() {
  try { return !!(window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()); } catch (e) { return false; }
}
async function pedirDigital(id) {
  return navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rpId: location.hostname,
    allowCredentials: [{ type: 'public-key', id: unb64(id), transports: ['internal'] }], userVerification: 'required', timeout: 60000 } });
}
async function ligarDigital() {
  const cred = await navigator.credentials.create({ publicKey: {
    challenge: crypto.getRandomValues(new Uint8Array(32)),
    rp: { name: 'Minha Carteira', id: location.hostname },
    user: { id: crypto.getRandomValues(new Uint8Array(16)), name: (app.user && app.user.email) || 'carteira', displayName: 'Minha Carteira' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
    timeout: 60000, attestation: 'none' } });
  storeSet(LOCK_KEY, b64(cred.rawId));
}
function bloquear() {
  const l = root.querySelector('#lock'); if (!l) return;
  l.hidden = false; root.querySelector('#lock-err').hidden = true;
  desbloquear();
}
async function desbloquear() {
  const id = storeGet(LOCK_KEY); const l = root.querySelector('#lock');
  if (!id) { l.hidden = true; return; }
  if (desbloqueando) return; desbloqueando = true;
  try { await pedirDigital(id); l.hidden = true; escondidoEm = 0; }
  catch (e) {
    const er = root.querySelector('#lock-err');
    if (e && e.name !== 'NotAllowedError') { er.textContent = 'O celular não respondeu. Toque em Desbloquear para tentar de novo.'; er.hidden = false; }
  } finally { desbloqueando = false; }
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
  root.querySelector('#fab').hidden = !logado || tab === 'analise';
  root.querySelector('#tabs').hidden = !logado;
  root.querySelector('#sub').textContent = app.demo ? 'Modo demonstração · dados de exemplo' : (logado ? subtitulo() : '');
  root.querySelectorAll('.tabs button').forEach(b => { if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  if (app.fase === 'login') { view.innerHTML = vLogin(); return; }
  if (app.fase === 'erro') { view.innerHTML = '<div class="card empty">Não deu para abrir o app. Confira a internet e abra de novo.</div>'; return; }
  if (!logado) { view.innerHTML = '<div class="card empty">Abrindo sua carteira…</div>'; return; }
  if (tab === 'analise') { renderAnalise(view); return; }
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
      h += '<button class="row" data-edit="' + o.id + '">' + tick(o.cls, o.ativo) +
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
    '<div class="delta"><small>Corretagem, B3 e corretora de cripto, como você registrou em cada compra e venda.</small></div></section>' +
    '<p class="note" style="margin-top:12px">Toque num lançamento para editar ou excluir.</p>';
  let cur = '';
  ops.forEach(o => {
    const k = monthKey(o.data);
    if (k !== cur) {
      if (cur) h += '</div></section>'; cur = k;
      h += '<section class="sec"><div class="sec-h"><h2>' + monthName(k) + '</h2><div class="meta num">' + (taxMes[k] > 0.004 ? 'taxas ' + brl(taxMes[k]) : 'sem taxas') + '</div></div><div class="list">';
    }
    h += '<button class="row" data-edit="' + o.id + '">' + tick(o.cls, o.ativo) +
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
      h += '<button class="row" data-edit="' + o.id + '"><span class="main"><span class="t"><span class="chip ' + o.tipo + '">' + TIPO_NOME[o.tipo] + '</span> ' + fmtDate(o.data) + '</span><span class="s num">' + opLine(o) + '</span></span>' +
        '<span class="r"><span class="v num">' + tot + '</span><span class="s">editar ›</span></span></button>';
    });
    h += '</div><div style="margin-top:14px"><button class="primary" id="addHere">Lançar em ' + esc(a) + '</button></div>';
    openSheet(a, h, b => {
      b.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => editar(btn.dataset.edit)));
      b.querySelector('#addHere').addEventListener('click', () => formulario({ cls: c, ativo: a }));
    }, desenhar);
  };
  desenhar();
}

/* ---------- Editar um lançamento ---------- */
const txt = v => v == null || v === '' ? '' : String(+(+v).toFixed(8)).replace('.', ',');
function editar(id) {
  let o = S.ops.find(x => x.id === id); if (!o) return;
  if (o.de) { const m = S.ops.find(x => x.id === o.de); if (m) o = m; } // resgate/aporte automático: edita a compra ou venda que o criou
  formulario({ cls: o.cls, tipo: o.tipo, ativo: o.ativo, data: o.data, qtd: txt(o.qtd), preco: txt(o.preco), taxas: o.taxas ? txt(o.taxas) : '', valor: txt(o.valor),
    pct: txt(o.pct || 100), provTipo: o.provTipo || 'Rendimento', dolar: txt(o.dolar || dolarCripto()), usarLink: !!o.link,
    editId: o.id, linkId: o.link || null, ts: o.ts, auto: !!o.auto });
}

/* ---------- Novo lançamento ---------- */
let F = null;
function formulario(pre) {
  F = Object.assign({ cls: 'acao', tipo: null, ativo: '', data: S.hoje, qtd: '', preco: '', taxas: '', valor: '', pct: '100', provTipo: 'Rendimento', usarLink: true, dolar: nf2.format(dolarCripto()) }, pre || {});
  if (F.cls === 'cdb' && !F.ativo) F.ativo = cdbPadrao() || 'CDB Inter';
  if (F.ativo === 'USDT' && !F.preco) F.preco = '1,00';
  if (F.cls === 'acao' && F.tipo === 'provento' && !F.editId) F.provTipo = 'Dividendo';
  if (!F.tipo) F.tipo = TIPOS[F.cls][0];
  openSheet(F.editId ? 'Editar lançamento' : 'Novo lançamento', '<div id="formBox"></div>', () => drawForm());
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
      (t === 'aporte' ? '<div class="field"><label for="f-pct">% do CDI</label><input id="f-pct" inputmode="decimal" value="' + esc(F.pct) + '"></div>' : '<div></div>') + '</div>' +
      '<p class="note" style="margin:-6px 2px 0">' + (t === 'aporte' ? 'Coloque o valor que você aplicou, na data em que aplicou (não o saldo de hoje). O app calcula o rendimento e o imposto de cada aporte.' : 'Coloque o valor que caiu na sua conta.') + '</p>';
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
  h += '<div class="total num" id="f-total"></div><div class="err" id="f-err" role="alert" hidden></div><button class="primary" id="f-save">' + (F.editId ? 'Salvar alterações' : 'Salvar ' + TIPO_NOME[t].toLowerCase()) + '</button>' +
    (F.editId ? '<button class="ghost" id="f-del" type="button">Excluir lançamento</button>' : '') + '</div>';
  box.innerHTML = h;
  box.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => { F.cls = b.dataset.c; F.tipo = TIPOS[F.cls][0]; F.ativo = F.cls === 'cdb' ? (cdbPadrao() || 'CDB Inter') : ''; drawForm(); }));
  box.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { F.tipo = b.dataset.t; if (F.tipo === 'provento') F.provTipo = F.cls === 'fii' ? 'Rendimento' : 'Dividendo'; drawForm(); }));
  const bind = (id, key) => { const el = box.querySelector('#' + id); if (el) el.addEventListener('input', () => { F[key] = el.value; totalForm(); }); };
  bind('f-ativo', 'ativo'); bind('f-data', 'data'); bind('f-qtd', 'qtd'); bind('f-preco', 'preco'); bind('f-taxas', 'taxas'); bind('f-valor', 'valor'); bind('f-pct', 'pct'); bind('f-dolar', 'dolar');
  const sel = box.querySelector('#f-prov'); if (sel) sel.addEventListener('change', () => { F.provTipo = sel.value; });
  const ck = box.querySelector('#f-link'); if (ck) ck.addEventListener('change', () => { F.usarLink = ck.checked; totalForm(); });
  const del = box.querySelector('#f-del');
  if (del) del.addEventListener('click', async () => {
    if (!del.dataset.armed) {
      const o = S.ops.find(x => x.id === F.editId);
      del.dataset.armed = '1'; del.classList.add('danger');
      del.textContent = o && o.link ? 'Toque de novo: exclui e desfaz no ' + (o.fonte === 'usdt' ? 'USDT' : 'CDB') : 'Toque de novo para excluir';
      return;
    }
    del.disabled = true;
    try { await excluir(F.editId); closeSheet(); toast('Lançamento excluído'); } catch (e) { del.disabled = false; erro('Não deu para excluir. Tente de novo.'); }
  });
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
  // ao editar, as contas de saldo (CDB, USDT, quantidade para vender) ignoram a versão antiga deste lançamento
  const todas = S.ops;
  if (F.editId) S.ops = todas.filter(x => x.id !== F.editId && x.id !== F.linkId);
  let r;
  try { r = montar(); } finally { S.ops = todas; }
  if (typeof r === 'string') return erro(r);
  const { o, ligado } = r, t = o.tipo;
  const btn = root.querySelector('#f-save'); btn.disabled = true;
  try {
    const p = store.salvar(ligado ? [o, ligado] : [o]);
    if (F.linkId && (!ligado || ligado.id !== F.linkId)) store.excluir([F.linkId]);
    // offline o Firestore guarda e envia depois: não espera a resposta para fechar
    await Promise.race([p, new Promise(res => setTimeout(res, 1500))]);
    p.catch(() => toast('Não deu para salvar. Confira a internet.'));
  } catch (e) { btn.disabled = false; return erro('Não deu para salvar. Tente de novo.'); }
  const editando = !!F.editId;
  closeSheet();
  toast(editando ? 'Alterações salvas' : !ligado ? TIPO_NOME[t] + ' registrada' : t === 'compra' ? 'Compra registrada e paga com ' + (o.fonte === 'usdt' ? 'USDT' : 'o CDB') : 'Venda registrada e valor guardado ' + (o.fonte === 'usdt' ? 'em USDT' : 'no CDB'));
}
/* Confere o formulário e monta o lançamento (e o automático do CDB/USDT). Devolve um texto de erro se faltar algo. */
function montar() {
  const erro = m => m;
  const c = F.cls, t = F.tipo;
  let ativo = String(F.ativo || '').trim().replace(/\s+/g, ' '); if (c === 'acao' || c === 'fii' || c === 'cripto') ativo = ativo.toUpperCase();
  if (!ativo) return erro('Digite o nome do ativo.');
  if (!F.data || F.data > S.hoje) return erro('Escolha uma data até hoje.');
  const o = { id: F.editId || uid(), cls: c, tipo: t, ativo, data: F.data, ts: F.ts || Date.now() };
  if (F.editId && F.auto && t === 'provento') { o.auto = true; o.editado = true; }
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
      ligado = Object.assign({ id: F.linkId || uid(), taxas: 0, ts: o.ts + 1 }, linkedOp(o, fonte, cdb, cdb ? cdbValor(cdb, F.data).pct : 100));
      o.link = ligado.id; o.fonte = fonte;
    }
  }
  return { o, ligado };
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
    ('<section class="ret"><h4>Segurança</h4><p class="note" style="margin:0">' + (storeGet(LOCK_KEY) ? 'O app pede a sua digital toda vez que abre (e quando você volta depois de 1 minuto fora).' : 'Peça a digital do celular toda vez que abrir o app.') + '</p>' +
      '<button class="ghost" id="m-lock" style="margin-top:10px">' + (storeGet(LOCK_KEY) ? 'Desligar bloqueio com digital' : 'Ligar bloqueio com digital') + '</button><p class="err" id="m-lock-err" style="margin:8px 0 0" hidden></p></section>') +
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
      closeSheet(); storeDel(LOCK_KEY); await store.sair();
    });
    b.querySelector('#m-ir').addEventListener('click', () => relatorio(+S.hoje.slice(0, 4) - 1));
    b.querySelector('#m-bkp').addEventListener('click', copia);
    const lk = b.querySelector('#m-lock');
    if (lk) lk.addEventListener('click', async () => {
      const er = b.querySelector('#m-lock-err'); er.hidden = true;
      const ligado = storeGet(LOCK_KEY);
      try {
        if (ligado) { await pedirDigital(ligado); storeDel(LOCK_KEY); toast('Bloqueio com digital desligado'); }
        else {
          if (!await biometriaDisponivel()) { er.textContent = 'Este celular não tem digital ou desbloqueio de tela configurado para o navegador. Configure em Ajustes do Android → Segurança.'; er.hidden = false; return; }
          await ligarDigital(); toast('Bloqueio com digital ligado');
        }
        closeSheet();
      } catch (e) {
        if (e && e.name === 'NotAllowedError') return; // a pessoa cancelou
        er.textContent = 'Não deu para ' + (ligado ? 'desligar' : 'ligar') + ' o bloqueio. Tente de novo.'; er.hidden = false;
      }
    });
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

/* ---------- Aba Análise ---------- */
let analiseCls = 'fii', analiseLimite = 30, analiseQ = '';
const AN = { dados: null, carregando: false, erro: false };
const CRIT_PADRAO = {
  fii: { pvpMax: '1,00', dyMin: '10', mesesMin: '12', liqMin: '1', cotMin: '10000', ifrMax: '', seg: '', ordem: 'dy' },
  acao: { dyMin: '6', mesesMin: '1', liqMin: '2', ifrMax: '', ordem: 'dy' }
};
const critDe = c => Object.assign({}, CRIT_PADRAO[c], ((app.settings.criterios || {})[c]) || {});

async function carregarAnalise() {
  if (AN.dados || AN.carregando) return;
  AN.carregando = true; AN.erro = false;
  try {
    const r = await fetch(app.demo && !location.search.includes('real') ? 'dados/analise.json' : 'dados/analise.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('http');
    AN.dados = await r.json();
    AN.med = medianas(AN.dados.ativos);
  } catch (e) { AN.erro = true; }
  AN.carregando = false;
  if (tab === 'analise') render();
}
function mediana(v) { v = v.filter(x => x != null && isFinite(x)).sort((a, b) => a - b); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; }
function medianas(A) { // por segmento de FII (só os com alguma liquidez) e para ações que pagam
  const seg = {}, acoes = [];
  for (const x of Object.values(A)) {
    if (!(x.liq >= 100)) continue;
    if (x.c === 'fii' && x.seg) { (seg[x.seg] ||= { dy: [], pvp: [] }); if (x.dy) seg[x.seg].dy.push(x.dy); if (x.pvp) seg[x.seg].pvp.push(x.pvp); }
    if (x.c === 'acao' && x.dy) acoes.push(x.dy);
  }
  const out = { seg: {}, acaoDy: mediana(acoes) };
  for (const [k, v] of Object.entries(seg)) out.seg[k] = { dy: mediana(v.dy), pvp: mediana(v.pvp), n: v.dy.length };
  return out;
}
const n1 = v => nf2.format(v).replace(/,00$/, '');
const pctA = v => v == null ? '—' : nf2.format(v * 100).replace(/,00$/, '') + '%';
const liqTxt = v => v == null ? '—' : v >= 1000 ? 'R$ ' + n1(v / 1000) + ' mi' : 'R$ ' + nf0.format(v) + ' mil';
function ifrInfo(v) {
  if (v == null) return { txt: '—', cls: '', nome: 'sem dados' };
  if (v <= 30) return { txt: nf0.format(v), cls: 'ifr-baixo', nome: 'sobrevendido' };
  if (v >= 70) return { txt: nf0.format(v), cls: 'ifr-alto', nome: 'sobrecomprado' };
  return { txt: nf0.format(v), cls: '', nome: 'neutro' };
}

function filtrar(c) {
  const k = critDe(c), A = (AN.dados || {}).ativos || {};
  const f = x => { const v = num(x); return isNaN(v) ? null : v; };
  const pvpMax = f(k.pvpMax), dyMin = f(k.dyMin), mesesMin = f(k.mesesMin), liqMin = f(k.liqMin), cotMin = f(k.cotMin), ifrMax = f(k.ifrMax);
  const out = [];
  for (const [t, x] of Object.entries(A)) {
    if (x.c !== c || !x.p) continue;
    if (dyMin != null && !((x.dy || 0) * 100 >= dyMin)) continue;
    if (mesesMin != null && !((x.mp || 0) >= mesesMin)) continue;
    if (liqMin != null && !((x.liq || 0) >= liqMin * 1000)) continue;
    if (c === 'fii') {
      if (pvpMax != null && !(x.pvp != null && x.pvp <= pvpMax)) continue;
      if (cotMin != null && !((x.cot || 0) >= cotMin)) continue;
      if (k.seg && x.seg !== k.seg) continue;
    }
    if (ifrMax != null && !(x.iD != null && x.iD <= ifrMax)) continue;
    out.push([t, x]);
  }
  const ord = { dy: (a, b) => (b[1].dy || 0) - (a[1].dy || 0), pvp: (a, b) => (a[1].pvp ?? 9) - (b[1].pvp ?? 9), ifr: (a, b) => (a[1].iD ?? 999) - (b[1].iD ?? 999), liq: (a, b) => (b[1].liq || 0) - (a[1].liq || 0) }[k.ordem] || ((a, b) => 0);
  return out.sort(ord);
}
function critResumo(c) {
  const k = critDe(c), p = [];
  if (c === 'fii' && k.pvpMax) p.push('P/VP até ' + k.pvpMax);
  if (k.dyMin) p.push('DY a partir de ' + k.dyMin + '%');
  if (k.mesesMin) p.push(c === 'fii' ? 'pagou ' + k.mesesMin + ' de 12 meses' : 'pagou em ' + (k.mesesMin === '1' ? 'algum' : k.mesesMin) + (k.mesesMin === '1' ? ' mês' : ' meses') + ' dos últimos 12');
  if (k.liqMin) p.push('liquidez a partir de R$ ' + k.liqMin + ' mi/dia');
  if (c === 'fii' && k.cotMin) p.push('a partir de ' + nf0.format(num(k.cotMin)) + ' cotistas');
  if (c === 'fii' && k.seg) p.push('segmento ' + k.seg);
  if (k.ifrMax) p.push('IFR diário até ' + k.ifrMax);
  return p.join(' · ');
}

function renderAnalise(view) {
  if (!AN.dados) {
    view.innerHTML = '<div class="card empty">' + (AN.erro ? 'Não deu para carregar os dados de análise. Confira a internet e abra a aba de novo.' : 'Carregando os dados de análise…') + '</div>';
    if (!AN.carregando) { AN.erro = false; carregarAnalise(); }
    return;
  }
  const lista = filtrar(analiseCls);
  let h = '<div class="field"><label for="a-busca">Analisar um ativo</label><input id="a-busca" class="upper" autocomplete="off" spellcheck="false" autocapitalize="characters" placeholder="Código ou nome. Ex.: MXRF11, Itaú" value="' + esc(analiseQ) + '"><div class="sug" id="a-sug" hidden></div></div>';
  h += '<section class="sec"><div class="sec-h"><h2>Destaques pelos seus critérios</h2></div>';
  h += '<div class="seg" style="margin-bottom:10px">' + [['fii', 'FIIs'], ['acao', 'Ações']].map(([k, n]) => '<button type="button" data-acls="' + k + '" aria-pressed="' + (k === analiseCls) + '">' + n + '</button>').join('') + '</div>';
  h += '<button class="critbox" id="a-crit"><span>' + esc(critResumo(analiseCls) || 'Sem critérios: mostrando todos') + '</span><b>Editar</b></button>';
  h += '<p class="note">' + lista.length + ' ' + (analiseCls === 'fii' ? 'FIIs' : 'ações') + ' atendem aos critérios. É um filtro pelos números que você escolheu, não uma recomendação de compra.</p>';
  if (lista.length) {
    h += '<div class="list" style="margin-top:8px">';
    for (const [t, x] of lista.slice(0, analiseLimite)) {
      const i = ifrInfo(x.iD);
      h += '<button class="row" data-ficha="' + esc(t) + '">' + tick(x.c, t) +
        '<span class="main"><span class="t">' + esc(t) + (S.ops.some(o => o.ativo === t) ? ' <span class="chip">na carteira</span>' : '') + '</span>' +
        '<span class="s s1">' + esc(x.c === 'fii' ? (x.seg || x.n || '') : (x.n || '')) + '</span>' +
        '<span class="s s1 num">' + (x.c === 'fii' ? 'P/VP ' + (x.pvp != null ? nf2.format(x.pvp) : '—') + ' · ' : '') + 'Liq. ' + liqTxt(x.liq) + '</span></span>' +
        '<span class="r num"><span class="v">DY ' + pctA(x.dy) + '</span><span class="s">IFR <span class="' + i.cls + '">' + i.txt + '</span></span></span></button>';
    }
    h += '</div>';
    if (lista.length > analiseLimite) h += '<button class="ghost" id="a-mais" style="margin-top:10px">Mostrar mais</button>';
  }
  h += '</section><p class="note" style="margin-top:14px">Dados: preços e histórico da B3, valor patrimonial e cotistas dos FIIs no informe mensal da CVM, proventos anunciados na B3. Atualizado ' + fmtHora(AN.dados.atualizado) + '.</p>';
  view.innerHTML = h;
  // busca
  const ai = view.querySelector('#a-busca'), sg = view.querySelector('#a-sug');
  const A = AN.dados.ativos;
  const mostrar = () => {
    analiseQ = ai.value; const Q = semAcento(ai.value.trim());
    if (!Q) { sg.hidden = true; return; }
    const it = []; for (const [t, x] of Object.entries(A)) { if (semAcento(t).startsWith(Q)) it.push([t, x]); if (it.length >= 6) break; }
    if (it.length < 6) for (const [t, x] of Object.entries(A)) { if (it.length >= 6) break; if (!semAcento(t).startsWith(Q) && semAcento(x.n || '').includes(Q)) it.push([t, x]); }
    sg.innerHTML = it.map(([t, x]) => '<button type="button" class="sugi" data-ficha="' + esc(t) + '"><b>' + esc(t) + '</b><span>' + esc(x.n || '') + '</span><em>' + (x.c === 'fii' ? 'FII' : 'ação') + '</em></button>').join('');
    sg.hidden = !it.length;
  };
  ai.addEventListener('input', mostrar);
  ai.addEventListener('keydown', e => { if (e.key === 'Enter') { const t = ai.value.trim().toUpperCase(); if (A[t]) ficha(t); } });
  sg.addEventListener('mousedown', e => e.preventDefault());
}

/* Resumo em texto simples, feito por regras (sem opinião) */
function resumo(t) {
  const x = AN.dados.ativos[t]; if (!x) return [];
  const L = [], fii = x.c === 'fii', m = fii && x.seg ? (AN.med.seg[x.seg] || null) : null;
  if (fii) {
    if (x.mp >= 12) L.push(['ok', 'Pagou rendimento em todos os 12 últimos meses, em média R$ ' + nf4.format(x.pm) + ' por cota.']);
    else if (x.mp > 0) L.push(['alerta', 'Pagou em ' + x.mp + ' dos últimos 12 meses.']);
    else L.push(['alerta', 'Não pagou rendimentos nos últimos 12 meses.']);
  } else {
    if (x.mp > 0) L.push(['ok', 'Pagou proventos em ' + x.mp + (x.mp === 1 ? ' mês' : ' meses') + ' dos últimos 12.']);
    else L.push(['alerta', 'Não pagou proventos nos últimos 12 meses.']);
  }
  if (x.up && x.pm && x.mp >= 3) {
    const d = x.up / x.pm - 1;
    if (d <= -0.15) L.push(['alerta', 'O último pagamento (R$ ' + nf4.format(x.up) + ') foi ' + pctA(-d) + ' menor que a média dos 12 meses.']);
    else if (d >= 0.15) L.push(['ok', 'O último pagamento (R$ ' + nf4.format(x.up) + ') foi ' + pctA(d) + ' maior que a média dos 12 meses.']);
  }
  if (x.dy) {
    const ref = fii ? (m && m.dy) : AN.med.acaoDy, nomeRef = fii ? 'dos FIIs de ' + (x.seg || 'mesmo segmento') : 'das ações que pagam proventos';
    if (ref) L.push([x.dy >= ref ? 'ok' : 'neutro', 'DY de 12 meses de ' + pctA(x.dy) + ', ' + (x.dy >= ref ? 'acima' : 'abaixo') + ' da mediana ' + nomeRef + ' (' + pctA(ref) + ').']);
    else L.push(['neutro', 'DY de 12 meses de ' + pctA(x.dy) + '.']);
  }
  if (fii && x.pvp) {
    const d = x.pvp - 1;
    L.push([d <= -0.05 ? 'ok' : d >= 0.05 ? 'alerta' : 'neutro', d <= -0.05 ? 'Negocia ' + pctA(-d) + ' abaixo do valor patrimonial (P/VP ' + nf2.format(x.pvp) + ').' : d >= 0.05 ? 'Negocia ' + pctA(d) + ' acima do valor patrimonial (P/VP ' + nf2.format(x.pvp) + ').' : 'Negocia perto do valor patrimonial (P/VP ' + nf2.format(x.pvp) + ').']);
    if (m && m.pvp) L.push(['neutro', 'A mediana de P/VP do segmento é ' + nf2.format(m.pvp) + '.']);
  }
  if (x.liq != null) {
    if (x.liq < 300) L.push(['alerta', 'Liquidez baixa (' + liqTxt(x.liq) + ' por dia): pode ser difícil comprar ou vender sem mexer no preço.']);
    else if (x.liq >= 1000) L.push(['ok', 'Liquidez boa: ' + liqTxt(x.liq) + ' negociados por dia, em média.']);
  }
  if (fii && x.cot) L.push([x.cot >= 10000 ? 'ok' : 'neutro', nf0.format(x.cot) + ' cotistas.']);
  if (x.mn != null && x.mx > x.mn && x.p) {
    const pos = (x.p - x.mn) / (x.mx - x.mn);
    if (pos <= 0.15) L.push(['neutro', 'Está perto da mínima dos últimos 12 meses (R$ ' + nf2.format(x.mn) + ').']);
    else if (pos >= 0.85) L.push(['neutro', 'Está perto da máxima dos últimos 12 meses (R$ ' + nf2.format(x.mx) + ').']);
  }
  if (x.v12 != null) L.push(['neutro', 'Em 12 meses o preço ' + (x.v12 >= 0 ? 'subiu ' : 'caiu ') + pctA(Math.abs(x.v12)) + (x.mp ? ', sem contar os proventos.' : '.')]);
  const iD = ifrInfo(x.iD), iS = ifrInfo(x.iS);
  if (x.iD != null) L.push([iD.nome === 'neutro' ? 'neutro' : 'alerta', 'IFR diário em ' + iD.txt + ' (' + iD.nome + ')' + (x.iS != null ? '; semanal em ' + iS.txt + ' (' + iS.nome + ').' : '.')]);
  return L;
}

/* Ficha do ativo: gráfico, indicadores e resumo */
let LW = null;
function carregarGrafico() {
  if (window.LightweightCharts) return Promise.resolve(window.LightweightCharts);
  if (LW) return LW;
  LW = new Promise((ok, falha) => { const sc = document.createElement('script'); sc.src = 'src/vendor/lightweight-charts.js'; sc.onload = () => ok(window.LightweightCharts); sc.onerror = () => { LW = null; falha(new Error('grafico')); }; document.head.appendChild(sc); });
  return LW;
}
function agrupar(rows, tipo) {
  if (tipo === 'D') return rows;
  const out = []; let cur = null, key = null;
  for (const r of rows) {
    const s = String(r[0]);
    let k;
    if (tipo === 'M') k = s.slice(0, 6);
    else { const d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); k = d.toISOString().slice(0, 10); }
    if (k !== key) { if (cur) out.push(cur); key = k; cur = r.slice(); }
    else { cur[2] = Math.max(cur[2], r[2]); cur[3] = Math.min(cur[3], r[3]); cur[4] = r[4]; cur[5] += r[5]; }
  }
  if (cur) out.push(cur);
  return out;
}
function serieIFR(closes, n = 14) {
  const out = new Array(closes.length).fill(null); if (closes.length <= n) return out;
  let g = 0, p = 0;
  for (let i = 1; i <= n; i++) { const d = closes[i] - closes[i - 1]; if (d > 0) g += d; else p -= d; }
  g /= n; p /= n; out[n] = p === 0 ? 100 : 100 - 100 / (1 + g / p);
  for (let i = n + 1; i < closes.length; i++) { const d = closes[i] - closes[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; p = (p * (n - 1) + Math.max(-d, 0)) / n; out[i] = p === 0 ? 100 : 100 - 100 / (1 + g / p); }
  return out;
}
const dataLW = n => { const s = String(n); return s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6, 8); };

async function ficha(t) {
  const x = AN.dados && AN.dados.ativos[t]; if (!x) return;
  const fii = x.c === 'fii', pos = S.ops.some(o => o.ativo === t) ? posRV(x.c, t) : null;
  let h = '<div class="fhead"><div><div class="mid num">' + (x.p ? 'R$ ' + nf2.format(x.p) : '—') + '</div><span class="s muted">' + esc(x.n || '') + (fii && x.seg ? ' · ' + esc(x.seg) : '') + '</span></div>' +
    (x.v12 != null ? '<span class="pill ' + cls(x.v12) + '">' + (x.v12 >= 0 ? '+' : '−') + pctA(Math.abs(x.v12)) + ' em 12 meses</span>' : '') + '</div>';
  if (pos && pos.qtd > 0) h += '<p class="note" style="margin:6px 2px 0">Na sua carteira: ' + unid(x.c, pos.qtd) + ', preço médio ' + brl(pos.pm) + '.</p>';
  h += '<div class="chartbox"><div class="seg seg-sm" id="g-tf">' + [['D', 'Diário'], ['S', 'Semanal'], ['M', 'Mensal']].map(([k, n]) => '<button type="button" data-tf="' + k + '" aria-pressed="' + (k === 'D') + '">' + n + '</button>').join('') + '</div>' +
    '<div id="g-preco" class="chart"></div><div class="ifr-h"><span>IFR (14)</span><b id="g-ifrv"></b></div><div id="g-ifr" class="chart chart-ifr"></div><p class="note" id="g-msg" style="margin:6px 2px 0">Carregando o gráfico…</p></div>';
  const iD = ifrInfo(x.iD), iS = ifrInfo(x.iS), iM = ifrInfo(x.iM);
  h += '<div class="ifrs">' + [['Diário', iD], ['Semanal', iS], ['Mensal', iM]].map(([n, i]) => '<div class="' + i.cls + '"><span>' + n + '</span><b>' + i.txt + '</b><small>' + i.nome + '</small></div>').join('') + '</div>';
  h += '<p class="note">IFR (índice de força relativa): abaixo de 30 = sobrevendido (caiu muito e rápido); acima de 70 = sobrecomprado (subiu muito e rápido). Não diz sozinho se é hora de comprar.</p>';
  const pares = [['DY 12 meses', pctA(x.dy)], ['Pagou', (x.mp || 0) + ' de 12 meses'], ['Média mensal', x.pm ? 'R$ ' + nf4.format(x.pm) : '—'], ['Último', x.up ? 'R$ ' + nf4.format(x.up) + ' · ' + fmtDM(x.upd) : '—']];
  if (fii) pares.push(['P/VP', x.pvp != null ? nf2.format(x.pvp) : '—'], ['Valor patrimonial', x.vp ? 'R$ ' + nf2.format(x.vp) : '—'], ['Cotistas', x.cot ? nf0.format(x.cot) : '—'], ['Segmento', esc(x.seg || '—')]);
  pares.push(['Mín. 12 meses', x.mn != null ? 'R$ ' + nf2.format(x.mn) : '—'], ['Máx. 12 meses', x.mx != null ? 'R$ ' + nf2.format(x.mx) : '—'], ['Liquidez diária', liqTxt(x.liq)], ['Variação 12 meses', x.v12 != null ? pct(x.v12) : '—']);
  h += '<div style="margin-top:14px">' + kv(pares) + '</div>';
  // pagamentos dos últimos 12 meses
  const ini = iso(new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1));
  const pg = (S.mk.anuncios || []).filter(a => a.t === t && a.pag >= ini).sort((a, b) => a.pag < b.pag ? -1 : 1);
  if (pg.length) {
    const porMes = {}; pg.forEach(a => { const k = a.pag.slice(0, 7); porMes[k] = (porMes[k] || 0) + a.v; });
    const meses = []; for (let i = 11; i >= 0; i--) { const d = new Date(new Date().getFullYear(), new Date().getMonth() - i, 1); meses.push(iso(d).slice(0, 7)); }
    const max = Math.max(...meses.map(m => porMes[m] || 0), 0.0001);
    h += '<div class="ret"><h4>Proventos por ' + (fii ? 'cota' : 'ação') + ', mês a mês</h4><div class="months" aria-hidden="true">' +
      meses.map((m, i) => '<div><span class="b' + (m > S.hoje.slice(0, 7) || (porMes[m] && m === S.hoje.slice(0, 7)) ? ' cur' : '') + '" style="height:' + ((porMes[m] || 0) / max * 82) + 'px"></span><em>' + MESES[+m.slice(5) - 1] + '</em></div>').join('') + '</div></div>';
  }
  const R = resumo(t);
  h += '<div class="ret"><h4>Resumo</h4><ul class="resumo">' + R.map(([k, txt]) => '<li class="' + k + '">' + txt + '</li>').join('') + '</ul>' +
    '<p class="note" style="margin:8px 0 0">Feito automaticamente com os números acima' + (fii && x.ref ? ' (valor patrimonial de ' + fmtDate(x.ref.slice(0, 10)) + ')' : '') + '. Não é recomendação de compra ou venda.</p></div>';
  h += '<div style="margin-top:14px"><button class="primary" id="f-comprar">Lançar compra de ' + esc(t) + '</button></div>';
  openSheet(t, h, async b => {
    b.querySelector('#f-comprar').addEventListener('click', () => formulario({ cls: x.c, tipo: 'compra', ativo: t, preco: x.p ? nf2.format(x.p) : '' }));
    let rows;
    try {
      const [L, r] = await Promise.all([carregarGrafico(), fetch('dados/hist/' + t + '.json').then(r => { if (!r.ok) throw new Error('hist'); return r.json(); })]);
      rows = r;
      if (!root.querySelector('#g-preco')) return;
      desenharGrafico(L, rows, 'D');
      b.querySelectorAll('[data-tf]').forEach(btn => btn.addEventListener('click', () => {
        b.querySelectorAll('[data-tf]').forEach(o => o.setAttribute('aria-pressed', o === btn)); desenharGrafico(L, rows, btn.dataset.tf);
      }));
      b.querySelector('#g-msg').textContent = 'Arraste para os lados e use dois dedos para aproximar. Toque num candle para ver os valores.';
    } catch (e) { const m = b.querySelector('#g-msg'); if (m) m.textContent = 'Não deu para carregar o gráfico deste ativo.'; }
  });
}
let graficos = [];
function desenharGrafico(L, rowsD, tf) {
  graficos.forEach(g => { try { g.remove(); } catch (e) { /* ignora */ } }); graficos = [];
  const elP = root.querySelector('#g-preco'), elI = root.querySelector('#g-ifr'); if (!elP) return;
  const cs = getComputedStyle(document.documentElement), v = n => cs.getPropertyValue(n).trim();
  const base = w => ({ width: w, layout: { background: { type: 'solid', color: v('--surface') }, textColor: v('--muted'), fontFamily: 'Figtree, system-ui, sans-serif', fontSize: 11 },
    grid: { vertLines: { color: v('--line') }, horzLines: { color: v('--line') } }, rightPriceScale: { borderColor: v('--line') },
    timeScale: { borderColor: v('--line'), rightOffset: 3 }, crosshair: { mode: 1 }, localization: { locale: 'pt-BR', priceFormatter: p => nf2.format(p) },
    handleScroll: { vertTouchDrag: false } });
  const rows = agrupar(rowsD, tf);
  const w = elP.clientWidth;
  const cP = L.createChart(elP, Object.assign(base(w), { height: 240 }));
  const s = cP.addCandlestickSeries({ upColor: v('--pos'), downColor: v('--neg'), borderVisible: false, wickUpColor: v('--pos'), wickDownColor: v('--neg') });
  s.setData(rows.map(r => ({ time: dataLW(r[0]), open: r[1] / 100, high: r[2] / 100, low: r[3] / 100, close: r[4] / 100 })));
  const cI = L.createChart(elI, Object.assign(base(w), { height: 110, timeScale: { visible: false, borderColor: v('--line'), rightOffset: 3 } }));
  const si = cI.addLineSeries({ color: v('--accent'), lineWidth: 2, priceLineVisible: false, lastValueVisible: true });
  const ifrs = serieIFR(rows.map(r => r[4] / 100));
  si.setData(rows.map((r, i) => ifrs[i] == null ? { time: dataLW(r[0]) } : { time: dataLW(r[0]), value: +ifrs[i].toFixed(1) }));
  si.createPriceLine({ price: 70, color: v('--neg'), lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
  si.createPriceLine({ price: 30, color: v('--pos'), lineWidth: 1, lineStyle: 2, axisLabelVisible: false });
  cI.priceScale('right').applyOptions({ autoScale: false, scaleMargins: { top: 0.05, bottom: 0.05 } });
  si.applyOptions({ autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) });
  const ult = ifrs.filter(x => x != null).at(-1), inf = ifrInfo(ult);
  const lab = root.querySelector('#g-ifrv'); if (lab) { lab.textContent = ult == null ? '—' : inf.txt + ' · ' + inf.nome; lab.className = inf.cls; }
  // mostra o período mais útil de cada tempo e mantém os dois gráficos alinhados
  const n = rows.length, vis = { D: 130, S: 104, M: 60 }[tf];
  cP.timeScale().setVisibleLogicalRange({ from: Math.max(0, n - vis), to: n + 2 });
  let sinc = false;
  cP.timeScale().subscribeVisibleLogicalRangeChange(r => { if (sinc || !r) return; sinc = true; cI.timeScale().setVisibleLogicalRange(r); sinc = false; });
  cI.timeScale().subscribeVisibleLogicalRangeChange(r => { if (sinc || !r) return; sinc = true; cP.timeScale().setVisibleLogicalRange(r); sinc = false; });
  cI.timeScale().setVisibleLogicalRange(cP.timeScale().getVisibleLogicalRange());
  graficos = [cP, cI];
}

/* Critérios dos destaques (ficam salvos na sua conta) */
function criterios() {
  const c = analiseCls, k = critDe(c);
  const campo = (id, lab, val, ph, extra) => '<div class="field"><label for="c-' + id + '">' + lab + '</label><input id="c-' + id + '" inputmode="decimal" placeholder="' + ph + '" value="' + esc(val || '') + '">' + (extra || '') + '</div>';
  const segs = c === 'fii' ? Object.keys((AN.med || {}).seg || {}).sort() : [];
  let h = '<div class="form">';
  if (c === 'fii') h += '<div class="two">' + campo('pvpMax', 'P/VP máximo', k.pvpMax, 'sem limite') + campo('dyMin', 'DY 12 meses mínimo (%)', k.dyMin, 'sem limite') + '</div>' +
    '<div class="two">' + campo('mesesMin', 'Meses pagos (de 12)', k.mesesMin, 'sem limite') + campo('cotMin', 'Cotistas mínimo', k.cotMin, 'sem limite') + '</div>';
  else h += '<div class="two">' + campo('dyMin', 'DY 12 meses mínimo (%)', k.dyMin, 'sem limite') + campo('mesesMin', 'Meses com proventos (de 12)', k.mesesMin, 'sem limite') + '</div>';
  h += '<div class="two">' + campo('liqMin', 'Liquidez mínima (R$ mi/dia)', k.liqMin, 'sem limite') + campo('ifrMax', 'IFR diário máximo', k.ifrMax, 'sem limite') + '</div>';
  if (c === 'fii') h += '<div class="field"><label for="c-seg">Segmento</label><select id="c-seg"><option value="">Todos</option>' + segs.map(sg => '<option' + (sg === k.seg ? ' selected' : '') + '>' + esc(sg) + '</option>').join('') + '</select></div>';
  h += '<div class="field"><label for="c-ordem">Ordenar por</label><select id="c-ordem">' + [['dy', 'Maior DY'], ['pvp', 'Menor P/VP'], ['ifr', 'Menor IFR diário'], ['liq', 'Maior liquidez']].filter(([o]) => c === 'fii' || o !== 'pvp').map(([o, n]) => '<option value="' + o + '"' + (o === k.ordem ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div>';
  h += '<p class="note" style="margin:-4px 2px 0">Deixe em branco o que não quiser usar. Ex.: IFR diário máximo 35 mostra só os que caíram bastante nos últimos dias.</p>';
  h += '<button class="primary" id="c-salvar">Aplicar critérios</button><button class="ghost" id="c-padrao" type="button">Voltar ao padrão</button></div>';
  openSheet('Critérios · ' + (c === 'fii' ? 'FIIs' : 'Ações'), h, b => {
    const salvarCrit = async novo => {
      const todos = Object.assign({}, app.settings.criterios || {}, { [c]: novo });
      app.settings.criterios = todos; analiseLimite = 30;
      try { await Promise.race([store.ajustes({ criterios: todos }), new Promise(r => setTimeout(r, 1200))]); } catch (e) { /* fica no aparelho até sincronizar */ }
      closeSheet(); render();
    };
    b.querySelector('#c-salvar').addEventListener('click', () => {
      const novo = {}; b.querySelectorAll('input[id^="c-"], select[id^="c-"]').forEach(el => { novo[el.id.slice(2)] = el.value.trim(); });
      salvarCrit(novo);
    });
    b.querySelector('#c-padrao').addEventListener('click', () => salvarCrit(Object.assign({}, CRIT_PADRAO[c])));
  });
}

window.__carteira = { S, carteira, posCDB, posRV, aReceber, retorno, dy12, yoc, relatorioIR, resumo: t => resumo(t) };
