import { test, expect, defaults, owner } from './fixture.js';
async function openAdmin(page, setup, options = {}) {
  await setup({ user: owner, ...options });
  await page.goto('http://lifebag.test/admin.html');
  await expect(page.locator('#app')).toBeVisible();
  await expect(page.locator('#count-bolsas')).toHaveText(String((options.data || defaults)['produccion/contadores']?.bolsas ?? 0));
}
test('no permite entrar al panel a una cuenta pendiente', async ({ page, setup }) => {
  await setup({ user: { uid: 'pending', email: 'pending@example.com' }, data: { ...defaults, 'usuarios/pending': { estado: 'pendiente' } } });
  await page.goto('http://lifebag.test/admin.html');
  await expect(page).toHaveURL(/login.html$/);
});
test('usuario aprobado sin permisos solo consulta y no escribe al cargar', async ({ page, setup }) => {
  const data = { ...defaults, 'usuarios/viewer': { estado: 'aprobado', permisos: {} } };
  await openAdmin(page, setup, { user: { uid: 'viewer', email: 'viewer@example.com' }, data });
  await expect(page.locator('#input-mantas')).toBeDisabled();
  await expect(page.locator('#invAddBtn')).toBeDisabled();
  await page.getByRole('button', { name: 'Lista de espera' }).click();
  await expect(page.locator('#searchInput')).toBeEnabled();
  await expect(page.locator('.status-select')).toBeDisabled();
  expect(await page.evaluate(() => window.__db)).toEqual(data);
});
test('el armado descuenta mantas e insumos en una única transacción', async ({ page, setup }) => {
  await openAdmin(page, setup);
  await page.locator('#armarKitsBtn').click();
  await expect(page.locator('#armarKitsCantidad')).toHaveAttribute('max', '2');
  await page.locator('#armarKitsCantidad').fill('2');
  await page.locator('#armarKitsSave').click();
  await expect(page.locator('#armarKitsModal')).not.toHaveClass(/show/);
  expect(await page.evaluate(() => window.__db['produccion/contadores'])).toMatchObject({ mantas: 0, bolsas: 5 });
  expect(await page.evaluate(() => window.__db['inventario_productos/agua'].stockActual)).toBe(6);
});
test('no arma kits si las mantas se agotan desde otro dispositivo', async ({ page, setup }) => {
  await openAdmin(page, setup);
  await page.locator('#armarKitsBtn').click();
  await page.locator('#armarKitsCantidad').fill('2');
  await page.evaluate(() => { window.__db['produccion/contadores'].mantas = 0; });
  await page.locator('#armarKitsSave').click();
  await expect(page.locator('#armarKitsError')).toContainText('mantas terminadas');
  expect(await page.evaluate(() => window.__db['inventario_productos/agua'].stockActual)).toBe(10);
  expect(await page.evaluate(() => window.__db['produccion/contadores'].bolsas)).toBe(3);
});
test('stock manual nunca baja de cero', async ({ page, setup }) => {
  await openAdmin(page, setup, { data: { ...defaults, 'produccion/contadores': { ...defaults['produccion/contadores'], bolsas: 0 } } });
  let message;
  page.on('dialog', async dialog => { message = dialog.message(); await dialog.accept(); });
  await page.locator('.prod-btn.minus').click();
  await expect.poll(() => message).toContain('negativo');
  expect(await page.evaluate(() => window.__db['produccion/contadores'].bolsas)).toBe(0);
});
test('entregar registra la venta una vez y cancelar restituye el stock', async ({ page, setup }) => {
  await openAdmin(page, setup);
  await page.locator('[data-tab=pedidos]').click();
  await page.locator('.status-select').selectOption('entregado');
  await expect(page.locator('.sync-ok')).toBeVisible();
  expect(await page.evaluate(() => window.__db['produccion/contadores'])).toMatchObject({ bolsas: 2, kitsVendidos: 1 });
  await page.locator('.status-select').selectOption('entregado');
  expect(await page.evaluate(() => Object.keys(window.__db).filter(key => key.startsWith('ventas_kits/')).length)).toBe(1);
  await page.locator('.status-select').selectOption('cancelado');
  await expect(page.locator('.status-select')).toHaveValue('cancelado');
  expect(await page.evaluate(() => window.__db['produccion/contadores'])).toMatchObject({ bolsas: 3, kitsVendidos: 0 });
  expect(await page.evaluate(() => Object.entries(window.__db).find(([key]) => key.startsWith('ventas_kits/'))[1].revertida)).toBe(true);
});
test('editar un pedido y entregar sin stock falla sin guardar parcialmente', async ({ page, setup }) => {
  await openAdmin(page, setup, { data: { ...defaults, 'produccion/contadores': { ...defaults['produccion/contadores'], bolsas: 0 } } });
  await page.locator('[data-tab=pedidos]').click();
  await page.locator('#ordersTableBody .btn-edit').click();
  await page.locator('#modalName').fill('Nombre modificado');
  await page.locator('#modalStatus').selectOption('entregado');
  await page.locator('#modalSave').click();
  await expect(page.locator('#modalError')).toContainText('No hay suficientes kits');
  expect(await page.evaluate(() => window.__db['pedidos_lifebag/pedido1'].nombre)).toBe('Ana');
});
test('no permite cambiar cantidades de una venta ni borrar una venta sincronizada', async ({ page, setup }) => {
  await openAdmin(page, setup);
  await page.locator('[data-tab=pedidos]').click();
  await page.locator('.status-select').selectOption('entregado');
  await expect(page.locator('.sync-ok')).toBeVisible();
  await page.locator('#ordersTableBody .btn-edit').click();
  await page.locator('#modalCantidadKits').fill('2');
  await page.locator('#modalSave').click();
  await expect(page.locator('#modalError')).toContainText('primero pasá el pedido a cancelado');
  await page.locator('#modalCancel').click();
  const messages = [];
  page.on('dialog', async dialog => { messages.push(dialog.message()); await dialog.accept(); });
  await page.locator('#ordersTableBody .btn-delete').click();
  await expect.poll(() => messages.length).toBe(2);
  expect(messages[1]).toContain('venta registrada');
  expect(await page.evaluate(() => window.__db['pedidos_lifebag/pedido1'])).toBeTruthy();
});
test('solicitudes muestra datos maliciosos como texto', async ({ page, setup }) => {
  const name = '<img src=x onerror="window.hacked=true">';
  await setup({ user: owner, data: { ...defaults, 'usuarios/evil': { nombre: name, email: 'test@example.com', estado: 'pendiente' } } });
  await page.goto('http://lifebag.test/admin-solicitudes.html');
  await expect(page.locator('.correo')).toHaveText(name);
  await expect(page.locator('#listaPendientes img')).toHaveCount(0);
  expect(await page.evaluate(() => window.hacked)).toBeUndefined();
});
for (const width of [390, 1440]) {
  test(`panel navega sin errores ni desbordes a ${width}px`, async ({ page, setup }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await openAdmin(page, setup);
    for (const tab of ['produccion', 'pedidos', 'finanzas', 'configuracion']) {
      await page.locator('[data-tab=' + tab + ']').click();
      await expect(page.locator('#view-' + tab)).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}
test('diálogos contienen el foco y se cierran con Escape', async ({ page, setup }) => {
  await openAdmin(page, setup);
  await page.locator('#invAddBtn').click();
  await expect(page.getByRole('dialog', { name: 'Editar o agregar producto' })).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#invModalSave')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#invNombre')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#invModal')).not.toHaveClass(/show/);
  await expect(page.locator('#invAddBtn')).toBeFocused();
});
test('un insumo del kit necesita una cantidad mayor que cero', async ({ page, setup }) => {
  await openAdmin(page, setup);
  await page.locator('#invAddBtn').click();
  await page.locator('#invNombre').fill('Linterna');
  await page.locator('#invEsKit').check();
  await page.locator('#invModalSave').click();
  await expect(page.locator('#invCantidadPorKit')).toBeFocused();
  expect(await page.evaluate(() => Object.keys(window.__db).filter(key => key.startsWith('inventario_productos/')).length)).toBe(1);
});
test('un guardado automático fallido se informa en el panel', async ({ page, setup }) => {
  await openAdmin(page, setup);
  await page.evaluate(() => { window.__failWrites = true; });
  await page.locator('#input-mantas').fill('9');
  await expect(page.locator('#panelNotice')).toBeVisible();
  expect(await page.evaluate(() => window.__db['produccion/contadores'].mantas)).toBe(2);
});
