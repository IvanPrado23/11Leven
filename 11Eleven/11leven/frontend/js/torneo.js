const params = new URLSearchParams(location.search);
let currentYear = Number(params.get('anio') || 2026);

const list = document.querySelector('#partidos');
const statusBox = document.querySelector('#status');
const heroBox = document.querySelector('#tournamentHero');
const pillsContainer = document.querySelector('#tournamentPills');
const navCurrentTournament = document.querySelector('#navCurrentTournament');

function matchCard(partido, alineaciones, resultados) {
  const teams = alineaciones.filter((item) => item.id_partido === partido.id_partido);
  const result = resultados.find((item) => item.id_partido === partido.id_partido || (item.numero_partido && item.numero_partido === partido.id_partido));
  
  const displayTeams = teams.length
    ? teams.map((item) => ({ nombre: item.seleccion_nombre, bandera: item.bandera }))
    : (result ? [{ nombre: result.local, bandera: result.bandera_local }, { nombre: result.visitante, bandera: result.bandera_visitante }] : []);

  const teamLine = (team) => `
    <span class="team-line">
      ${team.bandera ? `<img class="team-flag" src="${escapeHtml(team.bandera)}" alt="">` : ''}
      <span>${escapeHtml(team.nombre)}</span>
    </span>
  `;

  const hasScore = result?.finalizado && result.goles_local !== null && result.goles_visitante !== null;
  const labels = displayTeams.length === 2
    ? `${teamLine(displayTeams[0])}${hasScore ? `<span class="score"><strong>${result.goles_local}</strong><b>–</b><strong>${result.goles_visitante}</strong></span>` : '<b>vs</b>'}${teamLine(displayTeams[1])}`
    : (displayTeams.length === 1 ? `${teamLine(displayTeams[0])}<b>vs</b><span>Rival por registrar</span>` : '<span>Equipos por confirmar</span>');

  const confirmed = teams.filter((item) => item.estado === 'Confirmada').length;

  return `
    <a class="match-card" href="partido.html?id=${partido.id_partido}">
      <div class="match-meta">
        <time>${escapeHtml(partido.fecha)} · ${escapeHtml(partido.hora)}</time>
        <span>${escapeHtml(partido.estado_partido)}</span>
      </div>
      <div class="teams">${labels}</div>
      <div class="match-footer">
        <span>${escapeHtml(partido.estadio)}</span>
        <span class="badge ${confirmed === 2 ? 'confirmed' : ''}">${confirmed === 2 ? 'Alineaciones' : (confirmed === 1 ? '1 Alineación' : 'Pendiente')}</span>
      </div>
    </a>
  `;
}

function groupLetter(partido) {
  return partido.fase_torneo.match(/Grupo\s+([A-L])/i)?.[1]?.toUpperCase();
}

function renderGroups(partidos, alineaciones, resultados) {
  const groupMatches = partidos.filter(groupLetter);
  const groups = [...new Set(groupMatches.map(groupLetter))].sort();
  if (!groups.length) return '';

  return `
    <section class="tournament-block">
      <div class="tournament-title">
        <span class="eyebrow">Primera fase</span>
        <h3>Partidos por grupos</h3>
        <p>Selecciona un grupo para consultar los enfrentamientos de cada zona.</p>
      </div>
      <div class="group-tabs" role="tablist">
        ${groups.map((group, index) => `
          <button class="group-tab ${index === 0 ? 'active' : ''}" data-group="${group}">
            Grupo ${group}
          </button>
        `).join('')}
      </div>
      ${groups.map((group, index) => `
        <div class="group-panel ${index === 0 ? 'active' : ''}" data-panel="${group}">
          <div class="match-grid">
            ${groupMatches.filter((item) => groupLetter(item) === group).map((item) => matchCard(item, alineaciones, resultados)).join('')}
          </div>
        </div>
      `).join('')}
    </section>
  `;
}

function stageKey(value) {
  const stage = String(value || '').toLowerCase();
  if (stage.includes('dieciseis')) return 'Dieciseisavos';
  if (stage.includes('octavos')) return 'Octavos de final';
  if (stage.includes('cuartos')) return 'Cuartos de final';
  if (stage.includes('semi')) return 'Semifinales';
  if (stage.includes('tercer')) return 'Tercer puesto';
  if (stage.includes('final') && !stage.includes('semi') && !stage.includes('octavos') && !stage.includes('cuartos')) return 'Gran Final';
  return null;
}

