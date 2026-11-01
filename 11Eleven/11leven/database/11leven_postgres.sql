-- =============================================================================
-- 11LEVEN - ESQUEMA RELACIONAL PARA POSTGRESQL 18 (MULTI-TORNEO)
-- Incluye Tablas, Vistas, Funciones/Procedimientos Almacenados (PL/pgSQL) y Triggers
-- Proyecto: 11Leven - Plataforma de Alineaciones Oficiales de la Copa Mundial
-- Universidad Distrital Francisco José de Caldas - Bases de Datos
-- =============================================================================

-- =============================================================================
-- LIMPIEZA DEL ESQUEMA ANTERIOR
-- =============================================================================
DROP VIEW IF EXISTS vista_administrador_datos CASCADE;
DROP VIEW IF EXISTS vista_usuario_final CASCADE;
DROP TABLE IF EXISTS historial_alineacion CASCADE;
DROP TABLE IF EXISTS notificacion CASCADE;
DROP TABLE IF EXISTS alineacion_jugador CASCADE;
DROP TABLE IF EXISTS alineacion CASCADE;
DROP TABLE IF EXISTS usuario CASCADE;
DROP TABLE IF EXISTS jugador CASCADE;
DROP TABLE IF EXISTS seleccion CASCADE;
DROP TABLE IF EXISTS partido CASCADE;
DROP TABLE IF EXISTS torneo CASCADE;

-- =============================================================================
-- TABLA TORNEO
-- =============================================================================
CREATE TABLE torneo (
  id_torneo SERIAL PRIMARY KEY,
  anio SMALLINT NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  pais_sede VARCHAR(120) NOT NULL,
  logo_url VARCHAR(255) NULL,
  campeon VARCHAR(80) NULL,
  subcampeon VARCHAR(80) NULL,
  cantidad_equipos SMALLINT NOT NULL,
  cantidad_partidos SMALLINT NOT NULL,
  descripcion VARCHAR(255) NULL,
  CONSTRAINT chk_torneo_anio CHECK (anio BETWEEN 1930 AND 2100)
);

-- =============================================================================
-- TABLA PARTIDO
-- =============================================================================
CREATE TABLE partido (
  id_partido SERIAL PRIMARY KEY,
  id_torneo INTEGER NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estadio VARCHAR(100) NOT NULL,
  fase_torneo VARCHAR(50) NOT NULL,
  estado_partido VARCHAR(20) NOT NULL,
  CONSTRAINT fk_partido_torneo FOREIGN KEY (id_torneo) REFERENCES torneo(id_torneo) ON DELETE CASCADE,
  CONSTRAINT chk_partido_estado CHECK (estado_partido IN ('Programado','En curso','Finalizado','Suspendido'))
);
CREATE INDEX idx_partido_torneo ON partido (id_torneo);
CREATE INDEX idx_partido_fecha ON partido (fecha);

-- =============================================================================
-- TABLA SELECCION
-- =============================================================================
CREATE TABLE seleccion (
  id_seleccion SERIAL PRIMARY KEY,
  id_torneo INTEGER NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  bandera VARCHAR(255) NULL,
  grupo_fifa CHAR(1) NOT NULL,
  CONSTRAINT fk_seleccion_torneo FOREIGN KEY (id_torneo) REFERENCES torneo(id_torneo) ON DELETE CASCADE,
  CONSTRAINT uq_seleccion_nombre_torneo UNIQUE (nombre, id_torneo)
);
CREATE INDEX idx_seleccion_torneo ON seleccion (id_torneo);

-- =============================================================================
-- TABLA JUGADOR
-- =============================================================================
CREATE TABLE jugador (
  id_jugador SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  dorsal SMALLINT NOT NULL,
  posicion VARCHAR(30) NOT NULL,
  id_seleccion INTEGER NOT NULL,
  CONSTRAINT fk_jugador_seleccion FOREIGN KEY (id_seleccion) REFERENCES seleccion(id_seleccion) ON DELETE CASCADE,
  CONSTRAINT uq_jugador_dorsal_seleccion UNIQUE (id_seleccion, dorsal),
  CONSTRAINT chk_jugador_dorsal CHECK (dorsal BETWEEN 1 AND 99)
);
CREATE INDEX idx_jugador_seleccion ON jugador (id_seleccion);

-- =============================================================================
-- TABLA USUARIO
-- =============================================================================
CREATE TABLE usuario (
  id_usuario SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  idioma VARCHAR(30) NOT NULL,
  notificaciones BOOLEAN NOT NULL,
  CONSTRAINT uq_usuario_correo UNIQUE (correo)
);

-- =============================================================================
-- TABLA ALINEACION
-- =============================================================================
CREATE TABLE alineacion (
  id_alineacion SERIAL PRIMARY KEY,
  id_partido INTEGER NOT NULL,
  id_seleccion INTEGER NOT NULL,
  formacion_tactica VARCHAR(20) NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  fuente VARCHAR(150) NOT NULL,
  fecha_publicacion TIMESTAMP NOT NULL,
  estado VARCHAR(20) NOT NULL,
  goles SMALLINT DEFAULT 0,
  CONSTRAINT fk_alineacion_partido FOREIGN KEY (id_partido) REFERENCES partido(id_partido) ON DELETE CASCADE,
  CONSTRAINT fk_alineacion_seleccion FOREIGN KEY (id_seleccion) REFERENCES seleccion(id_seleccion) ON DELETE CASCADE,
  CONSTRAINT uq_alineacion_partido_seleccion UNIQUE (id_partido, id_seleccion),
  CONSTRAINT chk_alineacion_estado CHECK (estado IN ('Probable','Confirmada')),
  CONSTRAINT chk_alineacion_tipo CHECK (tipo IN ('Titular','Alternativa'))
);
CREATE INDEX idx_alineacion_estado ON alineacion (estado);
CREATE INDEX idx_alineacion_partido ON alineacion (id_partido);
CREATE INDEX idx_alineacion_seleccion ON alineacion (id_seleccion);

