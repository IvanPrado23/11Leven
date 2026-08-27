const db = require('../config/db');

// Obtener estadísticas de jugadores por torneo
// Permite ordenar por: goles, asistencias o regates (por defecto goles)
exports.getJugadoresStats = async (req, res) => {
  try {
    const { id_torneo } = req.query;
    let sortBy = req.query.sortBy || 'goles'; // goles, asistencias, regates
    if (!['goles', 'asistencias', 'regates'].includes(sortBy)) {
      sortBy = 'goles';
    }

    if (!id_torneo) {
      return res.status(400).json({ error: 'Se requiere id_torneo' });
    }

    // Since aj lacks id_partido, we use count of aj rows (as it represents 1 match appearance)
    const query = `
      SELECT 
        j.id_jugador, 
        j.nombre, 
        s.nombre as seleccion, 
        s.bandera,
        SUM(aj.goles) as goles, 
        SUM(aj.asistencias) as asistencias, 
        SUM(aj.regates) as regates,
        COUNT(aj.id_alineacion) as partidos_jugados
      FROM jugador j
      JOIN seleccion s ON j.id_seleccion = s.id_seleccion
      JOIN alineacion_jugador aj ON aj.id_jugador = j.id_jugador
      WHERE s.id_torneo = ?
      GROUP BY j.id_jugador, j.nombre, s.nombre, s.bandera
      HAVING ${sortBy} > 0
      ORDER BY ${sortBy} DESC
      LIMIT 15
    `;

    const [rows] = await db.query(query, [id_torneo]);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching player stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Obtener estadísticas de equipos por torneo
exports.getEquiposStats = async (req, res) => {
  try {
    const { id_torneo } = req.query;
    if (!id_torneo) {
      return res.status(400).json({ error: 'Se requiere id_torneo' });
    }

    const query = `
      SELECT 
        s.id_seleccion,
        s.nombre,
        s.bandera,
        COUNT(a.id_alineacion) as partidos_jugados,
        SUM(a.goles) as total_goles,
        CAST(SUM(a.goles) / COUNT(a.id_alineacion) AS DECIMAL(10,2)) as promedio_gol,
        SUM(CASE 
              WHEN a.goles > (
                  SELECT a2.goles 
                  FROM alineacion a2 
                  WHERE a2.id_partido = a.id_partido 
                  AND a2.id_alineacion != a.id_alineacion
                  LIMIT 1
              ) THEN 1 
              ELSE 0 
            END) as victorias
      FROM seleccion s
      JOIN alineacion a ON a.id_seleccion = s.id_seleccion
      WHERE s.id_torneo = ?
      GROUP BY s.id_seleccion, s.nombre, s.bandera
      ORDER BY promedio_gol DESC, victorias DESC
    `;

    const [rows] = await db.query(query, [id_torneo]);

    const equiposStats = rows.map(r => ({
      ...r,
      win_rate: r.partidos_jugados > 0 ? ((r.victorias / r.partidos_jugados) * 100).toFixed(1) : 0
    }));

    res.json(equiposStats);
  } catch (error) {
    console.error('Error fetching team stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

exports.getOfficialStats = async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const { anio } = req.query;
    
    if (!anio) {
      return res.status(400).json({ error: 'Se requiere el año (anio) del torneo' });
    }

    const officialStatsPath = path.join(__dirname, '..', 'data', 'officialStats.json');
    if (fs.existsSync(officialStatsPath)) {
      const data = JSON.parse(fs.readFileSync(officialStatsPath, 'utf8'));
      const stats = data.find(d => d.edicion === Number(anio));
      if (stats) {
        return res.json(stats);
      }
    }
    res.status(404).json({ error: 'Estadísticas oficiales no encontradas para este torneo' });
  } catch (error) {
    console.error('Error fetching official stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
