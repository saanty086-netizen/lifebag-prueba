# Life Bag

Sitio estático y panel del equipo de Life Bag, un microemprendimiento escolar de Giagnoni, Mendoza. Usa HTML, CSS, JavaScript y Firebase (Auth + Firestore). No necesita compilación para publicarse.

## Archivos principales

- `index.html`, `style.css`: portada, contenido del kit, historia y formulario de reserva.
- `reserva.js`: validación, guardado de reservas y enlace a WhatsApp.
- `armar-kit.html`, `app.js`: guía y checklist con persistencia local.
- `login.html`, `registro.html`, `access.js`: acceso y solicitud de ingreso al equipo.
- `admin.html`: producción, inventario, pedidos y finanzas.
- `admin-solicitudes.html`: aprobación de cuentas y permisos por área.
- `panel-ui.css`: estilos de acceso, panel y privacidad.
- `firebase-config.js`: conexión al proyecto Firebase existente.
- `firestore.rules`: reglas de acceso que deben configurarse en Firestore.
- `assets/`: fotos y logos originales, fuentes con sus licencias e iconos Lucide fijados a la versión 0.468.0. Las fotos de la bolsa se conservan sin modificaciones.

## Desarrollo y verificaciones

```sh
npm ci
npm run check
npm test
npx playwright install chromium
npm run test:browser
npm run test:rules
```

`check` revisa la sintaxis de todos los scripts, IDs, enlaces y anclas locales de las siete páginas. Las pruebas de navegador sirven los archivos mediante interceptación local y simulan Firebase: no escriben en el proyecto real. Incluyen vistas de 320 a 1440 px, reservas, errores de conexión, persistencia del checklist, permisos, stock y transacciones de ventas.

Las pruebas de reglas necesitan Java 21 o posterior. Usan únicamente el emulador de Firestore y el proyecto ficticio `demo-lifebag`. La primera ejecución obtiene Firebase CLI 15.34.2 mediante `npx` y descarga el emulador. La CLI no forma parte de las dependencias del sitio. Los resultados temporales y dependencias están excluidos de Git.

Para navegar el sitio en desarrollo usá un servidor HTTP estático, por ejemplo `python -m http.server 8000`. Abrirlo mediante `file://` no permite probar de forma confiable los módulos de Firebase.

## Publicación

El sitio puede alojarse en GitHub Pages u otro hosting estático. Publicá los HTML, JS, CSS, `assets/` y `CNAME` cuando corresponda. No subas `node_modules/`, pruebas ni reportes. Todos los enlaces internos usan archivos `.html`, así que también funcionan en subdirectorios.

**Las reglas locales no se activan al publicar el sitio.** Para aplicarlas, revisá `firestore.rules` y reemplazá las reglas del proyecto desde Firebase Console → Firestore Database → Reglas. No se modificaron reglas ni datos del servicio real durante este trabajo.

## Datos y permisos

- Cualquier visitante puede crear una reserva válida en `pedidos_lifebag`, pero no leer los datos de otras personas.
- Las cuentas nuevas crean únicamente su propio perfil `pendiente` en `usuarios`. Estar autenticado no alcanza para entrar al panel.
- El equipo aprobado puede consultar el panel. Para editar necesita `permisos.produccion`, `permisos.pedidos` o `permisos.finanzas`, según corresponda.
- Solo las cuentas de propietarios listadas en `access.js` y `firestore.rules`, con correo verificado, administran solicitudes, permisos y configuración. Ingresar con Google verifica el correo; las cuentas de contraseña deben tenerlo verificado en Firebase.
- La interfaz controla qué se puede editar; las reglas de Firestore son la barrera que protege la base. Ambas deben mantenerse sincronizadas.
- Las reservas confirmadas ofrecen un enlace explícito a WhatsApp para evitar el bloqueo de ventanas emergentes.
- El armado de kits descuenta insumos y una manta terminada por kit dentro de una transacción. La entrega de un pedido descuenta kits disponibles y registra su venta una sola vez; cancelar revierte ambas cosas.
- No se puede borrar un pedido con venta aplicada ni cambiar su cantidad hasta cancelar y guardar la reversión.
- La ganancia acumulada mostrada es una estimación con costos actuales; no reconstruye costos históricos.

## Colecciones utilizadas

| Colección/documento | Uso |
| --- | --- |
| `usuarios/{uid}` | Estado de aprobación y permisos |
| `pedidos_lifebag/{id}` | Reservas y referencia de la venta aplicada |
| `produccion/contadores` | Cuadraditos, lana, mantas, kits disponibles y vendidos |
| `inventario_productos/{id}` | Stock, costos e insumos que componen un kit |
| `configuracion/valores` | Precio de venta y parámetros de producción |
| `ventas_kits/{id}` | Ventas manuales y de pedidos, con marca de reversión |
| `finanzas/configuracion` | Lectura del precio de la versión anterior al migrar |

Contacto comercial: `5492634287145` · Instagram: `lifebag2026`.