function renderBracket(partidos, alineaciones, resultados) {
  const stages = ['Dieciseisavos', 'Octavos de final', 'Cuartos de final', 'Semifinales', 'Tercer puesto', 'Gran Final'];
  const knockout = partidos.filter((item) => stageKey(item.fase_torneo));
  if (!knockout.length) return '';

  return `
    <section class="tournament-block">
      <div class="tournament-title">
        <span class="eyebrow">Eliminación directa</span>
        <h3>Cuadro de la fase final</h3>
        <p>Panorama completo de las etapas eliminatorias hacia la final.</p>
      </div>
      <div class="bracket">
        ${stages.map((stage) => {
          const matches = knockout.filter((item) => stageKey(item.fase_torneo) === stage);
          return matches.length ? `
            <div class="bracket-round">
              <h4>${stage}</h4>
              <div class="bracket-matches">
                ${matches.map((item) => matchCard(item, alineaciones, resultados)).join('')}
              </div>
            </div>
          ` : '';
        }).join('')}
      </div>
    </section>
  `;
}

function renderTeamsGrid(selecciones) {
  if (!selecciones.length) return '';
  return `
    <section class="tournament-block">
      <div class="tournament-title">
        <span class="eyebrow">Participantes</span>
        <h3>Selecciones clasificadas (${selecciones.length})</h3>
        <p>Delegaciones oficiales que compitieron en esta edición mundialista.</p>
      </div>
      <div class="teams-view-grid">
        ${selecciones.map((s) => `
          <div class="team-card">
            ${s.bandera ? `<img src="${escapeHtml(s.bandera)}" alt="${escapeHtml(s.nombre)}">` : '🏳️'}
            <div>
              <strong>${escapeHtml(s.nombre)}</strong>
              <span>Grupo ${escapeHtml(s.grupo_fifa)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderEstadisticas(oficial) {
  if (!oficial) return '';

  return `
    <section class="tournament-block">
      <div class="tournament-title">
        <span class="eyebrow">Análisis</span>
        <h3>Estadísticas Oficiales del Torneo</h3>
        <p>Líderes históricos y rendimiento oficial de la FIFA.</p>
      </div>
      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-top: 1rem;">
        
        <div class="stat-card" style="background:#f8f9fa; padding:1.5rem; border-radius:12px;">
          <h4>Top 10 Goleadores</h4>
          <ol style="margin: 0; padding-left: 1.5rem; display:flex; flex-direction:column; gap:0.5rem; margin-top:1rem;">
            ${(oficial.top_10_goleadores || []).map(jugador => `
              <li style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eaeaea; padding-bottom:4px;">
                <strong>${escapeHtml(jugador.nombre)}</strong> 
                <span class="badge" style="background:#0055a4; color:white; padding:0.2rem 0.6rem; border-radius:1rem;">${jugador.valor} Goles</span>
              </li>
            `).join('')}
          </ol>
        </div>

        <div class="stat-card" style="background:#f8f9fa; padding:1.5rem; border-radius:12px;">
          <h4>Top 10 Asistidores</h4>
          <ol style="margin: 0; padding-left: 1.5rem; display:flex; flex-direction:column; gap:0.5rem; margin-top:1rem;">
            ${(oficial.top_10_asistidores || []).map(jugador => `
              <li style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eaeaea; padding-bottom:4px;">
                <strong>${escapeHtml(jugador.nombre)}</strong> 
                <span class="badge" style="background:#007a33; color:white; padding:0.2rem 0.6rem; border-radius:1rem;">${jugador.valor} Asist.</span>
              </li>
            `).join('')}
          </ol>
        </div>

        <div class="stat-card" style="background:#f8f9fa; padding:1.5rem; border-radius:12px;">
          <h4>Top 10 Regateadores</h4>
          <ol style="margin: 0; padding-left: 1.5rem; display:flex; flex-direction:column; gap:0.5rem; margin-top:1rem;">
            ${(oficial.top_10_regateadores || []).map(jugador => `
              <li style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eaeaea; padding-bottom:4px;">
                <strong>${escapeHtml(jugador.nombre)}</strong> 
                <span class="badge" style="background:#e03a3e; color:white; padding:0.2rem 0.6rem; border-radius:1rem;">${jugador.valor} Regates</span>
              </li>
            `).join('')}
          </ol>
        </div>

        <div class="stat-card" style="background:#f8f9fa; padding:1.5rem; border-radius:12px;">
          <h4>Promedio de Goles (Top 10 Equipos)</h4>
          <ol style="margin: 0; padding-left: 1.5rem; display:flex; flex-direction:column; gap:0.5rem; margin-top:1rem;">
            ${(oficial.promedio_goles_equipos || []).map(eq => `
              <li style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eaeaea; padding-bottom:4px;">
                <strong>${escapeHtml(eq.equipo)}</strong> 
                <span class="badge" style="background:#4a4a4a; color:white; padding:0.2rem 0.6rem; border-radius:1rem;">${eq.promedio_goles} / partido</span>
              </li>
            `).join('')}
          </ol>
        </div>

      </div>
    </section>
  `;
}

function bindGroupTabs() {
  document.querySelectorAll('.group-tab').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('.group-tab').forEach((item) => item.classList.toggle('active', item === button));
    document.querySelectorAll('.group-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === button.dataset.group));
  }));
}

