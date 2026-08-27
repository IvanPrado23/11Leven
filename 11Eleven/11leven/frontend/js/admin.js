document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="css/security.css">');

const schemas = {
  torneos: {
    title: 'Mundiales',
    id: 'id_torneo',
    columns: ['anio', 'nombre', 'pais_sede', 'campeon', 'cantidad_equipos', 'cantidad_partidos'],
    fields: {
      anio: ['Año de la edición', 'number'],
      nombre: ['Nombre oficial', 'text'],
      pais_sede: ['País(es) sede', 'text'],
      logo_url: ['Logo o emblema (URL)', 'text'],
      campeon: ['Campeón', 'text'],
      subcampeon: ['Subcampeón', 'text'],
      cantidad_equipos: ['Cantidad de selecciones', 'number'],
      cantidad_partidos: ['Cantidad de partidos', 'number'],
      descripcion: ['Descripción histórica', 'text']
    }
  },
  selecciones: {
    title: 'Selecciones',
    id: 'id_seleccion',
    columns: ['nombre', 'id_torneo', 'bandera', 'grupo_fifa'],
    fields: {
      id_torneo: ['Mundial / Edición', 'select'],
      nombre: ['Nombre', 'text'],
      bandera: ['Bandera (ruta o URL)', 'text'],
      grupo_fifa: ['Grupo FIFA', 'text']
    }
  },
  jugadores: {
    title: 'Jugadores',
    id: 'id_jugador',
    columns: ['nombre', 'dorsal', 'posicion', 'id_seleccion'],
    fields: {
      nombre: ['Nombre', 'text'],
      dorsal: ['Dorsal', 'number'],
      posicion: ['Posición habitual', 'position-select'],
      id_seleccion: ['Selección', 'select']
    }
  },
  partidos: {
    title: 'Partidos',
    id: 'id_partido',
    columns: ['id_torneo', 'fecha', 'hora', 'estadio', 'fase_torneo', 'estado_partido'],
    fields: {
      id_torneo: ['Mundial / Edición', 'select'],
      fecha: ['Fecha', 'date'],
      hora: ['Hora', 'time'],
      estadio: ['Estadio', 'text'],
      fase_torneo: ['Fase del torneo', 'text'],
      estado_partido: ['Estado del partido', 'match-status']
    }
  },
  alineaciones: {
    title: 'Alineaciones',
    id: 'id_alineacion',
    columns: ['id_partido', 'seleccion_nombre', 'formacion_tactica', 'estado'],
    fields: {
      id_partido: ['Partido', 'select'],
      id_seleccion: ['Selección', 'select'],
      formacion_tactica: ['Formación táctica', 'formation-select'],
      tipo: ['Tipo', 'lineup-type'],
      fuente: ['Fuente', 'text'],
      fecha_publicacion: ['Fecha de publicación', 'datetime-local'],
      estado: ['Estado', 'status-select']
    }
  },
  usuarios: {
    title: 'Usuarios',
    id: 'id_usuario',
    columns: ['nombre', 'correo', 'idioma', 'notificaciones'],
    fields: {
      nombre: ['Nombre', 'text'],
      correo: ['Correo', 'email'],
      idioma: ['Idioma', 'language-select'],
      notificaciones: ['Recibir notificaciones', 'boolean-select']
    }
  },
  notificaciones: {
    title: 'Notificaciones',
    id: 'id_notificacion',
    columns: ['fecha_envio', 'estado', 'usuario_nombre', 'seleccion_nombre'],
    fields: {
      fecha_envio: ['Fecha del aviso', 'datetime-local'],
      estado: ['Estado', 'notification-status'],
      id_usuario: ['Usuario', 'select'],
      id_alineacion: ['Alineación', 'select']
    }
  }
};

let resource = 'torneos';
let cache = { torneos: [], selecciones: [], partidos: [], usuarios: [], alineaciones: [] };
const dialog = document.querySelector('#recordDialog');
const form = document.querySelector('#recordForm');
const flash = document.querySelector('#flash');

function label(name) {
  if (name === 'id_torneo') return 'Mundial';
  return name.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
}

function options(items, id, text, selected) {
  return `<option value="">Selecciona…</option>${items.map((item) => `<option value="${item[id]}" ${String(item[id]) === String(selected) ? 'selected' : ''}>${escapeHtml(text(item))}</option>`).join('')}`;
}

async function loadReferenceData() {
  [cache.torneos, cache.selecciones, cache.partidos, cache.usuarios, cache.alineaciones] = await Promise.all([
    api.get('/torneos'),
    api.get('/selecciones'),
    api.get('/partidos'),
    api.get('/usuarios'),
    api.get('/alineaciones')
  ]);
}