-- =============================================================================
-- TABLA ASOCIATIVA ALINEACION_JUGADOR
-- =============================================================================
CREATE TABLE alineacion_jugador (
  id_alineacion INTEGER NOT NULL,
  id_jugador INTEGER NOT NULL,
  rol VARCHAR(15) NOT NULL,
  posicion_cancha VARCHAR(30) NULL,
  minuto_cambio SMALLINT NULL,
  goles SMALLINT DEFAULT 0,
  asistencias SMALLINT DEFAULT 0,
  regates SMALLINT DEFAULT 0,
  PRIMARY KEY (id_alineacion, id_jugador),
  CONSTRAINT fk_aj_alineacion FOREIGN KEY (id_alineacion) REFERENCES alineacion(id_alineacion) ON DELETE CASCADE,
  CONSTRAINT fk_aj_jugador FOREIGN KEY (id_jugador) REFERENCES jugador(id_jugador) ON DELETE CASCADE,
  CONSTRAINT chk_aj_rol CHECK (rol IN ('Titular','Suplente')),
  CONSTRAINT chk_aj_minuto_solo_suplente CHECK (minuto_cambio IS NULL OR rol='Suplente'),
  CONSTRAINT chk_aj_minuto_rango CHECK (minuto_cambio IS NULL OR minuto_cambio BETWEEN 1 AND 120)
);
CREATE INDEX idx_aj_jugador ON alineacion_jugador (id_jugador);

-- =============================================================================
-- TABLA NOTIFICACION
-- =============================================================================
CREATE TABLE notificacion (
  id_notificacion SERIAL PRIMARY KEY,
  fecha_envio TIMESTAMP NOT NULL,
  estado VARCHAR(20) NOT NULL,
  id_usuario INTEGER NOT NULL,
  id_alineacion INTEGER NOT NULL,
  CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_notificacion_alineacion FOREIGN KEY (id_alineacion) REFERENCES alineacion(id_alineacion) ON DELETE CASCADE,
  CONSTRAINT chk_notificacion_estado CHECK (estado IN ('Pendiente','Enviada','Fallida'))
);

-- =============================================================================
-- TABLA HISTORIAL_ALINEACION (Objetivo 1.4 del documento)
-- =============================================================================
CREATE TABLE historial_alineacion (
  id_historial SERIAL PRIMARY KEY,
  id_alineacion INTEGER NOT NULL,
  id_partido INTEGER NOT NULL,
  id_seleccion INTEGER NOT NULL,
  formacion_anterior VARCHAR(20) NULL,
  formacion_nueva VARCHAR(20) NOT NULL,
  estado_anterior VARCHAR(20) NULL,
  estado_nuevo VARCHAR(20) NOT NULL,
  fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  motivo_cambio VARCHAR(255) DEFAULT 'Actualización de alineación',
  CONSTRAINT fk_ha_alineacion FOREIGN KEY (id_alineacion) REFERENCES alineacion(id_alineacion) ON DELETE CASCADE,
  CONSTRAINT fk_ha_partido FOREIGN KEY (id_partido) REFERENCES partido(id_partido) ON DELETE CASCADE,
  CONSTRAINT fk_ha_seleccion FOREIGN KEY (id_seleccion) REFERENCES seleccion(id_seleccion) ON DELETE CASCADE
);
CREATE INDEX idx_ha_alineacion ON historial_alineacion (id_alineacion);
CREATE INDEX idx_ha_seleccion ON historial_alineacion (id_seleccion);

-- =============================================================================
-- VISTAS DE USUARIO (Documento numeral 3.3.2.1)
-- =============================================================================
CREATE VIEW vista_administrador_datos AS
SELECT t.id_torneo, t.anio AS anio_torneo, t.nombre AS nombre_torneo,
 p.id_partido, p.fecha AS fecha_partido, p.hora AS hora_partido, p.estadio, p.fase_torneo, p.estado_partido,
 a.id_alineacion, a.formacion_tactica, a.tipo AS tipo_alineacion, a.fuente, a.fecha_publicacion, a.estado AS estado_alineacion, a.goles AS goles_equipo,
 s.id_seleccion, s.nombre AS nombre_seleccion, s.grupo_fifa, s.bandera,
 j.id_jugador, j.nombre AS nombre_jugador, j.dorsal, j.posicion AS posicion_habitual,
 aj.goles AS goles_jugador, aj.asistencias, aj.regates
FROM torneo t JOIN partido p ON p.id_torneo=t.id_torneo
JOIN alineacion a ON a.id_partido=p.id_partido
JOIN seleccion s ON s.id_seleccion=a.id_seleccion AND s.id_torneo=t.id_torneo
JOIN alineacion_jugador aj ON aj.id_alineacion=a.id_alineacion
JOIN jugador j ON j.id_jugador=aj.id_jugador AND j.id_seleccion=s.id_seleccion;

CREATE VIEW vista_usuario_final AS
SELECT t.id_torneo, t.anio AS anio_torneo, t.nombre AS nombre_torneo,
 p.id_partido, p.fecha AS fecha_partido, p.hora AS hora_partido, p.estadio, p.fase_torneo, p.estado_partido,
 a.id_alineacion, a.formacion_tactica, a.tipo AS tipo_alineacion, a.estado AS estado_alineacion, a.goles AS goles_equipo,
 s.id_seleccion, s.nombre AS nombre_seleccion, s.grupo_fifa, s.bandera,
 j.id_jugador, j.nombre AS nombre_jugador, j.dorsal, j.posicion AS posicion_habitual,
 aj.goles AS goles_jugador, aj.asistencias, aj.regates
FROM torneo t JOIN partido p ON p.id_torneo=t.id_torneo
JOIN alineacion a ON a.id_partido=p.id_partido
JOIN seleccion s ON s.id_seleccion=a.id_seleccion AND s.id_torneo=t.id_torneo
JOIN alineacion_jugador aj ON aj.id_alineacion=a.id_alineacion
JOIN jugador j ON j.id_jugador=aj.id_jugador AND j.id_seleccion=s.id_seleccion;

-- =============================================================================
-- PROCEDIMIENTOS Y FUNCIONES ALMACENADAS: TORNEO (CRUD)
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_listar_torneos()
RETURNS SETOF torneo
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT * FROM torneo ORDER BY anio ASC;
END;
$$;