function renderHero(torneo) {
  document.title = `${torneo.nombre} | 11Leven`;
  if (navCurrentTournament) navCurrentTournament.textContent = `Mundial ${torneo.anio}`;

  heroBox.innerHTML = `
    <div class="t-hero-content">
      <span class="eyebrow">Edición FIFA ${torneo.anio}</span>
      <h1>${escapeHtml(torneo.nombre)}</h1>
      <p>${escapeHtml(torneo.descripcion || '')}</p>
      <div class="t-hero-badges">
        <div class="t-hero-tag">📍 Sede: ${escapeHtml(torneo.pais_sede)}</div>
        ${torneo.campeon ? `<div class="t-hero-tag">🏆 Campeón: ${escapeHtml(torneo.campeon)}</div>` : ''}
        ${torneo.subcampeon ? `<div class="t-hero-tag">🥈 Subcampeón: ${escapeHtml(torneo.subcampeon)}</div>` : ''}
        <div class="t-hero-tag">⚽ ${escapeHtml(torneo.cantidad_partidos)} Partidos</div>
        <div class="t-hero-tag">👥 ${escapeHtml(torneo.cantidad_equipos)} Selecciones</div>
      </div>
    </div>
  `;
}

function renderPills(torneos) {
  const sorted = [...torneos].sort((a, b) => b.anio - a.anio);
  pillsContainer.innerHTML = sorted.map((t) => `
    <a class="t-pill ${t.anio === currentYear ? 'active' : ''}" href="torneo.html?anio=${t.anio}">
      ${t.anio} ${t.campeon ? `🏆` : `🌟`}
    </a>
  `).join('');
}

async function loadTournamentData() {
  statusBox.hidden = true;
  try {
    const torneos = await api.get('/torneos');
    renderPills(torneos);

    const activeTorneo = torneos.find((t) => t.anio === currentYear) || torneos[0];
    if (!activeTorneo) throw new Error('No se encontró información del torneo solicitado.');
    currentYear = activeTorneo.anio;
    renderHero(activeTorneo);

    const [partidos, alineaciones, resultados, selecciones, oficialResponse] = await Promise.all([
      api.get(`/partidos?anio=${currentYear}`),
      api.get(`/alineaciones?anio=${currentYear}`),
      api.get(`/resultados?anio=${currentYear}`),
      api.get(`/selecciones?anio=${currentYear}`),
      fetch(`/api/estadisticas/oficiales?anio=${currentYear}`).then(res => res.json()).catch(() => null)
    ]);
    
    const statsOficiales = oficialResponse && !oficialResponse.error ? oficialResponse : null;

    if (!partidos.length) {
      list.innerHTML = '<div class="empty"><strong>No hay partidos para esta edición.</strong><span>Revisa la población del sistema.</span></div>';
      return;
    }

    list.innerHTML = renderGroups(partidos, alineaciones, resultados) +
                     renderBracket(partidos, alineaciones, resultados) +
                     renderEstadisticas(statsOficiales) +
                     renderTeamsGrid(selecciones);

    bindGroupTabs();
  } catch (error) {
    list.innerHTML = '';
    showNotice(statusBox, error.message);
  }
}

loadTournamentData();
