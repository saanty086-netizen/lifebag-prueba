# Cómo integrar el sistema de aprobación en LifeBag

## 1. Qué hace cada archivo

- **registro.html** → página pública para crear cuenta (correo + contraseña). Al crearla, queda guardada en Firestore con `estado: "pendiente"` y se cierra la sesión automáticamente (no puede entrar todavía).
- **admin-solicitudes.html** → solo vos y `lifebag11@gmail.com` pueden verla. Lista las cuentas pendientes con botones **Aprobar** / **Rechazar**.
- **login.html** (el tuyo, ya existente) → hay que sumarle una verificación después del login: si el usuario no está `aprobado`, no lo dejamos entrar.

## 2. Reemplazar el config de Firebase

En los dos archivos nuevos hay un bloque `firebaseConfig` con placeholders (`TU_API_KEY`, etc). Reemplazalo por el mismo que ya usás en tu `login.html` actual — es el mismo proyecto de Firebase, solo copiá y pegá ese objeto.

## 3. Snippet para agregar a login.html

Justo después de que el login con email/contraseña (o con Google) sea exitoso, y ANTES de redirigir al panel, agregá esto:

```javascript
// Después de un login exitoso (email/pass o Google):
const uid = userCredential.user.uid; // o firebase.auth().currentUser.uid si es con Google

const doc = await db.collection('usuarios').doc(uid).get();

if (!doc.exists) {
  // Primera vez que este usuario inicia sesión (por ejemplo, con Google):
  // lo creamos como pendiente y lo sacamos.
  await db.collection('usuarios').doc(uid).set({
    email: userCredential.user.email,
    estado: 'pendiente',
    rol: 'usuario',
    creadoEn: firebase.firestore.FieldValue.serverTimestamp()
  });
  await auth.signOut();
  mostrarError('Tu cuenta fue creada y está pendiente de aprobación por un administrador.');
  return;
}

const datos = doc.data();

if (datos.estado !== 'aprobado') {
  await auth.signOut();
  mostrarError(
    datos.estado === 'rechazado'
      ? 'Tu acceso fue rechazado. Contactá a un administrador.'
      : 'Tu cuenta todavía está pendiente de aprobación.'
  );
  return;
}

// Si llegó hasta acá: está aprobado, lo dejamos pasar
window.location.href = 'panel.html'; // o donde redirijas hoy
```

Esto cubre tanto el login con correo/contraseña como el de "Ingresar con Google" que ya tenés en la pantalla — a ambos les exige estar aprobados.

## 4. Reglas de seguridad de Firestore

Sin esto, cualquiera podría editar su propio documento y ponerse `estado: "aprobado"` a mano desde la consola del navegador. Andá a **Firebase Console → Firestore Database → Reglas** y agregá (o fusioná con lo que ya tengas):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /usuarios/{userId} {
      // El usuario puede leer y crear su propio documento (al registrarse)
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId
                    && request.resource.data.estado == 'pendiente';

      // Solo los admins pueden modificar el estado (aprobar/rechazar)
      allow update: if request.auth != null &&
                    request.auth.token.email in ['saanty086@gmail.com', 'lifebag11@gmail.com'];

      // Los admins pueden listar todos los usuarios (para el panel de solicitudes)
      allow list: if request.auth != null &&
                  request.auth.token.email in ['saanty086@gmail.com', 'lifebag11@gmail.com'];
    }
  }
}
```

## 5. Estructura de datos en Firestore

Colección `usuarios`, un documento por cada cuenta (el ID del documento es el `uid` de Firebase Auth):

| Campo | Tipo | Descripción |
|---|---|---|
| `email` | string | correo de la cuenta |
| `estado` | string | `pendiente` / `aprobado` / `rechazado` |
| `rol` | string | por ahora `usuario` (te sirve a futuro si querés roles distintos) |
| `creadoEn` | timestamp | cuándo se registró |
| `revisadoPor` | string | correo del admin que lo aprobó/rechazó |
| `revisadoEn` | timestamp | cuándo se revisó |

## 6. Link de registro

En tu `login.html` actual, agregá un link hacia `registro.html` (por ejemplo, cerca de "Volver al sitio") para que la gente pueda crear su cuenta.

## 7. Vos como admin, primera vez

Como las reglas exigen que el `estado` sea `aprobado` para entrar, tu propia cuenta (`saanty086@gmail.com`) y la de `lifebag11@gmail.com` van a necesitar que les crees el documento manualmente la primera vez, con `estado: "aprobado"`, directamente desde la consola de Firestore. Después de eso, ya van a poder usar `admin-solicitudes.html` para aprobar a los demás.
