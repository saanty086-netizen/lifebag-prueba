import { before, after, beforeEach, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
let environment;
const ownerClaims = { email: 'saanty086@gmail.com', email_verified: true };
const reservation = () => ({ nombre: 'Ana', telefono: '2635551234', distrito: 'Giagnoni', cantidadKits: 1, estado: 'espera', fecha: serverTimestamp() });
before(async () => {
  environment = await initializeTestEnvironment({ projectId: 'demo-lifebag', firestore: { host: '127.0.0.1', port: 8189, rules: await readFile('firestore.rules', 'utf8') } });
});
after(async () => { await environment?.cleanup(); });
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, 'usuarios/viewer'), { email: 'viewer@example.com', estado: 'aprobado', permisos: {} }),
      setDoc(doc(db, 'usuarios/producer'), { email: 'producer@example.com', estado: 'aprobado', permisos: { produccion: true } }),
      setDoc(doc(db, 'usuarios/pending'), { email: 'pending@example.com', estado: 'pendiente', permisos: { produccion: true } }),
      setDoc(doc(db, 'usuarios/orders'), { email: 'orders@example.com', estado: 'aprobado', permisos: { pedidos: true } }),
      setDoc(doc(db, 'produccion/contadores'), { bolsas: 3, mantas: 2, kitsVendidos: 0 }),
      setDoc(doc(db, 'configuracion/valores'), { precioVentaLifeBag: 45000 }),
      setDoc(doc(db, 'pedidos_lifebag/delivered'), { ...reservation(), ventaRegistrada: true }),
      setDoc(doc(db, 'pedidos_lifebag/waiting'), reservation())
    ]);
  });
});
test('visitante crea una reserva válida pero no puede listar datos personales', async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertSucceeds(setDoc(doc(db, 'pedidos_lifebag/valid'), reservation()));
  await assertFails(getDocs(collection(db, 'pedidos_lifebag')));
  await assertFails(getDoc(doc(db, 'pedidos_lifebag/valid')));
});
test('visitante no puede inyectar ventas ni cantidades inválidas', async () => {
  const db = environment.unauthenticatedContext().firestore();
  for (const extra of [{ estado: 'entregado' }, { ventaRegistrada: true }, { cantidadKits: -1 }, { cantidadKits: 1.5 }, { cantidadKits: 6 }, { nombre: '' }]) {
    await assertFails(setDoc(doc(db, 'pedidos_lifebag/invalid'), { ...reservation(), ...extra }));
  }
});
test('un usuario nuevo solo puede crear su perfil pendiente, sin autoaprobarse', async () => {
  const db = environment.authenticatedContext('new', { email: 'new@example.com' }).firestore();
  const profile = { email: 'new@example.com', estado: 'pendiente', rol: 'usuario', creadoEn: serverTimestamp() };
  await assertFails(setDoc(doc(db, 'usuarios/new'), { ...profile, estado: 'aprobado' }));
  await assertFails(setDoc(doc(db, 'usuarios/new'), { ...profile, permisos: { produccion: true } }));
  await assertSucceeds(setDoc(doc(db, 'usuarios/new'), profile));
  await assertFails(updateDoc(doc(db, 'usuarios/new'), { estado: 'aprobado' }));
});
test('cuenta pendiente no accede a producción aunque tenga un permiso guardado', async () => {
  const db = environment.authenticatedContext('pending').firestore();
  await assertFails(getDoc(doc(db, 'produccion/contadores')));
  await assertFails(updateDoc(doc(db, 'produccion/contadores'), { mantas: 20 }));
});
test('aprobados consultan pero solo escriben sus áreas habilitadas', async () => {
  const viewer = environment.authenticatedContext('viewer').firestore();
  await assertSucceeds(getDoc(doc(viewer, 'produccion/contadores')));
  await assertFails(updateDoc(doc(viewer, 'produccion/contadores'), { mantas: 20 }));
  const producer = environment.authenticatedContext('producer').firestore();
  await assertSucceeds(updateDoc(doc(producer, 'produccion/contadores'), { mantas: 20 }));
  await assertFails(updateDoc(doc(producer, 'configuracion/valores'), { precioVentaLifeBag: 1 }));
});
test('pedidos puede sincronizar contadores de venta sin cambiar mantas', async () => {
  const db = environment.authenticatedContext('orders').firestore();
  await assertSucceeds(updateDoc(doc(db, 'produccion/contadores'), { bolsas: 2, kitsVendidos: 1 }));
  await assertFails(updateDoc(doc(db, 'produccion/contadores'), { mantas: 20 }));
  await assertFails(deleteDoc(doc(db, 'pedidos_lifebag/delivered')));
  await assertSucceeds(deleteDoc(doc(db, 'pedidos_lifebag/waiting')));
});
test('solo un administrador con correo verificado puede gestionar el equipo', async () => {
  const impostor = environment.authenticatedContext('unverified', { ...ownerClaims, email_verified: false }).firestore();
  await assertFails(updateDoc(doc(impostor, 'usuarios/pending'), { estado: 'aprobado' }));
  const admin = environment.authenticatedContext('owner', ownerClaims).firestore();
  await assertSucceeds(getDocs(collection(admin, 'usuarios')));
  await assertSucceeds(updateDoc(doc(admin, 'usuarios/pending'), { estado: 'aprobado' }));
  await assertSucceeds(updateDoc(doc(admin, 'configuracion/valores'), { precioVentaLifeBag: 50000 }));
});
