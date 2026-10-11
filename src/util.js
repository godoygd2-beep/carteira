/* Utilidades: datas, números e textos. */

export const z = n => String(n).padStart(2, '0');
export const iso = d => d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const today = () => iso(new Date());
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
export const isBiz = d => d.getDay() !== 0 && d.getDay() !== 6;
export function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
export function lastBiz(s) { const d = parse(s); while (!isBiz(d)) d.setDate(d.getDate() - 1); return iso(d); }
export const fmtDate = s => { const d = parse(s); return z(d.getDate()) + '/' + z(d.getMonth() + 1) + '/' + d.getFullYear(); };
export const fmtDM = s => { const d = parse(s); return z(d.getDate()) + '/' + z(d.getMonth() + 1); };
export const monthKey = s => s.slice(0, 7);
export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const monthName = k => { const [y, m] = k.split('-'); return MESES[+m - 1] + ' ' + y; };
export function anoAtras(s) { const d = parse(s); d.setFullYear(d.getFullYear() - 1); return iso(d); }
export function fmtHora(isoTs) {
  if (!isoTs) return '—';
  const d = new Date(isoTs); if (isNaN(d)) return '—';
  const hoje = today(), dia = iso(d);
  const h = z(d.getHours()) + 'h' + z(d.getMinutes());
  if (dia === hoje) return 'hoje, ' + h;
  if (dia === addDays(hoje, -1)) return 'ontem, ' + h;
  return fmtDate(dia) + ', ' + h;
}

export const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
export const nf4 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
export const nfq = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 8 });
export const r2 = v => Math.round(v * 100) / 100;
export function num(s) {
  s = String(s ?? '').trim();
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return parseFloat(s);
}
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const semAcento = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

export function storeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
export function storeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } }
export function storeDel(k) { try { localStorage.removeItem(k); } catch (e) { /* sem armazenamento */ } }
