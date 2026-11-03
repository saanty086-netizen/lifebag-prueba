# Acceso al equipo Life Bag

La aprobación ya está integrada en el sitio. No hace falta copiar snippets ni crear otra configuración de Firebase: todas las páginas usan `firebase-config.js`.

1. Activá los proveedores de acceso necesarios en Firebase Authentication: correo/contraseña y Google. Registrá el dominio del sitio como dominio autorizado.
2. Revisá y aplicá `firestore.rules` en la consola de Firestore. Publicar los archivos del sitio no publica estas reglas.
3. Los propietarios definidos en `access.js` y `firestore.rules` ingresan con correo verificado. Si usan Google, ese proveedor lo verifica. No se crean ni autoaprueban documentos desde el login.
4. Cada integrante se registra en `registro.html`. Su perfil queda `pendiente`, con rol `usuario`.
5. Un propietario entra a `admin-solicitudes.html` desde «Equipo y permisos» en el panel. Puede aprobar, rechazar, eliminar perfiles y habilitar edición por área.
6. Las cuentas aprobadas sin permisos pueden consultar las áreas. Los permisos habilitan la edición de Producción, Lista de espera o Finanzas. Configuración sigue reservada a propietarios.

La eliminación del perfil quita el acceso al panel; no borra la cuenta en Authentication. El panel escucha cambios en el perfil y cierra el acceso si se revoca la aprobación.

Los permisos deben protegerse en la base de datos. Ocultar botones no reemplaza a las reglas de Firestore. Las pruebas de `npm run test:rules` comprueban reservas públicas, perfiles pendientes, lectura del equipo, edición por área y administración en un emulador aislado.
