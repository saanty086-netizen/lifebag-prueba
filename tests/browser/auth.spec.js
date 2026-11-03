import { test, expect, defaults, owner } from './fixture.js';

test('login válido revisa permisos y redirige al archivo estático del panel', async ({ page, setup }) => {
  await setup();
  await page.goto('http://lifebag.test/login.html');
  await page.getByLabel('Correo electrónico').fill(owner.email);
  await page.getByLabel('Contraseña').fill('password123');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/admin.html$/);
  await expect(page.locator('#app')).toBeVisible();
});
test('login informa una solicitud pendiente y mantiene al usuario fuera del panel', async ({ page, setup }) => {
  const user = { uid: 'new', email: 'new@example.com', emailVerified: true };
  await setup({ data: { ...defaults, 'usuarios/new': { estado: 'pendiente' } } });
  await page.addInitScript(user => { window.__loginUser = user; }, user);
  await page.goto('http://lifebag.test/login.html');
  await page.getByRole('button', { name: 'Ingresar con Google' }).click();
  await expect(page.locator('#errorMsg')).toContainText('pendiente de aprobación');
  await expect(page).toHaveURL(/login.html$/);
  await expect(page.locator('#googleBtn')).toBeEnabled();
});
test('registro permite reintentar si Auth se creó pero falló guardar el perfil', async ({ page, setup }) => {
  await setup();
  await page.addInitScript(() => { window.__loginUser = { uid: 'new', email: 'new@example.com', emailVerified: true }; });
  await page.goto('http://lifebag.test/registro.html');
  await page.locator('#nombre').fill('María Pérez');
  await page.locator('#email').fill('new@example.com');
  await page.locator('#password').fill('password123');
  await page.locator('#password2').fill('password123');
  await page.evaluate(() => { window.__failWrites = true; });
  await page.locator('#registroBtn').click();
  await expect(page.locator('#errorMsg')).toBeVisible();
  await page.evaluate(() => { window.__failWrites = false; });
  await page.locator('#registroBtn').click();
  await expect(page.locator('#successMsg')).toContainText('Tu cuenta fue creada');
  expect(await page.evaluate(() => window.__db['usuarios/new'])).toMatchObject({ nombre: 'María Pérez', estado: 'pendiente', rol: 'usuario' });
});
test('registro Google reintenta sin volver a vincular una contraseña ya creada', async ({ page, setup }) => {
  await setup();
  await page.addInitScript(() => { window.__loginUser = { uid: 'google', email: 'google@example.com', emailVerified: true, providerData: [] }; });
  await page.goto('http://lifebag.test/registro.html');
  await page.locator('#googleBtn').click();
  await page.locator('#gNombre').fill('María Pérez');
  await page.locator('#gPassword').fill('password123');
  await page.locator('#gPassword2').fill('password123');
  await page.evaluate(() => { window.__failWrites = true; });
  await page.locator('#googleFormBtn').click();
  await expect(page.locator('#errorMsg')).toBeVisible();
  await page.evaluate(() => { window.__failWrites = false; });
  await page.locator('#googleFormBtn').click();
  await expect(page.locator('#successMsg')).toContainText('Tu cuenta quedó creada');
  expect(await page.evaluate(() => window.__links)).toBe(1);
});