async function loadTable() {
  flash.hidden = true;
  try {
    await loadReferenceData();
    const rows = await api.get(`/${resource}`);
    const schema = schemas[resource];
    document.querySelector('#resourceTitle').textContent = schema.title;
    document.querySelector('#tableHead').innerHTML = `<tr>${schema.columns.map((c) => `<th>${label(c)}</th>`).join('')}<th>Acciones</th></tr>`;
    document.querySelector('#tableBody').innerHTML = rows.length
      ? rows.map((row) => `
          <tr>
            ${schema.columns.map((c) => `<td>${displayValue(c, row[c])}</td>`).join('')}
            <td class="actions">
              <button data-edit="${row[schema.id]}">Editar</button>
              <button data-delete="${row[schema.id]}" class="danger">Eliminar</button>
            </td>
          </tr>
        `).join('')
      : `<tr><td colspan="${schema.columns.length + 1}" class="empty-cell">No hay registros.</td></tr>`;
  } catch (error) {
    showNotice(flash, error.message);
  }
}

function displayValue(field, value) {
  if (field === 'id_torneo') {
    const t = cache.torneos.find((x) => x.id_torneo === value);
    return escapeHtml(t ? `${t.anio} · ${t.nombre}` : value);
  }
  if (field === 'id_seleccion') return escapeHtml(cache.selecciones.find((s) => s.id_seleccion === value)?.nombre || value);
  if (field === 'id_partido') {
    const p = cache.partidos.find((x) => x.id_partido === value);
    return escapeHtml(p ? `${p.fecha} · ${p.estadio}` : value);
  }
  if (field === 'id_usuario') return escapeHtml(cache.usuarios.find((x) => x.id_usuario === value)?.nombre || value);
  if (field === 'id_alineacion') {
    const a = cache.alineaciones.find((x) => x.id_alineacion === value);
    return escapeHtml(a ? `${a.seleccion_nombre} · ${a.fecha}` : value);
  }
  if (field === 'notificaciones') return value ? 'Sí' : 'No';
  if (field === 'bandera' && value) return `<span class="truncate">${escapeHtml(value)}</span>`;
  return escapeHtml(value ?? '—');
}

function inputFor(name, spec, value = '') {
  const [title, type] = spec;
  if (type === 'select') {
    const sources = {
      id_torneo: [cache.torneos, (x) => `${x.anio} - ${x.nombre}`],
      id_seleccion: [cache.selecciones, (x) => `${x.nombre} (${x.anio_torneo || 'Mundial'})`],
      id_partido: [cache.partidos, (x) => `${x.fecha} · ${x.estadio} (${x.anio_torneo || ''})`],
      id_usuario: [cache.usuarios, (x) => `${x.nombre} · ${x.correo}`],
      id_alineacion: [cache.alineaciones, (x) => `${x.seleccion_nombre} · ${x.fecha} · ${x.estadio}`]
    };
    const [items, text] = sources[name] || [[], () => ''];
    const html = options(items, name, text, value);
    return `<label>${title}<select name="${name}" required>${html}</select></label>`;
  }
  if (type === 'status-select') return `<label>${title}<select name="${name}" required><option ${value === 'Probable' ? 'selected' : ''}>Probable</option><option ${value === 'Confirmada' ? 'selected' : ''}>Confirmada</option></select></label>`;
  if (type === 'lineup-type') return `<label>${title}<select name="${name}" required><option ${value === 'Titular' ? 'selected' : ''}>Titular</option><option ${value === 'Alternativa' ? 'selected' : ''}>Alternativa</option></select></label>`;
  if (type === 'match-status') return `<label>${title}<select name="${name}" required>${['Programado','En curso','Finalizado','Suspendido'].map((item) => `<option ${value === item ? 'selected' : ''}>${item}</option>`).join('')}</select></label>`;
  if (type === 'notification-status') return `<label>${title}<select name="${name}" required>${['Pendiente','Enviada','Fallida'].map((item) => `<option ${value === item ? 'selected' : ''}>${item}</option>`).join('')}</select></label>`;
  if (type === 'boolean-select') return `<label>${title}<select name="${name}" required><option value="1" ${Number(value) === 1 ? 'selected' : ''}>Sí</option><option value="0" ${Number(value) === 0 ? 'selected' : ''}>No</option></select></label>`;
  if (type === 'language-select') return `<label>${title}<select name="${name}" required>${['Español','Inglés','Portugués'].map((item) => `<option ${value === item ? 'selected' : ''}>${item}</option>`).join('')}</select></label>`;
  if (type === 'position-select') return `<label>${title}<select name="${name}" required><option value="">Selecciona una posición…</option>${['Portero','Defensa','Mediocampista','Delantero'].map((item) => `<option ${value === item ? 'selected' : ''}>${item}</option>`).join('')}</select></label>`;
  if (type === 'formation-select') {
    const formations = ['4-3-3','4-4-2','4-2-3-1','4-2-1-3','4-1-2-3','4-1-3-2','4-1-4-1','4-3-1-2','4-2-2-2','3-5-2','3-4-3','3-4-2-1','3-4-1-2','5-3-2','5-2-3','5-4-1'];
    return `<label>${title}<select name="${name}" required><option value="">Selecciona una formación…</option>${formations.map((item) => `<option ${value === item ? 'selected' : ''}>${item}</option>`).join('')}</select><small class="field-help">Ejemplo: 4 defensas, 3 mediocampistas y 3 delanteros.</small></label>`;
  }
  const formatted = type === 'datetime-local' && value ? String(value).replace(' ', 'T').slice(0, 16) : value;
  return `<label>${title}<input name="${name}" type="${type}" value="${escapeHtml(formatted)}" ${type !== 'text' || name !== 'descripcion' ? 'required' : ''}></label>`;
}

