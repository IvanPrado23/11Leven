const list = document.querySelector('#partidos');
const statusBox = document.querySelector('#status');

function matchCard(partido, alineaciones, resultados) {
  const teams = alineaciones.filter((item) => item.id_partido === partido.id_partido);
  const result = resultados.find((item) => item.id_partido === partido.id_partido);
  const displayTeams = teams.length ? teams.map((item) => ({nombre:item.seleccion_nombre,bandera:item.bandera})) : (result ? [{nombre:result.local,bandera:result.bandera_local},{nombre:result.visitante,bandera:result.bandera_visitante}] : []);
  const teamLine = (team) => `<span class="team-line">${team.bandera ? `<img class="team-flag" src="${escapeHtml(team.bandera)}" alt="">` : ''}<span>${escapeHtml(team.nombre)}</span></span>`;
  const hasScore = result?.finalizado && result.goles_local !== null && result.goles_visitante !== null;
  const labels = displayTeams.length === 2 ? `${teamLine(displayTeams[0])}${hasScore ? `<span class="score"><strong>${result.goles_local}</strong><b>–</b><strong>${result.goles_visitante}</strong></span>` : '<b>vs</b>'}${teamLine(displayTeams[1])}` : (displayTeams.length === 1 ? `${teamLine(displayTeams[0])}<b>vs</b><span>Rival por registrar</span>` : '<span>Equipos por confirmar</span>');
  const confirmed = teams.filter((item) => item.estado === 'Confirmada').length;
  return `<a class="match-card" href="partido.html?id=${partido.id_partido}"><div class="match-meta"><time>${escapeHtml(partido.fecha)} · ${escapeHtml(partido.hora)}</time><span>${escapeHtml(partido.estado_partido)}</span></div><div class="teams">${labels}</div><div class="match-footer"><span>${escapeHtml(partido.estadio)}</span><span class="badge ${confirmed === 2 ? 'confirmed' : ''}">${confirmed === 2 ? 'Alineaciones' : 'Pendientes'}</span></div></a>`;
}

function groupLetter(partido) { return partido.fase_torneo.match(/Grupo\s+([A-L])/i)?.[1]?.toUpperCase(); }

function renderGroups(partidos, alineaciones, resultados) {
  const groupMatches = partidos.filter(groupLetter);
  const groups = [...new Set(groupMatches.map(groupLetter))].sort();
  if (!groups.length) return '';
  return `<section class="tournament-block"><div class="tournament-title"><span class="eyebrow">Primera fase</span><h3>Partidos por grupos</h3></div><div class="group-tabs" role="tablist">${groups.map((group, index) => `<button class="group-tab ${index === 0 ? 'active' : ''}" data-group="${group}">Grupo ${group}</button>`).join('')}</div>${groups.map((group, index) => `<div class="group-panel ${index === 0 ? 'active' : ''}" data-panel="${group}"><div class="match-grid">${groupMatches.filter((item) => groupLetter(item) === group).map((item) => matchCard(item, alineaciones, resultados)).join('')}</div></div>`).join('')}</section>`;
}

function stageKey(value) {
  const stage = value.toLowerCase();
  if (stage.includes('dieciseis')) return 'Dieciseisavos';
  if (stage.includes('octavos')) return 'Octavos';
  if (stage.includes('cuartos')) return 'Cuartos';
  if (stage.includes('semi')) return 'Semifinales';
  if (stage.includes('tercer')) return 'Tercer puesto';
  if (stage === 'final') return 'Final';
  return null;
}

function renderBracket(partidos, alineaciones, resultados) {
  const stages = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinales', 'Tercer puesto', 'Final'];
  const knockout = partidos.filter((item) => stageKey(item.fase_torneo));
  if (!knockout.length) return '';
  return `<section class="tournament-block"><div class="tournament-title"><span class="eyebrow">Eliminación directa</span><h3>Cuadro del torneo</h3></div><div class="bracket">${stages.map((stage) => { const matches = knockout.filter((item) => stageKey(item.fase_torneo) === stage); return matches.length ? `<div class="bracket-round"><h4>${stage}</h4><div class="bracket-matches">${matches.map((item) => matchCard(item, alineaciones, resultados)).join('')}</div></div>` : ''; }).join('')}</div></section>`;
}

function renderOtherMatches(partidos, alineaciones, resultados) {
  const others = partidos.filter((item) => !groupLetter(item) && !stageKey(item.fase_torneo));
  if (!others.length) return '';
  return `<section class="tournament-block custom-matches"><div class="tournament-title"><span class="eyebrow">Demostración</span><h3>Partidos de prueba / Otros</h3><p>Partidos creados manualmente desde el panel de administración.</p></div><div class="match-grid">${others.map((item) => matchCard(item, alineaciones, resultados)).join('')}</div></section>`;
}

function bindGroupTabs() {
  document.querySelectorAll('.group-tab').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.group-tab').forEach((item) => item.classList.toggle('active', item === button));
    document.querySelectorAll('.group-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === button.dataset.group));
  }));
}

async function loadMatches() {
  statusBox.hidden = true;
  try {
    const [partidos, alineaciones, resultados] = await Promise.all([api.get('/partidos'), api.get('/alineaciones'), api.get('/resultados')]);
    if (!partidos.length) { list.innerHTML = '<div class="empty"><strong>Aún no hay partidos.</strong><span>Regístralos desde Administración.</span></div>'; return; }
    list.innerHTML = renderGroups(partidos, alineaciones, resultados) + renderBracket(partidos, alineaciones, resultados) + renderOtherMatches(partidos, alineaciones, resultados);
    bindGroupTabs();
  } catch (error) { list.innerHTML = ''; showNotice(statusBox, error.message); }
}

document.querySelector('#refresh').addEventListener('click', loadMatches);
loadMatches();
