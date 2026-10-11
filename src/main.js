/* Começo do app: escolhe onde ficam os dados, carrega o mercado e liga a atualização automática. */
import { FIREBASE } from './config.js';
import { createFirebaseStore, createDemoStore } from './store.js';
import { carregarMercado, carregarLista, criptoAoVivo, mercadoExemplo } from './mercado.js';
import { iniciarUI, setStoreState, setMercado, setLista, mostrarBanner } from './ui.js';
import { S, ativosOf } from './calc.js';

export const VERSAO = '1.0.0';

const demo = location.hash === '#demo' || !FIREBASE.apiKey;
const store = demo ? createDemoStore() : createFirebaseStore(FIREBASE);
const root = document.getElementById('root');
iniciarUI(root, store, { versao: VERSAO });

let mk = null;
async function mercado() {
  if (demo) { mk = mercadoExemplo(); setMercado(mk); return; }
  mk = await carregarMercado(m => { mk = m; setMercado(m); });
  await cripto();
}
async function cripto() {
  if (demo || !mk) return;
  const simbolos = ativosOf('cripto');
  if (!simbolos.length) return;
  if (await criptoAoVivo(simbolos, mk)) setMercado(mk);
}

let primeiraVez = true;
store.init(s => {
  setStoreState(s);
  if (s.fase === 'pronto' && primeiraVez && !demo) { primeiraVez = false; cripto(); }
});
mercado();
carregarLista().then(setLista);

/* Ao voltar para o app: atualiza mercado e cripto (no máximo a cada 2 minutos) */
let ultima = Date.now();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || Date.now() - ultima < 120000) return;
  ultima = Date.now(); mercado();
});

/* Modo offline e aviso de versão nova */
if ('serviceWorker' in navigator && !demo && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').then(reg => {
    const avisar = w => mostrarBanner('<span>Tem uma versão nova do app.</span><button>Atualizar</button>', () => { w.postMessage('skip-waiting'); });
    if (reg.waiting && navigator.serviceWorker.controller) avisar(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) avisar(w); });
    });
    setInterval(() => reg.update().catch(() => {}), 30 * 60000);
  }).catch(() => {});
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!recarregou) { recarregou = true; location.reload(); } });
}
window.__S = S;
