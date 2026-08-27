const container = document.querySelector('#tournamentsList');
const statusBox = document.querySelector('#hubStatus');

function tournamentCard(t) {
  const is2026 = t.anio === 2026;
  const isUpcoming = !t.campeon;

  return `
    <article class="tournament-card ${is2026 ? 'featured' : ''}">
      <div>
        <div class="t-card-header">
          <div class="t-year-badge">
            ${escapeHtml(t.anio)}
            <small>FIFA World Cup</small>
          </div>
          <span class="t-badge ${isUpcoming ? 'upcoming' : ''}">
            ${isUpcoming ? 'Próxima Edición' : 'Finalizado'}
          </span>
        </div>

        <div class="t-card-body">
          <h3>${escapeHtml(t.nombre)}</h3>
          <div class="t-host">
            <span>📍 ${escapeHtml(t.pais_sede)}</span>
          </div>
          <p class="t-desc">${escapeHtml(t.descripcion || 'Edición oficial del torneo mundial de selecciones de la FIFA.')}</p>
        </div>

        ${t.campeon ? `
          <div class="t-podium">
            <div class="t-podium-row">
              <span>🏆 Campeón:</span>
              <strong>${escapeHtml(t.campeon)}</strong>
            </div>
            ${t.subcampeon ? `
              <div class="t-podium-row">
                <span>🥈 Subcampeón:</span>
                <strong>${escapeHtml(t.subcampeon)}</strong>
              </div>
            ` : ''}
          </div>
        ` : `
          <div class="t-podium">
            <div class="t-podium-row">
              <span>🌟 Formato:</span>
              <strong>48 Selecciones / 12 Grupos</strong>
            </div>
          </div>
        `}
      </div>

      <div>
        <div class="t-metrics">
          <span>👥 ${escapeHtml(t.cantidad_equipos)} Equipos</span>
          <span>⚽ ${escapeHtml(t.cantidad_partidos)} Partidos</span>
        </div>

        <a class="t-btn" href="torneo.html?anio=${escapeHtml(t.anio)}">
          Explorar Mundial ${escapeHtml(t.anio)} →
        </a>
      </div>
    </article>
  `;
}

async function loadTournaments() {
  statusBox.hidden = true;
  try {
    const torneos = await api.get('/torneos');
    if (!torneos.length) {
      container.innerHTML = '<div class="empty"><strong>No hay mundiales registrados.</strong><span>Ejecuta la siembra desde la base de datos.</span></div>';
      return;
    }

    // Ordenar de más reciente (2026) a más antiguo (2002) o cronológico
    const sorted = [...torneos].sort((a, b) => b.anio - a.anio);
    container.innerHTML = sorted.map(tournamentCard).join('');
  } catch (error) {
    container.innerHTML = '';
    showNotice(statusBox, error.message);
  }
}

document.querySelector('#refreshHub')?.addEventListener('click', loadTournaments);
loadTournaments();
