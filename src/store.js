/* Onde ficam os seus lançamentos.
   - Firebase: login com a conta Google; cada pessoa só lê e grava users/{seu uid} (ver firestore.rules).
     O Firestore guarda uma cópia no aparelho: abre sem internet e envia quando a conexão voltar.
   - Demonstração (sem Firebase configurado, ou com #demo no endereço): dados de exemplo, só neste aparelho. */
import { storeGet, storeSet, storeDel, uid as novoId } from './util.js';
import { linkedOp } from './calc.js';

export const FIREBASE_VERSION = '12.19.0';
const BASE = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/';
export const FIREBASE_URLS = ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map(f => BASE + f);

const limpo = o => JSON.parse(JSON.stringify(o));

export function createFirebaseStore(cfg) {
  let F = null, A = null, auth = null, db = null, user = null, unsubs = [];
  let ops = [], settings = {}, prontoOps = false, prontoSet = false, cb = () => {};
  const emit = extra => cb(Object.assign({ fase: user ? (prontoOps ? 'pronto' : 'carregando') : 'login', user: user && { email: user.email, nome: user.displayName, uid: user.uid }, ops, settings }, extra || {}));

  async function load() {
    if (F) return;
    const [app, au, fs] = await Promise.all(FIREBASE_URLS.map(u => import(u)));
    A = au; F = fs;
    const fb = app.initializeApp(cfg);
    auth = au.getAuth(fb);
    try { db = fs.initializeFirestore(fb, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentSingleTabManager() }) }); }
    catch (e) { db = fs.getFirestore(fb); }
  }
  function parar() { unsubs.forEach(u => { try { u(); } catch (e) { /* ignora */ } }); unsubs = []; }
  function ouvir() {
    parar(); prontoOps = false; prontoSet = false; ops = []; settings = {};
    const base = 'users/' + user.uid;
    unsubs.push(F.onSnapshot(F.collection(db, base + '/ops'), { includeMetadataChanges: true }, snap => {
      ops = snap.docs.map(d => Object.assign({}, d.data(), { id: d.id }));
      prontoOps = true; emit({ pendente: snap.metadata.hasPendingWrites, doCache: snap.metadata.fromCache });
    }, e => emit({ erro: e.code || 'erro' })));
    unsubs.push(F.onSnapshot(F.doc(db, base), snap => { settings = snap.exists() ? snap.data() : {}; prontoSet = true; emit(); }, () => {}));
  }

  return {
    modo: 'firebase',
    async init(onState) {
      cb = onState;
      try { await load(); } catch (e) { cb({ fase: 'erro', erro: 'sem-firebase' }); return; }
      try { await A.getRedirectResult(auth); } catch (e) { /* ignora */ }
      A.onAuthStateChanged(auth, u => { user = u; if (u) ouvir(); else { parar(); ops = []; } emit(); });
    },
    async entrar() {
      await load();
      const p = new A.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
      try { await A.signInWithPopup(auth, p); }
      catch (e) {
        if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) return A.signInWithRedirect(auth, p);
        if (e.code === 'auth/popup-closed-by-user') return;
        throw e;
      }
    },
    async sair() { parar(); await A.signOut(auth); },
    async salvar(lista) {
      const b = F.writeBatch(db);
      lista.forEach(o => b.set(F.doc(db, 'users/' + user.uid + '/ops/' + o.id), limpo(o)));
      return b.commit();
    },
    async excluir(ids) {
      const b = F.writeBatch(db);
      ids.forEach(id => b.delete(F.doc(db, 'users/' + user.uid + '/ops/' + id)));
      return b.commit();
    },
    async atualizar(id, patch) { return F.updateDoc(F.doc(db, 'users/' + user.uid + '/ops/' + id), limpo(patch)); },
    async excluirCampo(id, campos) { const p = {}; campos.forEach(c => { p[c] = F.deleteField(); }); return F.updateDoc(F.doc(db, 'users/' + user.uid + '/ops/' + id), p); },
    async ajustes(patch) { return F.setDoc(F.doc(db, 'users/' + user.uid), limpo(patch), { merge: true }); }
  };
}

