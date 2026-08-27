document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="css/security.css">');
const form = document.querySelector('#loginForm');
const statusBox = document.querySelector('#loginStatus');
api.get('/admin/session').then((session) => { if (session.authenticated) location.replace('/admin.html'); });
form.addEventListener('submit', async (event) => {
  event.preventDefault(); const button = form.querySelector('button');
  button.disabled = true; button.textContent = 'Verificando…'; statusBox.hidden = true;
  try { await api.post('/admin/login', { password: form.elements.password.value }); location.replace('/admin.html'); }
  catch (error) { showNotice(statusBox, error.message); form.elements.password.select(); button.disabled = false; button.textContent = 'Ingresar'; }
});
