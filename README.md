# Life Bag — Sitio + Panel interno

## Archivos
- `index.html` — sitio público (kit, historia, formulario de reserva).
- `login.html` — inicio de sesión del panel interno.
- `admin.html` — panel interno: contadores de producción + lista de espera.
- `firebase-config.js` — credenciales de Firebase, compartidas por los tres.
- `assets/` — logo y fotos del kit.

## 1. Crear el proyecto de Firebase
1. Entrá a https://console.firebase.google.com y creá un proyecto (gratis).
2. **Firestore Database** → crear base de datos → modo producción.
3. **Authentication** → método de acceso → activar "Correo electrónico/contraseña".
4. **Authentication → Users** → agregar el usuario con el que va a entrar el panel (ej. el mail del emprendimiento).
5. **Configuración del proyecto → Tus apps** → agregar app web → copiar el objeto `firebaseConfig`.
6. Pegar esos valores en `firebase-config.js` (reemplazando los `TU_...`).

## 2. Reglas de seguridad de Firestore
Cualquiera puede **crear** una reserva desde el sitio, pero solo un usuario logueado (el panel) puede **leer, editar o borrar** pedidos, y solo el panel puede tocar los contadores de producción. Pegá esto en Firestore → Reglas:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /pedidos_lifebag/{pedidoId} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }

    match /produccion/{docId} {
      allow read, write: if request.auth != null;
    }

    match /inventario_productos/{productoId} {
      allow read, write: if request.auth != null;
    }

    match /ventas_kits/{ventaId} {
      allow read, write: if request.auth != null;
    }

    match /finanzas/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

`inventario_productos` es la única colección de productos: la usan tanto Producción como Finanzas, así no se duplica stock ni datos. `finanzas/configuracion` solo guarda el precio de venta del Life Bag (arranca en $45.000).

## 3. Probar en local / publicar
- Podés abrir `index.html` directamente, o subir la carpeta tal cual a GitHub Pages, Netlify o Vercel — es un sitio 100% estático.
- Con GitHub Pages: subí estos archivos a un repo y activá Pages sobre la rama principal.

## 4. Cómo funciona
- **Reservar (sitio público):** guarda el pedido en la colección `pedidos_lifebag` con estado `espera` y abre WhatsApp con un mensaje de interés, sin que la persona pierda el sitio.
- **Panel → Producción:** tres contadores manuales (`cuadraditos`, `mantas`, `bolsas`) guardados en `produccion/contadores`, con botones + / − en tiempo real. Debajo, el inventario de insumos (`inventario_productos`) con stock, costo unitario y si cada producto forma parte del kit.
- **Panel → Lista de espera:** pedidos ordenados por orden de llegada (el primero en anotarse es el #1), con buscador, filtro por estado, cambio de estado, chat directo por WhatsApp y opción de eliminar.
- **Panel → Finanzas:** lee y edita los mismos productos de `inventario_productos` (no crea un inventario aparte). Desde ahí se puede ajustar el costo unitario, si el producto es parte del kit y la cantidad necesaria por kit, además del precio de venta del Life Bag (`finanzas/configuracion`, arranca en $45.000). Con eso calcula automáticamente el costo de fabricar 1 kit, la ganancia y el margen.
- El acceso a `admin.html` está protegido: si no hay sesión iniciada, redirige a `login.html`.

## 5. Personalizar
- Cambiá el número de WhatsApp del negocio en `index.html` (variable `businessPhone`) y en el footer.
- Cambiá el Instagram en el footer de `index.html`.
- Las fotos y el logo están en `assets/`; reemplazalas por otras del mismo nombre de archivo si querés actualizarlas.