async function openForm(id = null) {
  try {
    const schema = schemas[resource];
    let record = {};
    if (id) record = await api.get(`/${resource}/${id}`);
    document.querySelector('#recordId').value = id || '';
    document.querySelector('#formTitle').textContent = `${id ? 'Editar' : 'Nuevo'} ${schema.title.slice(0, -1).toLowerCase()}`;
    document.querySelector('#formFields').innerHTML = Object.entries(schema.fields).map(([name, spec]) => inputFor(name, spec, record[name])).join('');
    const picker = document.querySelector('#playerPicker');
    picker.hidden = resource !== 'alineaciones';
    if (resource === 'alineaciones') {
      form.elements.id_seleccion.onchange = () => loadPlayers(form.elements.id_seleccion.value, []);
      await loadPlayers(record.id_seleccion, record.jugadores || []);
    }
    dialog.showModal();
  } catch (error) {
    showNotice(flash, error.message);
  }
}

async function loadPlayers(teamId, selected) {
  const target = document.querySelector('#playersList');
  if (!teamId) {
    target.innerHTML = '<p class="muted">Selecciona primero una selección.</p>';
    return;
  }
  const players = await api.get(`/jugadores?id_seleccion=${teamId}`);
  target.innerHTML = players.map((player) => {
    const current = selected.find((x) => x.id_jugador === player.id_jugador) || {};
    const selectedPosition = current.posicion_cancha || player.posicion;
    const positionOptions = ['Portero','Defensa','Mediocampista','Delantero'].map((item) => `<option ${selectedPosition === item ? 'selected' : ''}>${item}</option>`).join('');
    return `
      <div class="player-pick" data-player="${player.id_jugador}">
        <div>
          <b>${escapeHtml(player.dorsal)}</b>
          <span>
            <strong>${escapeHtml(player.nombre)}</strong>
            <small>${escapeHtml(player.posicion)}</small>
          </span>
        </div>
        <select class="role">
          <option value="">No convocado</option>
          <option ${current.rol === 'Titular' ? 'selected' : ''}>Titular</option>
          <option ${current.rol === 'Suplente' ? 'selected' : ''}>Suplente</option>
        </select>
        <select class="position" aria-label="Posición en cancha">${positionOptions}</select>
        <input class="minute" type="number" min="1" max="120" placeholder="Min." value="${escapeHtml(current.minuto_cambio || '')}">
      </div>
    `;
  }).join('') || '<p class="muted">Esta selección no tiene jugadores registrados.</p>';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const data = Object.fromEntries(new FormData(form));
    const id = document.querySelector('#recordId').value;
    if (resource === 'alineaciones') {
      data.jugadores = [...document.querySelectorAll('.player-pick')]
        .filter((row) => row.querySelector('.role').value)
        .map((row) => ({
          id_jugador: Number(row.dataset.player),
          rol: row.querySelector('.role').value,
          posicion_cancha: row.querySelector('.position').value || null,
          minuto_cambio: row.querySelector('.minute').value || null
        }));
    }
    await (id ? api.put(`/${resource}/${id}`, data) : api.post(`/${resource}`, data));
    dialog.close();
    await loadTable();
    showNotice(flash, 'Operación realizada con éxito.', 'success');
  } catch (error) {
    showNotice(flash, error.message);
  }
});

document.querySelector('#tableBody').addEventListener('click', async (event) => {
  const editId = event.target.dataset.edit;
  const deleteId = event.target.dataset.delete;
  if (editId) return openForm(editId);
  if (deleteId && confirm('¿Deseas eliminar este registro?')) {
    try {
      await api.delete(`/${resource}/${deleteId}`);
      await loadTable();
      showNotice(flash, 'Registro eliminado.', 'success');
    } catch (error) {
      showNotice(flash, error.message);
    }
  }
});

document.querySelector('#newRecord').addEventListener('click', () => openForm());
document.querySelectorAll('.close-dialog').forEach((button) => button.addEventListener('click', () => dialog.close()));

document.querySelectorAll('.tabs button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.remove('active'));
  button.classList.add('active');
  resource = button.dataset.tab;
  loadTable();
}));

document.querySelector('#logout')?.addEventListener('click', async () => {
  await api.post('/admin/logout');
  location.href = '/login.html';
});

loadTable();
