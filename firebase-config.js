// ============================================================
// Life Bag — Configuración central de Firebase
// ============================================================
// 1. Andá a https://console.firebase.google.com → creá un proyecto
//    (o usá uno existente).
// 2. Activá "Firestore Database" (modo producción) y
//    "Authentication" → método "Correo electrónico/contraseña".
// 3. En Authentication > Users, creá el usuario admin (el mail y
//    contraseña con los que va a entrar el panel).
// 4. En Configuración del proyecto > General > "Tus apps" → agregá
//    una app web y pegá aquí abajo las credenciales que te da Firebase.
// 5. Guardá este archivo y subilo junto con index.html, login.html
//    y admin.html — los tres lo importan desde acá.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBBbXh_Og_ryiBl8Q5VjsU5yH-sk6iSKmI",
  authDomain: "lifebag-d637e.firebaseapp.com",
  projectId: "lifebag-d637e",
  storageBucket: "lifebag-d637e.firebasestorage.app",
  messagingSenderId: "629327458250",
  appId: "1:629327458250:web:fdf226fba3895e3fd36933"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);