CREATE OR REPLACE FUNCTION sp_obtener_torneo(p_param TEXT)
RETURNS SETOF torneo
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM torneo
  WHERE id_torneo::TEXT = p_param OR anio::TEXT = p_param
  LIMIT 1;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_crear_torneo(
  IN p_anio SMALLINT,
  IN p_nombre VARCHAR(100),
  IN p_pais_sede VARCHAR(120),
  IN p_logo_url VARCHAR(255),
  IN p_campeon VARCHAR(80),
  IN p_subcampeon VARCHAR(80),
  IN p_cantidad_equipos SMALLINT,
  IN p_cantidad_partidos SMALLINT,
  IN p_descripcion VARCHAR(255),
  INOUT p_id_torneo INTEGER DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO torneo (anio, nombre, pais_sede, logo_url, campeon, subcampeon, cantidad_equipos, cantidad_partidos, descripcion)
  VALUES (p_anio, p_nombre, p_pais_sede, p_logo_url, p_campeon, p_subcampeon, p_cantidad_equipos, p_cantidad_partidos, p_descripcion)
  RETURNING id_torneo INTO p_id_torneo;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_actualizar_torneo(
  IN p_id_torneo INTEGER,
  IN p_anio SMALLINT,
  IN p_nombre VARCHAR(100),
  IN p_pais_sede VARCHAR(120),
  IN p_logo_url VARCHAR(255),
  IN p_campeon VARCHAR(80),
  IN p_subcampeon VARCHAR(80),
  IN p_cantidad_equipos SMALLINT,
  IN p_cantidad_partidos SMALLINT,
  IN p_descripcion VARCHAR(255)
)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM torneo WHERE id_torneo = p_id_torneo) THEN
    RAISE EXCEPTION 'Torneo no encontrado.';
  END IF;

  UPDATE torneo
  SET anio = p_anio,
      nombre = p_nombre,
      pais_sede = p_pais_sede,
      logo_url = p_logo_url,
      campeon = p_campeon,
      subcampeon = p_subcampeon,
      cantidad_equipos = p_cantidad_equipos,
      cantidad_partidos = p_cantidad_partidos,
      descripcion = p_descripcion
  WHERE id_torneo = p_id_torneo;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_eliminar_torneo(IN p_id_torneo INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM torneo WHERE id_torneo = p_id_torneo) THEN
    RAISE EXCEPTION 'Torneo no encontrado.';
  END IF;

  DELETE FROM torneo WHERE id_torneo = p_id_torneo;
END;
$$;