/* ---------- Demonstração: tudo no aparelho ---------- */
const DEMO_KEY = 'mc-demo';
export function createDemoStore() {
  let st = null, cb = () => {};
  const load = () => { try { st = JSON.parse(storeGet(DEMO_KEY) || 'null'); } catch (e) { st = null; } if (!st || !Array.isArray(st.ops)) st = { ops: exemplo(), settings: {} }; };
  const save = () => storeSet(DEMO_KEY, JSON.stringify(st));
  const emit = () => cb({ fase: 'pronto', user: { email: 'demonstração', nome: 'Demonstração', uid: 'demo' }, ops: st.ops.slice(), settings: Object.assign({}, st.settings), demo: true });
  return {
    modo: 'demo',
    async init(onState) { cb = onState; load(); save(); emit(); },
    async entrar() {},
    async sair() { storeDel(DEMO_KEY); load(); save(); emit(); },
    async salvar(lista) { lista.forEach(o => { const i = st.ops.findIndex(x => x.id === o.id); if (i >= 0) st.ops[i] = limpo(o); else st.ops.push(limpo(o)); }); save(); emit(); },
    async excluir(ids) { st.ops = st.ops.filter(o => !ids.includes(o.id)); save(); emit(); },
    async atualizar(id, patch) { const o = st.ops.find(x => x.id === id); if (o) Object.assign(o, limpo(patch)); save(); emit(); },
    async excluirCampo(id, campos) { const o = st.ops.find(x => x.id === id); if (o) campos.forEach(c => delete o[c]); save(); emit(); },
    async ajustes(patch) { Object.assign(st.settings, limpo(patch)); save(); emit(); }
  };
}

/* Lançamentos de exemplo (os mesmos do protótipo) */
export function exemplo() {
  const ops = [];
  const add = o => { const x = Object.assign({ id: novoId(), taxas: 0 }, o); ops.push(x); return x; };
  const liga = (o, fonte) => { const l = add(linkedOp(o, fonte, 'CDB Inter', 100)); o.link = l.id; o.fonte = fonte; };
  add({ cls: 'acao', tipo: 'compra', ativo: 'ITSA4', data: '2025-02-12', qtd: 100, preco: 9.80, taxas: 0.30 });
  add({ cls: 'acao', tipo: 'compra', ativo: 'ITSA4', data: '2025-08-05', qtd: 100, preco: 10.60, taxas: 0.32 });
  add({ cls: 'acao', tipo: 'compra', ativo: 'BBAS3', data: '2025-05-20', qtd: 100, preco: 26.40, taxas: 0.79 });
  add({ cls: 'fii', tipo: 'compra', ativo: 'MXRF11', data: '2025-03-03', qtd: 500, preco: 9.85, taxas: 1.48 });
  add({ cls: 'fii', tipo: 'compra', ativo: 'HGLG11', data: '2025-06-10', qtd: 20, preco: 158.00, taxas: 0.95 });
  add({ cls: 'fii', tipo: 'compra', ativo: 'KNCR11', data: '2025-10-01', qtd: 30, preco: 99.80, taxas: 0.90 });
  add({ cls: 'tesouro', tipo: 'compra', ativo: 'Tesouro Selic 2031', data: '2025-04-08', qtd: 0.4, preco: 16150.00 });
  add({ cls: 'tesouro', tipo: 'compra', ativo: 'Tesouro IPCA+ 2035', data: '2025-09-15', qtd: 2, preco: 2050.00 });
  add({ cls: 'cdb', tipo: 'aporte', ativo: 'CDB Inter', data: '2025-03-10', valor: 10000, pct: 100 });
  add({ cls: 'cdb', tipo: 'aporte', ativo: 'CDB Inter', data: '2025-11-03', valor: 3000, pct: 100 });
  add({ cls: 'cripto', tipo: 'compra', ativo: 'BTC', data: '2025-07-01', qtd: 0.012, preco: 107500, taxas: 1.29, dolar: 5.46 });
  liga(add({ cls: 'acao', tipo: 'compra', ativo: 'WEGE3', data: '2026-01-15', qtd: 30, preco: 38.50, taxas: 0.35 }), 'cdb');
  liga(add({ cls: 'cripto', tipo: 'compra', ativo: 'USDT', data: '2026-01-20', qtd: 1200, preco: 1, taxas: 0, dolar: 5.36 }), 'cdb');
  liga(add({ cls: 'cripto', tipo: 'compra', ativo: 'ETH', data: '2026-02-10', qtd: 0.3, preco: 3150, taxas: 0.95, dolar: 5.30 }), 'usdt');
  add({ cls: 'cdb', tipo: 'resgate', ativo: 'CDB Inter', data: '2026-07-15', valor: 800 });
  liga(add({ cls: 'acao', tipo: 'venda', ativo: 'WEGE3', data: '2026-08-20', qtd: 10, preco: 43.10, taxas: 0.13 }), 'cdb');
  add({ cls: 'cdb', tipo: 'aporte', ativo: 'CDB Inter', data: '2026-09-28', valor: 1000, pct: 100 });
  let t = 1; ops.forEach(o => { o.ts = t++; });
  return ops;
}
