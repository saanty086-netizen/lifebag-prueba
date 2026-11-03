/* La confirmación en Firestore y el enlace a WhatsApp son pasos independientes. */
(() => {
  const form = document.getElementById('reservaForm');
  if (!form) return;
  const btn = document.getElementById('reservaBtn');
  const msg = document.getElementById('reservaMsg');
  const whatsapp = document.getElementById('reservaWhatsapp');
  let sending = false;
  function show(kind, text) {
    msg.className = 'msg ' + kind;
    msg.textContent = text;
  }
  form.addEventListener('input', event => event.target.removeAttribute('aria-invalid'));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    whatsapp.hidden = true;
    const fields = form.elements;
    const nombre = fields.nombre.value.trim();
    const telefono = fields.telefono.value.trim();
    const distrito = fields.distrito.value.trim();
    const cantidadKits = Number(fields.cantidad.value);
    const invalid = !nombre ? fields.nombre : !/^[+\d\s().-]+$/.test(telefono) || telefono.replace(/\D/g, '').length < 10 || telefono.replace(/\D/g, '').length > 15 ? fields.telefono : !distrito ? fields.distrito : null;
    if (invalid) {
      show('err', invalid === fields.telefono ? 'Ingresá un WhatsApp válido con código de área (entre 10 y 15 dígitos).' : 'Completá tu nombre y tu distrito o zona.');
      invalid.setAttribute('aria-invalid', 'true');
      invalid.focus();
      return;
    }
    if (!Number.isInteger(cantidadKits) || cantidadKits < 1 || cantidadKits > 5) {
      show('err', 'Elegí entre 1 y 5 kits.');
      return;
    }
    sending = true;
    btn.disabled = true;
    form.setAttribute('aria-busy', 'true');
    btn.querySelector('span').textContent = 'Guardando tu reserva…';
    show('ok', 'Estamos guardando tus datos.');
    try {
      const [{ db }, fs] = await Promise.all([
        import('./firebase-config.js'),
        import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js')
      ]);
      await fs.addDoc(fs.collection(db, 'pedidos_lifebag'), {
        nombre, telefono, distrito, cantidadKits, estado: 'espera', fecha: fs.serverTimestamp()
      });
      const text = `¡Hola, Life Bag! Me anoté para reservar ${cantidadKits} kit(s). Soy ${nombre} (${distrito}).`;
      whatsapp.href = 'https://wa.me/5492634287145?text=' + encodeURIComponent(text);
      whatsapp.hidden = false;
      show('ok', '¡Listo! Tu reserva quedó guardada. Podés continuar por WhatsApp para hablar con el equipo.');
      form.reset();
    } catch (error) {
      console.error('No se pudo guardar la reserva:', error);
      show('err', 'No pudimos guardar tu reserva. Tus datos siguen acá para que puedas reintentar, o escribinos por WhatsApp.');
      whatsapp.href = 'https://wa.me/5492634287145';
      whatsapp.hidden = false;
    } finally {
      sending = false;
      btn.disabled = false;
      btn.querySelector('span').textContent = 'Reservar mi Life Bag';
      form.removeAttribute('aria-busy');
    }
  });
})();
