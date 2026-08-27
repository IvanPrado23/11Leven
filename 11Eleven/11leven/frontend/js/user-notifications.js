(() => {
  document.body.insertAdjacentHTML('beforeend', `<button class="user-notification-button" id="userNotificationButton" aria-label="Notificaciones">🔔<span class="user-notification-count" id="userNotificationCount" hidden>0</span></button><aside class="user-notification-panel" id="userNotificationPanel" hidden><h2>Modo usuario</h2><p>Selecciona quién está consultando la plataforma.</p><select id="publicUserSelect"><option value="">Selecciona un usuario…</option></select><div class="notification-list" id="userNotificationList"><span class="muted">Selecciona un usuario para ver sus avisos.</span></div></aside>`);
  const button = document.querySelector('#userNotificationButton');
  const panel = document.querySelector('#userNotificationPanel');
  const select = document.querySelector('#publicUserSelect');
  const list = document.querySelector('#userNotificationList');
  const count = document.querySelector('#userNotificationCount');
  let notifications = [];

  function seenKey() { return `11leven_seen_${select.value}`; }
  function seen() { try { return new Set(JSON.parse(localStorage.getItem(seenKey()) || '[]')); } catch { return new Set(); } }
  function markSeen(ids) { localStorage.setItem(seenKey(), JSON.stringify(ids)); }
  function notificationRow(item) { return `<a class="notification-item" href="partido.html?id=${item.id_partido}"><strong>${escapeHtml(item.seleccion_nombre)} confirmó su alineación</strong><span>${escapeHtml(item.fecha)} · ${escapeHtml(item.estadio)} · ${escapeHtml(item.formacion_tactica)}</span></a>`; }

  function showToast(item) {
    document.querySelector('.notification-toast')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="notification-toast"><button aria-label="Cerrar">×</button><a href="partido.html?id=${item.id_partido}"><strong>¡Alineación confirmada!</strong><span>${escapeHtml(item.seleccion_nombre)} publicó su formación ${escapeHtml(item.formacion_tactica)}.</span></a></div>`);
    const toast = document.querySelector('.notification-toast');
    toast.querySelector('button').addEventListener('click', () => toast.remove());
    setTimeout(() => toast?.remove(), 8000);
  }

  async function loadNotifications(showNew = true) {
    if (!select.value) return;
    try {
      notifications = await api.get(`/notificaciones-usuario/${select.value}`);
      const oldSeen = seen();
      const unseen = notifications.filter((item) => !oldSeen.has(item.id_notificacion));
      list.innerHTML = notifications.length ? notifications.map(notificationRow).join('') : '<span class="muted">Todavía no tienes notificaciones.</span>';
      count.textContent = unseen.length;
      count.hidden = unseen.length === 0;
      if (showNew && unseen.length) showToast(unseen[0]);
      if (panel.hidden && unseen.length) return;
      markSeen(notifications.map((item) => item.id_notificacion));
      count.hidden = true;
    } catch (error) { list.innerHTML = `<span class="muted">${escapeHtml(error.message)}</span>`; }
  }

  async function loadUsers() {
    try {
      const users = await api.get('/usuarios-publicos');
      select.insertAdjacentHTML('beforeend', users.map((user) => `<option value="${user.id_usuario}">${escapeHtml(user.nombre)}</option>`).join(''));
      const selected = localStorage.getItem('11leven_public_user');
      if (users.some((user) => String(user.id_usuario) === selected)) { select.value = selected; loadNotifications(true); }
    } catch (_error) { list.innerHTML = '<span class="muted">No fue posible cargar los usuarios.</span>'; }
  }

  button.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden && select.value) { markSeen(notifications.map((item) => item.id_notificacion)); count.hidden = true; loadNotifications(false); }
  });
  select.addEventListener('change', () => { localStorage.setItem('11leven_public_user', select.value); loadNotifications(true); });
  loadUsers();
  setInterval(() => loadNotifications(true), 15000);
})();
