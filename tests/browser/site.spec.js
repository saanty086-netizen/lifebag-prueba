import { test, expect, defaults, owner } from './fixture.js';

for (const width of [320, 390, 768, 1024, 1440]) {
  for (const file of ['index.html', 'armar-kit.html', 'login.html', 'registro.html', 'privacidad.html']) {
    test(`${file} sin desbordes a ${width}px`, async ({ page, setup }) => {
      await setup();
      await page.setViewportSize({ width, height: 900 });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('http://lifebag.test/' + file);
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      if (file === 'index.html' && [390, 1440].includes(width)) await page.screenshot({ path: '/tmp/lifebag-' + width + '.png', fullPage: true });
      if (file === 'index.html') {
        expect(await page.locator('.hero-visual>img').getAttribute('src')).toBe('assets/kit-foto-1.jpg');
        expect(await page.locator('.kit-photo>img').getAttribute('src')).toBe('assets/kit-foto-2.jpg');
      }
    });
  }
}
test('checklist guarda, recupera y reinicia el progreso', async ({ page, setup }) => {
  await setup();
  await page.goto('http://lifebag.test/armar-kit.html');
  const boxes = page.locator('#clCards input[type=checkbox]');
  await expect(boxes).toHaveCount(19);
  await boxes.first().check();
  await expect(page.locator('#clText')).toContainText('1 de 19');
  await page.reload();
  await expect(boxes.first()).toBeChecked();
  await page.getByRole('button', { name: 'Reiniciar' }).click();
  await expect(boxes.first()).not.toBeChecked();
  await expect(page.locator('.progress')).toHaveAttribute('aria-valuenow', '0');
});
for (const value of ['null', '[]', 'false', '{broken']) {
  test(`checklist tolera almacenamiento corrupto: ${value}`, async ({ page, setup }) => {
    await setup({ storage: value });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://lifebag.test/armar-kit.html');
    await expect(page.locator('#clCards details')).toHaveCount(9);
    expect(errors).toEqual([]);
  });
}
test('checklist funciona con almacenamiento bloqueado y lo informa', async ({ page, setup }) => {
  await setup();
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  await page.goto('http://lifebag.test/armar-kit.html');
  await page.locator('#clCards input').first().check();
  await expect(page.locator('#clText')).toContainText('1 de 19');
  await expect(page.locator('#clStorage')).toContainText('no permite guardar');
});
async function fillReservation(page) {
  await page.getByLabel('Nombre y apellido').fill('Ana Pérez');
  await page.getByLabel('WhatsApp', { exact: true }).fill('263 555 1234');
  await page.getByLabel('Distrito o zona').fill('Giagnoni');
}
test('reserva valida los datos antes de enviarlos', async ({ page, setup }) => {
  await setup();
  await page.goto('http://lifebag.test/');
  await page.getByRole('button', { name: 'Reservar mi Life Bag' }).click();
  await expect(page.locator('#nombre')).toBeFocused();
  await fillReservation(page);
  await page.locator('#telefono').fill('abc123');
  await page.getByRole('button', { name: 'Reservar mi Life Bag' }).click();
  await expect(page.locator('#telefono')).toBeFocused();
  await expect(page.locator('#reservaMsg')).toContainText('WhatsApp válido');
});
test('reserva guarda una sola vez y deja el enlace a WhatsApp visible', async ({ page, setup }) => {
  await setup();
  await page.goto('http://lifebag.test/');
  await fillReservation(page);
  await page.getByLabel('Cantidad de kits').selectOption('2');
  await page.getByRole('button', { name: 'Reservar mi Life Bag' }).click();
  await expect(page.locator('#reservaMsg')).toContainText('quedó guardada');
  await expect(page.locator('#reservaWhatsapp')).toHaveAttribute('href', /https:\/\/wa.me\/5492634287145\?text=/);
  const orders = await page.evaluate(() => Object.entries(window.__db).filter(([key]) => key.startsWith('pedidos_lifebag/new-')));
  expect(orders).toHaveLength(1);
  expect(orders[0][1]).toMatchObject({ nombre: 'Ana Pérez', cantidadKits: 2, estado: 'espera' });
  await expect(page.locator('#nombre')).toHaveValue('');
});
test('reserva fallida conserva datos y permite reintentar', async ({ page, setup }) => {
  await setup();
  await page.goto('http://lifebag.test/');
  await fillReservation(page);
  await page.evaluate(() => { window.__failWrites = true; });
  await page.getByRole('button', { name: 'Reservar mi Life Bag' }).click();
  await expect(page.locator('#reservaMsg')).toContainText('No pudimos guardar');
  await expect(page.locator('#nombre')).toHaveValue('Ana Pérez');
  await expect(page.locator('#reservaBtn')).toBeEnabled();
  await page.evaluate(() => { window.__failWrites = false; });
  await page.getByRole('button', { name: 'Reservar mi Life Bag' }).click();
  await expect(page.locator('#reservaMsg')).toContainText('quedó guardada');
});