-- =============================================================================
-- PROCEDIMIENTOS Y FUNCIONES ALMACENADAS: SELECCIÓN (CRUD)
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_listar_selecciones(
  p_id_torneo INTEGER DEFAULT NULL,
  p_anio SMALLINT DEFAULT NULL
)
RETURNS TABLE (
  id_seleccion INTEGER,
  id_torneo INTEGER,
  nombre VARCHAR(80),
  bandera VARCHAR(255),
  grupo_fifa CHAR(1),
  anio_torneo SMALLINT,
  nombre_torneo VARCHAR(100)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT s.id_seleccion, s.id_torneo, s.nombre, s.bandera, s.grupo_fifa,
         t.anio AS anio_torneo, t.nombre AS nombre_torneo
  FROM seleccion s
  JOIN torneo t ON t.id_torneo = s.id_torneo
  WHERE (p_id_torneo IS NULL OR s.id_torneo = p_id_torneo)
    AND (p_anio IS NULL OR t.anio = p_anio)
  ORDER BY s.grupo_fifa ASC, s.nombre ASC;
END;
$$;

CREATE OR REPLACE FUNCTION sp_obtener_seleccion(p_id_seleccion INTEGER)
RETURNS TABLE (
  id_seleccion INTEGER,
  id_torneo INTEGER,
  nombre VARCHAR(80),
  bandera VARCHAR(255),
  grupo_fifa CHAR(1),
  anio_torneo SMALLINT,
  nombre_torneo VARCHAR(100)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT s.id_seleccion, s.id_torneo, s.nombre, s.bandera, s.grupo_fifa,
         t.anio AS anio_torneo, t.nombre AS nombre_torneo
  FROM seleccion s
  JOIN torneo t ON t.id_torneo = s.id_torneo
  WHERE s.id_seleccion = p_id_seleccion;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_crear_seleccion(
  IN p_id_torneo INTEGER,
  IN p_nombre VARCHAR(80),
  IN p_bandera VARCHAR(255),
  IN p_grupo_fifa CHAR(1),
  INOUT p_id_seleccion INTEGER DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO seleccion (id_torneo, nombre, bandera, grupo_fifa)
  VALUES (p_id_torneo, p_nombre, p_bandera, p_grupo_fifa)
  RETURNING id_seleccion INTO p_id_seleccion;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_actualizar_seleccion(
  IN p_id_seleccion INTEGER,
  IN p_id_torneo INTEGER,
  IN p_nombre VARCHAR(80),
  IN p_bandera VARCHAR(255),
  IN p_grupo_fifa CHAR(1)
)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM seleccion WHERE id_seleccion = p_id_seleccion) THEN
    RAISE EXCEPTION 'Selección no encontrada.';
  END IF;

  UPDATE seleccion
  SET id_torneo = p_id_torneo,
      nombre = p_nombre,
      bandera = p_bandera,
      grupo_fifa = p_grupo_fifa
  WHERE id_seleccion = p_id_seleccion;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_eliminar_seleccion(IN p_id_seleccion INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM seleccion WHERE id_seleccion = p_id_seleccion) THEN
    RAISE EXCEPTION 'Selección no encontrada.';
  END IF;

  DELETE FROM seleccion WHERE id_seleccion = p_id_seleccion;
END;
$$;

-- =============================================================================
-- PROCEDIMIENTOS Y FUNCIONES ALMACENADAS: JUGADOR (CRUD)
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_listar_jugadores(p_id_seleccion INTEGER DEFAULT NULL)
RETURNS TABLE (
  id_jugador INTEGER,
  nombre VARCHAR(100),
  dorsal SMALLINT,
  posicion VARCHAR(30),
  id_seleccion INTEGER,
  seleccion_nombre VARCHAR(80)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT j.id_jugador, j.nombre, j.dorsal, j.posicion, j.id_seleccion,
         s.nombre AS seleccion_nombre
  FROM jugador j
  LEFT JOIN seleccion s ON s.id_seleccion = j.id_seleccion
  WHERE (p_id_seleccion IS NULL OR j.id_seleccion = p_id_seleccion)
  ORDER BY j.dorsal ASC, j.nombre ASC;
END;
$$;

CREATE OR REPLACE FUNCTION sp_obtener_jugador(p_id_jugador INTEGER)
RETURNS TABLE (
  id_jugador INTEGER,
  nombre VARCHAR(100),
  dorsal SMALLINT,
  posicion VARCHAR(30),
  id_seleccion INTEGER,
  seleccion_nombre VARCHAR(80)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT j.id_jugador, j.nombre, j.dorsal, j.posicion, j.id_seleccion,
         s.nombre AS seleccion_nombre
  FROM jugador j
  LEFT JOIN seleccion s ON s.id_seleccion = j.id_seleccion
  WHERE j.id_jugador = p_id_jugador;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_crear_jugador(
  IN p_nombre VARCHAR(100),
  IN p_dorsal SMALLINT,
  IN p_posicion VARCHAR(30),
  IN p_id_seleccion INTEGER,
  INOUT p_id_jugador INTEGER DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO jugador (nombre, dorsal, posicion, id_seleccion)
  VALUES (p_nombre, p_dorsal, p_posicion, p_id_seleccion)
  RETURNING id_jugador INTO p_id_jugador;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_actualizar_jugador(
  IN p_id_jugador INTEGER,
  IN p_nombre VARCHAR(100),
  IN p_dorsal SMALLINT,
  IN p_posicion VARCHAR(30),
  IN p_id_seleccion INTEGER
)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jugador WHERE id_jugador = p_id_jugador) THEN
    RAISE EXCEPTION 'Jugador no encontrado.';
  END IF;

  UPDATE jugador
  SET nombre = p_nombre,
      dorsal = p_dorsal,
      posicion = p_posicion,
      id_seleccion = p_id_seleccion
  WHERE id_jugador = p_id_jugador;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_eliminar_jugador(IN p_id_jugador INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jugador WHERE id_jugador = p_id_jugador) THEN
    RAISE EXCEPTION 'Jugador no encontrado.';
  END IF;

  DELETE FROM jugador WHERE id_jugador = p_id_jugador;
END;
$$;

-- =============================================================================
-- PROCEDIMIENTOS Y FUNCIONES ALMACENADAS: PARTIDO (CRUD)
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_listar_partidos(
  p_id_torneo INTEGER DEFAULT NULL,
  p_anio SMALLINT DEFAULT NULL
)
RETURNS TABLE (
  id_partido INTEGER,
  id_torneo INTEGER,
  fecha DATE,
  hora TIME,
  estadio VARCHAR(100),
  fase_torneo VARCHAR(50),
  estado_partido VARCHAR(20),
  anio_torneo SMALLINT,
  nombre_torneo VARCHAR(100)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT p.id_partido, p.id_torneo, p.fecha, p.hora, p.estadio, p.fase_torneo, p.estado_partido,
         t.anio AS anio_torneo, t.nombre AS nombre_torneo
  FROM partido p
  JOIN torneo t ON t.id_torneo = p.id_torneo
  WHERE (p_id_torneo IS NULL OR p.id_torneo = p_id_torneo)
    AND (p_anio IS NULL OR t.anio = p_anio)
  ORDER BY p.fecha ASC, p.hora ASC, p.id_partido ASC;
END;
$$;

CREATE OR REPLACE FUNCTION sp_obtener_partido(p_id_partido INTEGER)
RETURNS TABLE (
  id_partido INTEGER,
  id_torneo INTEGER,
  fecha DATE,
  hora TIME,
  estadio VARCHAR(100),
  fase_torneo VARCHAR(50),
  estado_partido VARCHAR(20),
  anio_torneo SMALLINT,
  nombre_torneo VARCHAR(100)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT p.id_partido, p.id_torneo, p.fecha, p.hora, p.estadio, p.fase_torneo, p.estado_partido,
         t.anio AS anio_torneo, t.nombre AS nombre_torneo
  FROM partido p
  JOIN torneo t ON t.id_torneo = p.id_torneo
  WHERE p.id_partido = p_id_partido;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_crear_partido(
  IN p_id_torneo INTEGER,
  IN p_fecha DATE,
  IN p_hora TIME,
  IN p_estadio VARCHAR(100),
  IN p_fase_torneo VARCHAR(50),
  IN p_estado_partido VARCHAR(20),
  INOUT p_id_partido INTEGER DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO partido (id_torneo, fecha, hora, estadio, fase_torneo, estado_partido)
  VALUES (p_id_torneo, p_fecha, p_hora, p_estadio, p_fase_torneo, p_estado_partido)
  RETURNING id_partido INTO p_id_partido;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_actualizar_partido(
  IN p_id_partido INTEGER,
  IN p_id_torneo INTEGER,
  IN p_fecha DATE,
  IN p_hora TIME,
  IN p_estadio VARCHAR(100),
  IN p_fase_torneo VARCHAR(50),
  IN p_estado_partido VARCHAR(20)
)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM partido WHERE id_partido = p_id_partido) THEN
    RAISE EXCEPTION 'Partido no encontrado.';
  END IF;

  UPDATE partido
  SET id_torneo = p_id_torneo,
      fecha = p_fecha,
      hora = p_hora,
      estadio = p_estadio,
      fase_torneo = p_fase_torneo,
      estado_partido = p_estado_partido
  WHERE id_partido = p_id_partido;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_eliminar_partido(IN p_id_partido INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM partido WHERE id_partido = p_id_partido) THEN
    RAISE EXCEPTION 'Partido no encontrado.';
  END IF;

  DELETE FROM partido WHERE id_partido = p_id_partido;
END;
$$;

-- =============================================================================
-- PROCEDIMIENTOS Y FUNCIONES ALMACENADAS: USUARIO (CRUD)
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_listar_usuarios()
RETURNS SETOF usuario
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT * FROM usuario ORDER BY id_usuario DESC;
END;
$$;

CREATE OR REPLACE FUNCTION sp_obtener_usuario(p_id_usuario INTEGER)
RETURNS SETOF usuario
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT * FROM usuario WHERE id_usuario = p_id_usuario;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_crear_usuario(
  IN p_nombre VARCHAR(100),
  IN p_correo VARCHAR(150),
  IN p_idioma VARCHAR(30),
  IN p_notificaciones BOOLEAN,
  INOUT p_id_usuario INTEGER DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO usuario (nombre, correo, idioma, notificaciones)
  VALUES (p_nombre, p_correo, p_idioma, p_notificaciones)
  RETURNING id_usuario INTO p_id_usuario;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_actualizar_usuario(
  IN p_id_usuario INTEGER,
  IN p_nombre VARCHAR(100),
  IN p_correo VARCHAR(150),
  IN p_idioma VARCHAR(30),
  IN p_notificaciones BOOLEAN
)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuario WHERE id_usuario = p_id_usuario) THEN
    RAISE EXCEPTION 'Usuario no encontrado.';
  END IF;

  UPDATE usuario
  SET nombre = p_nombre,
      correo = p_correo,
      idioma = p_idioma,
      notificaciones = p_notificaciones
  WHERE id_usuario = p_id_usuario;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_eliminar_usuario(IN p_id_usuario INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuario WHERE id_usuario = p_id_usuario) THEN
    RAISE EXCEPTION 'Usuario no encontrado.';
  END IF;

  DELETE FROM usuario WHERE id_usuario = p_id_usuario;
END;
$$;

-- =============================================================================
-- PROCEDIMIENTOS Y FUNCIONES ALMACENADAS: ALINEACIÓN Y DETALLE (CRUD)
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_listar_alineaciones(
  p_id_partido INTEGER DEFAULT NULL,
  p_id_torneo INTEGER DEFAULT NULL,
  p_anio SMALLINT DEFAULT NULL
)
RETURNS TABLE (
  id_alineacion INTEGER,
  id_partido INTEGER,
  id_seleccion INTEGER,
  formacion_tactica VARCHAR(20),
  tipo VARCHAR(20),
  fuente VARCHAR(150),
  fecha_publicacion TIMESTAMP,
  estado VARCHAR(20),
  goles SMALLINT,
  seleccion_nombre VARCHAR(80),
  bandera VARCHAR(255),
  fecha DATE,
  hora TIME,
  estadio VARCHAR(100),
  fase_torneo VARCHAR(50),
  estado_partido VARCHAR(20),
  anio_torneo SMALLINT,
  nombre_torneo VARCHAR(100)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT a.id_alineacion, a.id_partido, a.id_seleccion, a.formacion_tactica, a.tipo, a.fuente, a.fecha_publicacion, a.estado, a.goles,
         s.nombre AS seleccion_nombre, s.bandera,
         p.fecha, p.hora, p.estadio, p.fase_torneo, p.estado_partido,
         t.anio AS anio_torneo, t.nombre AS nombre_torneo
  FROM alineacion a
  JOIN seleccion s ON s.id_seleccion = a.id_seleccion
  JOIN partido p ON p.id_partido = a.id_partido
  JOIN torneo t ON t.id_torneo = p.id_torneo
  WHERE (p_id_partido IS NULL OR a.id_partido = p_id_partido)
    AND (p_id_torneo IS NULL OR p.id_torneo = p_id_torneo)
    AND (p_anio IS NULL OR t.anio = p_anio)
  ORDER BY p.fecha ASC, p.hora ASC, a.id_alineacion ASC;
END;
$$;

CREATE OR REPLACE FUNCTION sp_obtener_alineacion(p_id_alineacion INTEGER)
RETURNS TABLE (
  id_alineacion INTEGER,
  id_partido INTEGER,
  id_seleccion INTEGER,
  formacion_tactica VARCHAR(20),
  tipo VARCHAR(20),
  fuente VARCHAR(150),
  fecha_publicacion TIMESTAMP,
  estado VARCHAR(20),
  goles SMALLINT,
  seleccion_nombre VARCHAR(80),
  bandera VARCHAR(255),
  fecha DATE,
  hora TIME,
  estadio VARCHAR(100),
  fase_torneo VARCHAR(50),
  estado_partido VARCHAR(20),
  id_torneo INTEGER,
  anio_torneo SMALLINT,
  nombre_torneo VARCHAR(100)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT a.id_alineacion, a.id_partido, a.id_seleccion, a.formacion_tactica, a.tipo, a.fuente, a.fecha_publicacion, a.estado, a.goles,
         s.nombre AS seleccion_nombre, s.bandera,
         p.fecha, p.hora, p.estadio, p.fase_torneo, p.estado_partido, p.id_torneo,
         t.anio AS anio_torneo, t.nombre AS nombre_torneo
  FROM alineacion a
  JOIN seleccion s ON s.id_seleccion = a.id_seleccion
  JOIN partido p ON p.id_partido = a.id_partido
  JOIN torneo t ON t.id_torneo = p.id_torneo
  WHERE a.id_alineacion = p_id_alineacion;
END;
$$;

CREATE OR REPLACE FUNCTION sp_obtener_jugadores_alineacion(p_id_alineacion INTEGER)
RETURNS TABLE (
  id_alineacion INTEGER,
  id_jugador INTEGER,
  rol VARCHAR(15),
  posicion_cancha VARCHAR(30),
  minuto_cambio SMALLINT,
  goles SMALLINT,
  asistencias SMALLINT,
  regates SMALLINT,
  nombre VARCHAR(100),
  dorsal SMALLINT,
  posicion VARCHAR(30)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT aj.id_alineacion, aj.id_jugador, aj.rol, aj.posicion_cancha, aj.minuto_cambio,
         aj.goles, aj.asistencias, aj.regates,
         j.nombre, j.dorsal, j.posicion
  FROM alineacion_jugador aj
  JOIN jugador j ON j.id_jugador = aj.id_jugador
  WHERE aj.id_alineacion = p_id_alineacion
  ORDER BY aj.rol DESC, j.dorsal ASC;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_crear_alineacion(
  IN p_id_partido INTEGER,
  IN p_id_seleccion INTEGER,
  IN p_formacion_tactica VARCHAR(20),
  IN p_tipo VARCHAR(20),
  IN p_fuente VARCHAR(150),
  IN p_fecha_publicacion TIMESTAMP,
  IN p_estado VARCHAR(20),
  INOUT p_id_alineacion INTEGER DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO alineacion (id_partido, id_seleccion, formacion_tactica, tipo, fuente, fecha_publicacion, estado)
  VALUES (p_id_partido, p_id_seleccion, p_formacion_tactica, p_tipo, p_fuente, p_fecha_publicacion, p_estado)
  RETURNING id_alineacion INTO p_id_alineacion;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_actualizar_alineacion(
  IN p_id_alineacion INTEGER,
  IN p_id_partido INTEGER,
  IN p_id_seleccion INTEGER,
  IN p_formacion_tactica VARCHAR(20),
  IN p_tipo VARCHAR(20),
  IN p_fuente VARCHAR(150),
  IN p_fecha_publicacion TIMESTAMP,
  IN p_estado VARCHAR(20)
)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM alineacion WHERE id_alineacion = p_id_alineacion) THEN
    RAISE EXCEPTION 'Alineación no encontrada.';
  END IF;

  UPDATE alineacion
  SET id_partido = p_id_partido,
      id_seleccion = p_id_seleccion,
      formacion_tactica = p_formacion_tactica,
      tipo = p_tipo,
      fuente = p_fuente,
      fecha_publicacion = p_fecha_publicacion,
      estado = p_estado
  WHERE id_alineacion = p_id_alineacion;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_eliminar_alineacion(IN p_id_alineacion INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM alineacion WHERE id_alineacion = p_id_alineacion) THEN
    RAISE EXCEPTION 'Alineación no encontrada.';
  END IF;

  DELETE FROM alineacion_jugador WHERE id_alineacion = p_id_alineacion;
  DELETE FROM notificacion WHERE id_alineacion = p_id_alineacion;
  DELETE FROM alineacion WHERE id_alineacion = p_id_alineacion;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_limpiar_jugadores_alineacion(IN p_id_alineacion INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM alineacion_jugador WHERE id_alineacion = p_id_alineacion;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_asignar_jugador_alineacion(
  IN p_id_alineacion INTEGER,
  IN p_id_jugador INTEGER,
  IN p_rol VARCHAR(15),
  IN p_posicion_cancha VARCHAR(30),
  IN p_minuto_cambio SMALLINT
)
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO alineacion_jugador (id_alineacion, id_jugador, rol, posicion_cancha, minuto_cambio)
  VALUES (p_id_alineacion, p_id_jugador, p_rol, p_posicion_cancha, p_minuto_cambio)
  ON CONFLICT (id_alineacion, id_jugador) DO UPDATE SET
    rol = EXCLUDED.rol,
    posicion_cancha = EXCLUDED.posicion_cancha,
    minuto_cambio = EXCLUDED.minuto_cambio;
END;
$$;

-- =============================================================================
-- PROCEDIMIENTOS Y FUNCIONES ALMACENADAS: NOTIFICACIONES (CRUD)
-- =============================================================================
CREATE OR REPLACE FUNCTION sp_listar_notificaciones()
RETURNS TABLE (
  id_notificacion INTEGER,
  fecha_envio TIMESTAMP,
  estado VARCHAR(20),
  id_usuario INTEGER,
  id_alineacion INTEGER,
  usuario_nombre VARCHAR(100),
  correo VARCHAR(150),
  formacion_tactica VARCHAR(20),
  seleccion_nombre VARCHAR(80),
  fecha DATE,
  estadio VARCHAR(100)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT n.id_notificacion, n.fecha_envio, n.estado, n.id_usuario, n.id_alineacion,
         u.nombre AS usuario_nombre, u.correo,
         a.formacion_tactica, s.nombre AS seleccion_nombre,
         p.fecha, p.estadio
  FROM notificacion n
  JOIN usuario u ON u.id_usuario = n.id_usuario
  JOIN alineacion a ON a.id_alineacion = n.id_alineacion
  JOIN seleccion s ON s.id_seleccion = a.id_seleccion
  JOIN partido p ON p.id_partido = a.id_partido
  ORDER BY n.id_notificacion DESC;
END;
$$;

CREATE OR REPLACE FUNCTION sp_obtener_notificacion(p_id_notificacion INTEGER)
RETURNS SETOF notificacion
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY SELECT * FROM notificacion WHERE id_notificacion = p_id_notificacion;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_crear_notificacion(
  IN p_fecha_envio TIMESTAMP,
  IN p_estado VARCHAR(20),
  IN p_id_usuario INTEGER,
  IN p_id_alineacion INTEGER,
  INOUT p_id_notificacion INTEGER DEFAULT NULL
)
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notificacion (fecha_envio, estado, id_usuario, id_alineacion)
  VALUES (p_fecha_envio, p_estado, p_id_usuario, p_id_alineacion)
  RETURNING id_notificacion INTO p_id_notificacion;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_actualizar_notificacion(
  IN p_id_notificacion INTEGER,
  IN p_fecha_envio TIMESTAMP,
  IN p_estado VARCHAR(20),
  IN p_id_usuario INTEGER,
  IN p_id_alineacion INTEGER
)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM notificacion WHERE id_notificacion = p_id_notificacion) THEN
    RAISE EXCEPTION 'Notificación no encontrada.';
  END IF;

  UPDATE notificacion
  SET fecha_envio = p_fecha_envio,
      estado = p_estado,
      id_usuario = p_id_usuario,
      id_alineacion = p_id_alineacion
  WHERE id_notificacion = p_id_notificacion;
END;
$$;

CREATE OR REPLACE PROCEDURE sp_eliminar_notificacion(IN p_id_notificacion INTEGER)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM notificacion WHERE id_notificacion = p_id_notificacion) THEN
    RAISE EXCEPTION 'Notificación no encontrada.';
  END IF;

  DELETE FROM notificacion WHERE id_notificacion = p_id_notificacion;
END;
$$;

CREATE OR REPLACE FUNCTION sp_obtener_notificaciones_usuario(p_id_usuario INTEGER)
RETURNS TABLE (
  id_notificacion INTEGER,
  fecha_envio TIMESTAMP,
  estado VARCHAR(20),
  formacion_tactica VARCHAR(20),
  estado_alineacion VARCHAR(20),
  seleccion_nombre VARCHAR(80),
  bandera VARCHAR(255),
  id_partido INTEGER,
  fecha DATE,
  hora TIME,
  estadio VARCHAR(100),
  fase_torneo VARCHAR(50)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT n.id_notificacion, n.fecha_envio, n.estado,
         a.formacion_tactica, a.estado AS estado_alineacion,
         s.nombre AS seleccion_nombre, s.bandera,
         p.id_partido, p.fecha, p.hora, p.estadio, p.fase_torneo
  FROM notificacion n
  JOIN alineacion a ON a.id_alineacion = n.id_alineacion
  JOIN seleccion s ON s.id_seleccion = a.id_seleccion
  JOIN partido p ON p.id_partido = a.id_partido
  WHERE n.id_usuario = p_id_usuario
  ORDER BY n.fecha_envio DESC, n.id_notificacion DESC
  LIMIT 20;
END;
$$;

-- =============================================================================
-- CONSULTAS E INFORMES OFICIALES DEL DOCUMENTO (PÁGS. 37-42)
-- =============================================================================

-- Consulta 1 (Documento pág. 37): Consultar alineaciones confirmadas
CREATE OR REPLACE FUNCTION sp_consultar_alineaciones_confirmadas()
RETURNS TABLE (
  id_alineacion INTEGER,
  id_partido INTEGER,
  id_seleccion INTEGER,
  formacion_tactica VARCHAR(20),
  fecha_publicacion TIMESTAMP
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT a.id_alineacion, a.id_partido, a.id_seleccion, a.formacion_tactica, a.fecha_publicacion
  FROM alineacion a
  WHERE a.estado = 'Confirmada';
END;
$$;

-- Consulta 2 (Documento pág. 38): Consultar titulares de una alineación
CREATE OR REPLACE FUNCTION sp_consultar_titulares_alineacion(p_id_alineacion INTEGER)
RETURNS TABLE (
  nombre VARCHAR(100),
  dorsal SMALLINT,
  posicion_cancha VARCHAR(30)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT j.nombre, j.dorsal, aj.posicion_cancha
  FROM alineacion_jugador aj
  INNER JOIN jugador j ON aj.id_jugador = j.id_jugador
  WHERE aj.id_alineacion = p_id_alineacion
    AND aj.rol = 'Titular'
  ORDER BY j.dorsal ASC;
END;
$$;

-- Consulta 3 (Documento pág. 39): Consultar usuarios con notificaciones activadas
CREATE OR REPLACE FUNCTION sp_consultar_usuarios_notificaciones()
RETURNS TABLE (
  id_usuario INTEGER,
  nombre VARCHAR(100),
  correo VARCHAR(150),
  idioma VARCHAR(30)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT u.id_usuario, u.nombre, u.correo, u.idioma
  FROM usuario u
  WHERE u.notificaciones = TRUE
  ORDER BY u.nombre ASC;
END;
$$;

-- Consulta 4 (Documento pág. 39): Consultar alineaciones confirmadas para notificar
CREATE OR REPLACE FUNCTION sp_consultar_alineaciones_para_notificar()
RETURNS TABLE (
  id_alineacion INTEGER,
  seleccion_nombre VARCHAR(80),
  fecha DATE,
  hora TIME,
  formacion_tactica VARCHAR(20)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT a.id_alineacion, s.nombre AS seleccion_nombre, p.fecha, p.hora, a.formacion_tactica
  FROM alineacion a
  INNER JOIN partido p ON a.id_partido = p.id_partido
  INNER JOIN seleccion s ON a.id_seleccion = s.id_seleccion
  WHERE a.estado = 'Confirmada';
END;
$$;

-- Informe de Historial y Rotaciones (Documento numeral 1.4)
CREATE OR REPLACE FUNCTION sp_historial_alineaciones(p_id_seleccion INTEGER DEFAULT NULL)
RETURNS TABLE (
  id_historial INTEGER,
  id_alineacion INTEGER,
  id_partido INTEGER,
  id_seleccion INTEGER,
  formacion_anterior VARCHAR(20),
  formacion_nueva VARCHAR(20),
  estado_anterior VARCHAR(20),
  estado_nuevo VARCHAR(20),
  fecha_cambio TIMESTAMP,
  motivo_cambio VARCHAR(255),
  seleccion_nombre VARCHAR(80),
  fecha_partido DATE,
  estadio VARCHAR(100)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT ha.id_historial, ha.id_alineacion, ha.id_partido, ha.id_seleccion,
         ha.formacion_anterior, ha.formacion_nueva, ha.estado_anterior, ha.estado_nuevo,
         ha.fecha_cambio, ha.motivo_cambio,
         s.nombre AS seleccion_nombre, p.fecha AS fecha_partido, p.estadio
  FROM historial_alineacion ha
  JOIN seleccion s ON s.id_seleccion = ha.id_seleccion
  JOIN partido p ON p.id_partido = ha.id_partido
  WHERE (p_id_seleccion IS NULL OR ha.id_seleccion = p_id_seleccion)
  ORDER BY ha.fecha_cambio DESC;
END;
$$;

-- =============================================================================
-- FUNCIONES DE DISPARADOR Y TRIGGERS (PL/pgSQL)
-- =============================================================================

-- TRIGGER 1: Regla de negocio 1 (Documento pág. 22) - Máximo 2 alineaciones por partido
CREATE OR REPLACE FUNCTION fn_trg_alineacion_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM alineacion
  WHERE id_partido = NEW.id_partido;

  IF v_total >= 2 THEN
    RAISE EXCEPTION 'Regla de negocio 1 violada: Cada partido puede tener un máximo de dos alineaciones oficiales.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alineacion_before_insert
BEFORE INSERT ON alineacion
FOR EACH ROW
EXECUTE FUNCTION fn_trg_alineacion_before_insert();

-- TRIGGER 2: Generación automática de notificaciones al insertar alineación Confirmada
CREATE OR REPLACE FUNCTION fn_trg_alineacion_confirmada_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado = 'Confirmada' THEN
    INSERT INTO notificacion (fecha_envio, estado, id_usuario, id_alineacion)
    SELECT CURRENT_TIMESTAMP::TIMESTAMP, 'Pendiente', u.id_usuario, NEW.id_alineacion
    FROM usuario u
    WHERE u.notificaciones = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM notificacion n
        WHERE n.id_usuario = u.id_usuario AND n.id_alineacion = NEW.id_alineacion
      );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alineacion_confirmada_after_insert
AFTER INSERT ON alineacion
FOR EACH ROW
EXECUTE FUNCTION fn_trg_alineacion_confirmada_after_insert();

-- TRIGGER 3: Generación automática de notificaciones al cambiar a Confirmada
CREATE OR REPLACE FUNCTION fn_trg_alineacion_confirmada_after_update()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.estado = 'Confirmada' AND (OLD.estado IS DISTINCT FROM 'Confirmada') THEN
    INSERT INTO notificacion (fecha_envio, estado, id_usuario, id_alineacion)
    SELECT CURRENT_TIMESTAMP::TIMESTAMP, 'Pendiente', u.id_usuario, NEW.id_alineacion
    FROM usuario u
    WHERE u.notificaciones = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM notificacion n
        WHERE n.id_usuario = u.id_usuario AND n.id_alineacion = NEW.id_alineacion
      );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alineacion_confirmada_after_update
AFTER UPDATE ON alineacion
FOR EACH ROW
EXECUTE FUNCTION fn_trg_alineacion_confirmada_after_update();

-- TRIGGER 4: Auditoría e historial de cambios en alineaciones (Objetivo 1.4 del documento)
CREATE OR REPLACE FUNCTION fn_trg_alineacion_historial_after_update()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.formacion_tactica IS DISTINCT FROM NEW.formacion_tactica OR OLD.estado IS DISTINCT FROM NEW.estado) THEN
    INSERT INTO historial_alineacion (
      id_alineacion, id_partido, id_seleccion,
      formacion_anterior, formacion_nueva,
      estado_anterior, estado_nuevo,
      fecha_cambio, motivo_cambio
    )
    VALUES (
      NEW.id_alineacion, NEW.id_partido, NEW.id_seleccion,
      OLD.formacion_tactica, NEW.formacion_tactica,
      OLD.estado, NEW.estado,
      CURRENT_TIMESTAMP::TIMESTAMP,
      CASE
        WHEN OLD.estado = 'Probable' AND NEW.estado = 'Confirmada' THEN 'Confirmación oficial de alineación'
        WHEN OLD.formacion_tactica IS DISTINCT FROM NEW.formacion_tactica THEN 'Ajuste táctico: ' || OLD.formacion_tactica || ' a ' || NEW.formacion_tactica
        ELSE 'Modificación de parámetros de la alineación'
      END
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_alineacion_historial_after_update
AFTER UPDATE ON alineacion
FOR EACH ROW
EXECUTE FUNCTION fn_trg_alineacion_historial_after_update();

-- TRIGGER 5: Validación de convocatoria y reglas de rol / minuto al insertar
CREATE OR REPLACE FUNCTION fn_trg_aj_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  v_id_sel_ali INTEGER;
  v_id_sel_jug INTEGER;
BEGIN
  SELECT id_seleccion INTO v_id_sel_ali FROM alineacion WHERE id_alineacion = NEW.id_alineacion;
  SELECT id_seleccion INTO v_id_sel_jug FROM jugador WHERE id_jugador = NEW.id_jugador;

  IF v_id_sel_ali IS NOT NULL AND v_id_sel_jug IS NOT NULL AND v_id_sel_ali <> v_id_sel_jug THEN
    RAISE EXCEPTION 'Regla de integridad: El jugador convocado debe pertenecer obligatoriamente a la selección de la alineación.';
  END IF;

  IF NEW.rol = 'Titular' AND NEW.minuto_cambio IS NOT NULL THEN
    RAISE EXCEPTION 'Regla de negocio 6 violada: El minuto de cambio solo podrá registrarse para jugadores suplentes que ingresaron.';
  END IF;

  IF NEW.minuto_cambio IS NOT NULL AND (NEW.minuto_cambio < 1 OR NEW.minuto_cambio > 120) THEN
    RAISE EXCEPTION 'Regla de validación: El minuto de cambio debe estar comprendido entre 1 y 120.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aj_before_insert
BEFORE INSERT ON alineacion_jugador
FOR EACH ROW
EXECUTE FUNCTION fn_trg_aj_before_insert();

-- TRIGGER 6: Validación de reglas de rol / minuto al actualizar en alineacion_jugador
CREATE OR REPLACE FUNCTION fn_trg_aj_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rol = 'Titular' AND NEW.minuto_cambio IS NOT NULL THEN
    RAISE EXCEPTION 'Regla de negocio 6 violada: El minuto de cambio solo podrá registrarse para jugadores suplentes que ingresaron.';
  END IF;

  IF NEW.minuto_cambio IS NOT NULL AND (NEW.minuto_cambio < 1 OR NEW.minuto_cambio > 120) THEN
    RAISE EXCEPTION 'Regla de validación: El minuto de cambio debe estar comprendido entre 1 y 120.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_aj_before_update
BEFORE UPDATE ON alineacion_jugador
FOR EACH ROW
EXECUTE FUNCTION fn_trg_aj_before_update();

-- TRIGGER 7: Regla de negocio 8 al insertar jugador (Dorsal único por selección)
CREATE OR REPLACE FUNCTION fn_trg_jugador_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM jugador WHERE id_seleccion = NEW.id_seleccion AND dorsal = NEW.dorsal) THEN
    RAISE EXCEPTION 'Regla de negocio 8 violada: El dorsal ya está asignado a otro jugador de la misma selección.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_jugador_before_insert
BEFORE INSERT ON jugador
FOR EACH ROW
EXECUTE FUNCTION fn_trg_jugador_before_insert();

-- TRIGGER 8: Regla de negocio 8 al actualizar jugador
CREATE OR REPLACE FUNCTION fn_trg_jugador_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.dorsal <> OLD.dorsal OR NEW.id_seleccion <> OLD.id_seleccion) THEN
    IF EXISTS (
      SELECT 1 FROM jugador
      WHERE id_seleccion = NEW.id_seleccion
        AND dorsal = NEW.dorsal
        AND id_jugador <> OLD.id_jugador
    ) THEN
      RAISE EXCEPTION 'Regla de negocio 8 violada: El dorsal ya está asignado a otro jugador de la misma selección.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_jugador_before_update
BEFORE UPDATE ON jugador
FOR EACH ROW
EXECUTE FUNCTION fn_trg_jugador_before_update();
