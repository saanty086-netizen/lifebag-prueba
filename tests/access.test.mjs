import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdmin, hasAccess, canEdit, escapeHtml, normalizePhone } from '../access.js';

test('solo los correos de dueños verificados tienen acceso de administrador', () => {
  assert.equal(isAdmin({ email: 'saanty086@gmail.com', emailVerified: true }), true);
  assert.equal(isAdmin({ email: 'saanty086@gmail.com', emailVerified: false }), false);
  assert.equal(isAdmin({ email: 'otro@gmail.com', emailVerified: true }), false);
  assert.equal(isAdmin(null), false);
});
test('estar autenticado no alcanza para entrar ni editar', () => {
  const user = { email: 'equipo@example.com' };
  assert.equal(hasAccess(user, { estado: 'pendiente' }), false);
  assert.equal(hasAccess(user, null), false);
  assert.equal(hasAccess(user, { estado: 'aprobado' }), true);
  assert.equal(canEdit(user, { estado: 'aprobado' }, 'produccion'), false);
  assert.equal(canEdit(user, { estado: 'pendiente', permisos: { produccion: true } }, 'produccion'), false);
  assert.equal(canEdit(user, { estado: 'aprobado', permisos: { produccion: true } }, 'produccion'), true);
  assert.equal(canEdit(user, { estado: 'aprobado', permisos: { produccion: true } }, 'finanzas'), false);
});
test('escapa contenido y atributos enviados por terceros', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">\'&'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&#39;&amp;');
  assert.equal(escapeHtml(null), '');
});
test('normaliza teléfonos argentinos de reservas para WhatsApp', () => {
  assert.equal(normalizePhone('263 428 7145'), '5492634287145');
  assert.equal(normalizePhone('+54 263 428 7145'), '5492634287145');
  assert.equal(normalizePhone('0054 9 263 428 7145'), '5492634287145');
  assert.equal(normalizePhone('+56 9 1234 5678'), '56912345678');
});
