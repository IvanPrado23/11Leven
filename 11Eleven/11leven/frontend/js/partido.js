const params = new URLSearchParams(location.search);
const id = params.get('id');
const statusBox = document.querySelector('#status');

const rolePatterns = {
  goalkeeper: /portero|arquero|goalkeeper/i,
  defender: /defensa|central|lateral|carrilero|back/i,
  midfielder: /medio|pivote|volante|interior|enganche/i,
  forward: /delantero|extremo|punta|atacante|forward/i
};

function shortName(name) {
  const parts = String(name || '').trim().split(/\s+/);
  return parts.length > 1 ? parts.at(-1) : parts[0];
}

function formationLines(formation) {
  const lines = String(formation || '').match(/\d+/g)?.map(Number) || [];
  return lines.reduce((sum, value) => sum + value, 0) === 10 ? lines : [4, 3, 3];
}

function playerCategory(player) {
  const position = `${player.posicion_cancha || ''} ${player.posicion || ''}`;
  return Object.entries(rolePatterns).find(([, pattern]) => pattern.test(position))?.[0] || 'unknown';
}

function distributeStarters(starters, formation) {
  const lines = formationLines(formation);
  const available = [...starters];
  const goalkeeperIndex = available.findIndex((player) => playerCategory(player) === 'goalkeeper');
  const goalkeeper = available.splice(goalkeeperIndex >= 0 ? goalkeeperIndex : 0, 1)[0];
  const categoryForLine = (index) => index === 0 ? 'defender' : index === lines.length - 1 ? 'forward' : 'midfielder';
  const rows = lines.map((size, index) => {
    const preferred = categoryForLine(index);
    const row = [];
    while (row.length < size) {
      const preferredIndex = available.findIndex((player) => playerCategory(player) === preferred);
      row.push(available.splice(preferredIndex >= 0 ? preferredIndex : 0, 1)[0]);
    }
    return row.filter(Boolean);
  });
  return goalkeeper ? [[goalkeeper], ...rows] : rows;
}

function pitchPlayer(player, rowIndex, playerIndex, rowSize, totalRows) {
  const x = ((playerIndex + 1) / (rowSize + 1)) * 100;
  const y = 91 - (rowIndex / Math.max(totalRows - 1, 1)) * 76;
  return `<div class="pitch-player" style="--x:${x}%;--y:${y}%"><span>${escapeHtml(player.dorsal)}</span><b>${escapeHtml(shortName(player.nombre))}</b></div>`;
}

function renderPitch(starters, formation, team) {
  const rows = distributeStarters(starters, formation);
  const players = rows.flatMap((row, rowIndex) => row.map((player, playerIndex) => pitchPlayer(player, rowIndex, playerIndex, row.length, rows.length))).join('');
  return `<div class="pitch" role="img" aria-label="Formación ${escapeHtml(formation)} de ${escapeHtml(team)}"><div class="pitch-markings"><span class="goal goal-top"></span><span class="penalty penalty-top"></span><span class="center-circle"></span><span class="halfway"></span><span class="penalty penalty-bottom"></span><span class="goal goal-bottom"></span></div>${players}</div>`;
}

function substituteRow(player) {
  return `<li><b>${escapeHtml(player.dorsal)}</b><span><strong>${escapeHtml(player.nombre)}</strong><small>${escapeHtml(player.posicion_cancha || player.posicion || '')}</small></span>${player.minuto_cambio ? `<em>${escapeHtml(player.minuto_cambio)}'</em>` : ''}</li>`;
}

function lineupCard(lineup) {
  const starters = lineup.jugadores.filter((player) => player.rol === 'Titular');
  const substitutes = lineup.jugadores.filter((player) => player.rol === 'Suplente');
  const pitch = starters.length ? renderPitch(starters, lineup.formacion_tactica, lineup.seleccion_nombre) : '<div class="lineup-unavailable">Alineación aún no disponible</div>';
  return `<article class="lineup-card"><header><div><span class="badge ${lineup.estado === 'Confirmada' ? 'confirmed' : ''}">${escapeHtml(lineup.estado)}</span><h2>${escapeHtml(lineup.seleccion_nombre)}</h2></div>${lineup.bandera ? `<img src="${escapeHtml(lineup.bandera)}" alt="Bandera de ${escapeHtml(lineup.seleccion_nombre)}">` : ''}</header><div class="formation"><span>Formación táctica</span><strong>${escapeHtml(lineup.formacion_tactica)}</strong></div><div class="pitch-wrap">${pitch}</div><div class="squad substitutes"><section><h3>Suplentes <span>${substitutes.length}</span></h3><ol>${substitutes.map(substituteRow).join('') || '<li>No hay suplentes registrados</li>'}</ol></section></div><footer><strong>Fuente:</strong> ${escapeHtml(lineup.fuente)} · ${escapeHtml(lineup.fecha_publicacion)}</footer></article>`;
}

async function load() {
  if (!id) return showNotice(statusBox, 'No se indicó un partido.');
  try {
    const [partido, summaries] = await Promise.all([api.get(`/partidos/${id}`), api.get(`/alineaciones?id_partido=${id}`)]);
    const anio = partido.anio_torneo || 2026;

    const backLink = document.querySelector('#backLink');
    if (backLink) {
      backLink.href = `torneo.html?anio=${anio}`;
      backLink.textContent = `← Volver al Mundial ${anio}`;
    }
    const navTournament = document.querySelector('#navTournament');
    if (navTournament) {
      navTournament.href = `torneo.html?anio=${anio}`;
      navTournament.textContent = `Mundial ${anio}`;
    }

    document.title = `${partido.nombre_torneo || 'Mundial'} · ${partido.fase_torneo} | 11Leven`;

    document.querySelector('#matchHeader').innerHTML = `
      <span class="eyebrow">${escapeHtml(partido.nombre_torneo || 'Copa Mundial')} · ${escapeHtml(partido.fase_torneo)}</span>
      <h1>${escapeHtml(partido.fecha)} <em>·</em> ${escapeHtml(partido.hora)}</h1>
      <p>${escapeHtml(partido.estadio)} · Estado: ${escapeHtml(partido.estado_partido)}</p>
    `;
    const details = await Promise.all(summaries.map((alineacion) => api.get(`/alineaciones/${alineacion.id_alineacion}`)));
    document.querySelector('#lineups').innerHTML = details.length ? details.map(lineupCard).join('') : '<div class="empty"><strong>Alineación aún no disponible</strong><span>Las alineaciones se publicarán cuando exista información oficial.</span></div>';
  } catch (error) { showNotice(statusBox, error.message); }
}

load();
