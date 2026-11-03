import { test as base, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
export { expect };
export const defaults = {
  'configuracion/valores': { precioVentaLifeBag: 45000, costoLana: 100, costoCuadrito: 50, cuadritosPorManta: 16, lanaPorManta: 2 },
  'produccion/contadores': { bolsas: 3, kitsVendidos: 0, mantas: 2, cuadraditos: 32, lanaDisponible: 4 },
  'inventario_productos/agua': { nombre: 'Agua', stockActual: 10, cantidadPorKit: 2, costoUnitario: 500, activo: true, esKit: true, orden: 1 },
  'pedidos_lifebag/pedido1': { nombre: 'Ana', telefono: '2635551234', distrito: 'Giagnoni', cantidadKits: 1, estado: 'espera' }
};
const authModule = `
export const GoogleAuthProvider = class {};
export const EmailAuthProvider = { credential: () => ({}) };
const listeners = [];
export const auth = { currentUser: window.__user ?? JSON.parse(sessionStorage.getItem('test-auth') || 'null') };
export function getAuth() { return auth; }
export function onAuthStateChanged(a, callback) { listeners.push(callback); queueMicrotask(() => callback(a.currentUser)); return () => {}; }
export async function signOut(a) { if (!a.currentUser) return; a.currentUser = null; sessionStorage.removeItem('test-auth'); listeners.forEach(cb => queueMicrotask(() => cb(null))); }
function login() { auth.currentUser = window.__loginUser || { uid: 'owner', email: 'saanty086@gmail.com', emailVerified: true, providerData: [] }; sessionStorage.setItem('test-auth', JSON.stringify(auth.currentUser)); listeners.forEach(cb => queueMicrotask(() => cb(auth.currentUser))); return { user: auth.currentUser }; }
export async function signInWithEmailAndPassword() { return login(); }
export async function signInWithPopup() { return login(); }
export async function createUserWithEmailAndPassword() { if (window.__createdAuth) { const error = new Error('Already exists'); error.code = 'auth/email-already-in-use'; throw error; } window.__createdAuth = true; return login(); }
export async function linkWithCredential(user) { window.__links = (window.__links || 0) + 1; user.providerData.push({ providerId: 'password' }); }
export async function deleteUser() { await signOut(auth); }
`;
const firestoreModule = `
export function getFirestore() { return {}; }
const state = window.__db = window.__seed || {};
const listeners = [];
let counter = 0;
export function doc(db, col, id) { const path = db.path ? db.path + '/' + (col || 'new-' + ++counter) : col + '/' + id; return { path, id: path.split('/').at(-1) }; }
export function collection(db, name) { return { path: name, collection: true }; }
export function query(ref, ...constraints) { return { ...ref, constraints }; }
export function where(field, op, value) { return { field, value }; }
export function orderBy() { return {}; }
export function serverTimestamp() { return Date.now(); }
export function increment(value) { return { increment: value }; }
const snapshot = path => ({ id: path.split('/').at(-1), exists: () => path in state, data: () => structuredClone(state[path]) });
function result(ref) {
  if (!ref.collection) return snapshot(ref.path);
  const docs = Object.keys(state).filter(path => path.startsWith(ref.path + '/') && (ref.constraints || []).every(c => !c.field || state[path][c.field] === c.value)).map(snapshot);
  return { docs, empty: !docs.length, forEach: callback => docs.forEach(callback) };
}
function emit() { for (const listener of listeners) queueMicrotask(() => listener.active && listener.callback(result(listener.ref))); }
export async function getDoc(ref) { return snapshot(ref.path); }
export async function getDocs(ref) { return result(ref); }
export function onSnapshot(ref, callback) { const listener = { ref, callback, active: true }; listeners.push(listener); queueMicrotask(() => listener.active && callback(result(ref))); return () => { listener.active = false; }; }
function write(ref, data, merge) {
  const value = merge ? { ...state[ref.path] } : {};
  for (const [key, input] of Object.entries(data)) {
    if (key.includes('.')) { const [first, second] = key.split('.'); value[first] = { ...value[first], [second]: input }; }
    else value[key] = input && typeof input === 'object' && 'increment' in input ? (Number(value[key]) || 0) + input.increment : input;
  }
  state[ref.path] = value;
}
function check() { if (window.__failWrites) throw new Error('Simulated offline'); }
export async function setDoc(ref, data, options) { check(); write(ref, data, options?.merge); emit(); }
export async function updateDoc(ref, data) { check(); if (!(ref.path in state)) throw new Error('Missing document'); write(ref, data, true); emit(); }
export async function addDoc(ref, data) { const target = doc(ref); await setDoc(target, data); return target; }
export async function deleteDoc(ref) { check(); delete state[ref.path]; emit(); }
export async function runTransaction(db, callback) {
  check(); const operations = []; let writing = false;
  await callback({
    get: async ref => { if (writing) throw new Error('Read after write'); return snapshot(ref.path); },
    update: (ref, data) => { writing = true; if (!(ref.path in state)) throw new Error('Missing document'); operations.push(() => write(ref, data, true)); },
    set: (ref, data, options) => { writing = true; operations.push(() => write(ref, data, options?.merge)); },
    delete: ref => { writing = true; operations.push(() => delete state[ref.path]); }
  });
  operations.forEach(op => op()); emit();
}
`;
export const test = base.extend({
  setup: async ({ page }, use) => {
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'www.gstatic.com') {
        const source = url.pathname.endsWith('firebase-auth.js') ? authModule : url.pathname.endsWith('firebase-firestore.js') ? firestoreModule : 'export function initializeApp() { return {}; }';
        return route.fulfill({ contentType: 'application/javascript', body: source, headers: { 'access-control-allow-origin': '*' } });
      }
      if (url.hostname !== 'lifebag.test') return route.abort();
      const path = resolve('.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!path.startsWith(resolve('.') + '/')) return route.abort();
      try {
        const body = await readFile(path);
        const type = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf' }[extname(path)];
        return route.fulfill({ body, contentType: type || 'text/plain' });
      } catch { return route.fulfill({ status: 404, body: 'Not found' }); }
    });
    await use(async ({ user = null, data = defaults, storage } = {}) => {
      await page.addInitScript(({ user, data, storage }) => {
        window.__user = user;
        window.__seed = data;
        if (storage !== undefined) localStorage.setItem('lifebag-checklist-v2', storage);
      }, { user, data, storage });
    });
  }
});
export const owner = { uid: 'owner', email: 'saanty086@gmail.com', emailVerified: true, providerData: [] };
