-- =============================================================================
-- 11LEVEN - TRIGGERS Y PROCEDIMIENTOS ALMACENADOS (MYSQL 8)
-- Proyecto: 11Leven - Plataforma de Alineaciones Oficiales de la Copa Mundial
-- Universidad Distrital Francisco José de Caldas - Bases de Datos
-- =============================================================================
-- Este archivo contiene la definición completa de:
-- 1. Tabla de Historial y Auditoría de Alineaciones (Objetivo 1.4 del documento)
-- 2. Procedimientos Almacenados (CRUD y Consultas Oficiales de Requerimientos)
-- 3. Triggers (Automatización de Notificaciones y Cumplimiento de Reglas de Negocio)
-- =============================================================================

USE `11leven`;

-- =============================================================================
-- 1. TABLA DE HISTORIAL / AUDITORÍA DE ALINEACIONES
-- =============================================================================
CREATE TABLE IF NOT EXISTS historial_alineacion (
  id_historial INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_alineacion INT UNSIGNED NOT NULL,
  id_partido INT UNSIGNED NOT NULL,
  id_seleccion INT UNSIGNED NOT NULL,
  formacion_anterior VARCHAR(20) NULL,
  formacion_nueva VARCHAR(20) NOT NULL,
  estado_anterior VARCHAR(20) NULL,
  estado_nuevo VARCHAR(20) NOT NULL,
  fecha_cambio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  motivo_cambio VARCHAR(255) DEFAULT 'Actualización de alineación',
  CONSTRAINT fk_ha_alineacion FOREIGN KEY (id_alineacion) REFERENCES alineacion(id_alineacion) ON DELETE CASCADE,
  CONSTRAINT fk_ha_partido FOREIGN KEY (id_partido) REFERENCES partido(id_partido) ON DELETE CASCADE,
  CONSTRAINT fk_ha_seleccion FOREIGN KEY (id_seleccion) REFERENCES seleccion(id_seleccion) ON DELETE CASCADE,
  INDEX idx_ha_alineacion (id_alineacion),
  INDEX idx_ha_seleccion (id_seleccion)
) ENGINE=InnoDB;

-- =============================================================================
-- 2. PROCEDIMIENTOS ALMACENADOS: TORNEO (CRUD)
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_listar_torneos;
DELIMITER //
CREATE PROCEDURE sp_listar_torneos()
BEGIN
  SELECT * FROM torneo ORDER BY anio ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_obtener_torneo;
DELIMITER //
CREATE PROCEDURE sp_obtener_torneo(
  IN p_param VARCHAR(100)
)
BEGIN
  SELECT * FROM torneo 
  WHERE id_torneo = p_param OR anio = p_param
  LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_crear_torneo;
DELIMITER //
CREATE PROCEDURE sp_crear_torneo(
  IN p_anio SMALLINT UNSIGNED,
  IN p_nombre VARCHAR(100),
  IN p_pais_sede VARCHAR(120),
  IN p_logo_url VARCHAR(255),
  IN p_campeon VARCHAR(80),
  IN p_subcampeon VARCHAR(80),
  IN p_cantidad_equipos SMALLINT UNSIGNED,
  IN p_cantidad_partidos SMALLINT UNSIGNED,
  IN p_descripcion VARCHAR(255)
)
BEGIN
  INSERT INTO torneo (anio, nombre, pais_sede, logo_url, campeon, subcampeon, cantidad_equipos, cantidad_partidos, descripcion)
  VALUES (p_anio, p_nombre, p_pais_sede, p_logo_url, p_campeon, p_subcampeon, p_cantidad_equipos, p_cantidad_partidos, p_descripcion);

  SELECT LAST_INSERT_ID() AS id_torneo;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_actualizar_torneo;
DELIMITER //
CREATE PROCEDURE sp_actualizar_torneo(
  IN p_id_torneo INT UNSIGNED,
  IN p_anio SMALLINT UNSIGNED,
  IN p_nombre VARCHAR(100),
  IN p_pais_sede VARCHAR(120),
  IN p_logo_url VARCHAR(255),
  IN p_campeon VARCHAR(80),
  IN p_subcampeon VARCHAR(80),
  IN p_cantidad_equipos SMALLINT UNSIGNED,
  IN p_cantidad_partidos SMALLINT UNSIGNED,
  IN p_descripcion VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM torneo WHERE id_torneo = p_id_torneo) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Torneo no encontrado.';
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

  SELECT p_id_torneo AS id_torneo;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_eliminar_torneo;
DELIMITER //
CREATE PROCEDURE sp_eliminar_torneo(
  IN p_id_torneo INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM torneo WHERE id_torneo = p_id_torneo) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Torneo no encontrado.';
  END IF;

  DELETE FROM torneo WHERE id_torneo = p_id_torneo;
END //
DELIMITER ;

-- =============================================================================
-- 3. PROCEDIMIENTOS ALMACENADOS: SELECCIÓN (CRUD)
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_listar_selecciones;
DELIMITER //
CREATE PROCEDURE sp_listar_selecciones(
  IN p_id_torneo INT UNSIGNED,
  IN p_anio SMALLINT UNSIGNED
)
BEGIN
  SELECT s.*, t.anio AS anio_torneo, t.nombre AS nombre_torneo
  FROM seleccion s 
  JOIN torneo t ON t.id_torneo = s.id_torneo
  WHERE (p_id_torneo IS NULL OR s.id_torneo = p_id_torneo)
    AND (p_anio IS NULL OR t.anio = p_anio)
  ORDER BY s.grupo_fifa ASC, s.nombre ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_obtener_seleccion;
DELIMITER //
CREATE PROCEDURE sp_obtener_seleccion(
  IN p_id_seleccion INT UNSIGNED
)
BEGIN
  SELECT s.*, t.anio AS anio_torneo, t.nombre AS nombre_torneo
  FROM seleccion s
  JOIN torneo t ON t.id_torneo = s.id_torneo
  WHERE s.id_seleccion = p_id_seleccion;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_crear_seleccion;
DELIMITER //
CREATE PROCEDURE sp_crear_seleccion(
  IN p_id_torneo INT UNSIGNED,
  IN p_nombre VARCHAR(80),
  IN p_bandera VARCHAR(255),
  IN p_grupo_fifa CHAR(1)
)
BEGIN
  INSERT INTO seleccion (id_torneo, nombre, bandera, grupo_fifa)
  VALUES (p_id_torneo, p_nombre, p_bandera, p_grupo_fifa);

  SELECT LAST_INSERT_ID() AS id_seleccion;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_actualizar_seleccion;
DELIMITER //
CREATE PROCEDURE sp_actualizar_seleccion(
  IN p_id_seleccion INT UNSIGNED,
  IN p_id_torneo INT UNSIGNED,
  IN p_nombre VARCHAR(80),
  IN p_bandera VARCHAR(255),
  IN p_grupo_fifa CHAR(1)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM seleccion WHERE id_seleccion = p_id_seleccion) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selección no encontrada.';
  END IF;

  UPDATE seleccion
  SET id_torneo = p_id_torneo,
      nombre = p_nombre,
      bandera = p_bandera,
      grupo_fifa = p_grupo_fifa
  WHERE id_seleccion = p_id_seleccion;

  SELECT p_id_seleccion AS id_seleccion;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_eliminar_seleccion;
DELIMITER //
CREATE PROCEDURE sp_eliminar_seleccion(
  IN p_id_seleccion INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM seleccion WHERE id_seleccion = p_id_seleccion) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Selección no encontrada.';
  END IF;

  DELETE FROM seleccion WHERE id_seleccion = p_id_seleccion;
END //
DELIMITER ;

-- =============================================================================
-- 4. PROCEDIMIENTOS ALMACENADOS: JUGADOR (CRUD)
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_listar_jugadores;
DELIMITER //
CREATE PROCEDURE sp_listar_jugadores(
  IN p_id_seleccion INT UNSIGNED
)
BEGIN
  SELECT j.*, s.nombre AS seleccion_nombre
  FROM jugador j
  LEFT JOIN seleccion s ON s.id_seleccion = j.id_seleccion
  WHERE (p_id_seleccion IS NULL OR j.id_seleccion = p_id_seleccion)
  ORDER BY j.dorsal ASC, j.nombre ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_obtener_jugador;
DELIMITER //
CREATE PROCEDURE sp_obtener_jugador(
  IN p_id_jugador INT UNSIGNED
)
BEGIN
  SELECT j.*, s.nombre AS seleccion_nombre
  FROM jugador j
  LEFT JOIN seleccion s ON s.id_seleccion = j.id_seleccion
  WHERE j.id_jugador = p_id_jugador;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_crear_jugador;
DELIMITER //
CREATE PROCEDURE sp_crear_jugador(
  IN p_nombre VARCHAR(100),
  IN p_dorsal SMALLINT UNSIGNED,
  IN p_posicion VARCHAR(30),
  IN p_id_seleccion INT UNSIGNED
)
BEGIN
  INSERT INTO jugador (nombre, dorsal, posicion, id_seleccion)
  VALUES (p_nombre, p_dorsal, p_posicion, p_id_seleccion);

  SELECT LAST_INSERT_ID() AS id_jugador;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_actualizar_jugador;
DELIMITER //
CREATE PROCEDURE sp_actualizar_jugador(
  IN p_id_jugador INT UNSIGNED,
  IN p_nombre VARCHAR(100),
  IN p_dorsal SMALLINT UNSIGNED,
  IN p_posicion VARCHAR(30),
  IN p_id_seleccion INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jugador WHERE id_jugador = p_id_jugador) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Jugador no encontrado.';
  END IF;

  UPDATE jugador
  SET nombre = p_nombre,
      dorsal = p_dorsal,
      posicion = p_posicion,
      id_seleccion = p_id_seleccion
  WHERE id_jugador = p_id_jugador;

  SELECT p_id_jugador AS id_jugador;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_eliminar_jugador;
DELIMITER //
CREATE PROCEDURE sp_eliminar_jugador(
  IN p_id_jugador INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jugador WHERE id_jugador = p_id_jugador) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Jugador no encontrado.';
  END IF;

  DELETE FROM jugador WHERE id_jugador = p_id_jugador;
END //
DELIMITER ;

-- =============================================================================
-- 5. PROCEDIMIENTOS ALMACENADOS: PARTIDO (CRUD)
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_listar_partidos;
DELIMITER //
CREATE PROCEDURE sp_listar_partidos(
  IN p_id_torneo INT UNSIGNED,
  IN p_anio SMALLINT UNSIGNED
)
BEGIN
  SELECT p.*, t.anio AS anio_torneo, t.nombre AS nombre_torneo
  FROM partido p
  JOIN torneo t ON t.id_torneo = p.id_torneo
  WHERE (p_id_torneo IS NULL OR p.id_torneo = p_id_torneo)
    AND (p_anio IS NULL OR t.anio = p_anio)
  ORDER BY p.fecha ASC, p.hora ASC, p.id_partido ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_obtener_partido;
DELIMITER //
CREATE PROCEDURE sp_obtener_partido(
  IN p_id_partido INT UNSIGNED
)
BEGIN
  SELECT p.*, t.anio AS anio_torneo, t.nombre AS nombre_torneo
  FROM partido p 
  JOIN torneo t ON t.id_torneo = p.id_torneo
  WHERE p.id_partido = p_id_partido;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_crear_partido;
DELIMITER //
CREATE PROCEDURE sp_crear_partido(
  IN p_id_torneo INT UNSIGNED,
  IN p_fecha DATE,
  IN p_hora TIME,
  IN p_estadio VARCHAR(100),
  IN p_fase_torneo VARCHAR(50),
  IN p_estado_partido VARCHAR(20)
)
BEGIN
  INSERT INTO partido (id_torneo, fecha, hora, estadio, fase_torneo, estado_partido)
  VALUES (p_id_torneo, p_fecha, p_hora, p_estadio, p_fase_torneo, p_estado_partido);

  SELECT LAST_INSERT_ID() AS id_partido;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_actualizar_partido;
DELIMITER //
CREATE PROCEDURE sp_actualizar_partido(
  IN p_id_partido INT UNSIGNED,
  IN p_id_torneo INT UNSIGNED,
  IN p_fecha DATE,
  IN p_hora TIME,
  IN p_estadio VARCHAR(100),
  IN p_fase_torneo VARCHAR(50),
  IN p_estado_partido VARCHAR(20)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM partido WHERE id_partido = p_id_partido) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Partido no encontrado.';
  END IF;

  UPDATE partido
  SET id_torneo = p_id_torneo,
      fecha = p_fecha,
      hora = p_hora,
      estadio = p_estadio,
      fase_torneo = p_fase_torneo,
      estado_partido = p_estado_partido
  WHERE id_partido = p_id_partido;

  SELECT p_id_partido AS id_partido;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_eliminar_partido;
DELIMITER //
CREATE PROCEDURE sp_eliminar_partido(
  IN p_id_partido INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM partido WHERE id_partido = p_id_partido) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Partido no encontrado.';
  END IF;

  DELETE FROM partido WHERE id_partido = p_id_partido;
END //
DELIMITER ;

-- =============================================================================
-- 6. PROCEDIMIENTOS ALMACENADOS: USUARIO (CRUD)
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_listar_usuarios;
DELIMITER //
CREATE PROCEDURE sp_listar_usuarios()
BEGIN
  SELECT * FROM usuario ORDER BY id_usuario DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_obtener_usuario;
DELIMITER //
CREATE PROCEDURE sp_obtener_usuario(
  IN p_id_usuario INT UNSIGNED
)
BEGIN
  SELECT * FROM usuario WHERE id_usuario = p_id_usuario;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_crear_usuario;
DELIMITER //
CREATE PROCEDURE sp_crear_usuario(
  IN p_nombre VARCHAR(100),
  IN p_correo VARCHAR(150),
  IN p_idioma VARCHAR(30),
  IN p_notificaciones BOOLEAN
)
BEGIN
  INSERT INTO usuario (nombre, correo, idioma, notificaciones)
  VALUES (p_nombre, p_correo, p_idioma, p_notificaciones);

  SELECT LAST_INSERT_ID() AS id_usuario;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_actualizar_usuario;
DELIMITER //
CREATE PROCEDURE sp_actualizar_usuario(
  IN p_id_usuario INT UNSIGNED,
  IN p_nombre VARCHAR(100),
  IN p_correo VARCHAR(150),
  IN p_idioma VARCHAR(30),
  IN p_notificaciones BOOLEAN
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuario WHERE id_usuario = p_id_usuario) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no encontrado.';
  END IF;

  UPDATE usuario
  SET nombre = p_nombre,
      correo = p_correo,
      idioma = p_idioma,
      notificaciones = p_notificaciones
  WHERE id_usuario = p_id_usuario;

  SELECT p_id_usuario AS id_usuario;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_eliminar_usuario;
DELIMITER //
CREATE PROCEDURE sp_eliminar_usuario(
  IN p_id_usuario INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuario WHERE id_usuario = p_id_usuario) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuario no encontrado.';
  END IF;

  DELETE FROM usuario WHERE id_usuario = p_id_usuario;
END //
DELIMITER ;

-- =============================================================================
-- 7. PROCEDIMIENTOS ALMACENADOS: ALINEACIÓN Y DETALLE (CRUD)
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_listar_alineaciones;
DELIMITER //
CREATE PROCEDURE sp_listar_alineaciones(
  IN p_id_partido INT UNSIGNED,
  IN p_id_torneo INT UNSIGNED,
  IN p_anio SMALLINT UNSIGNED
)
BEGIN
  SELECT a.*, s.nombre AS seleccion_nombre, s.bandera,
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
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_obtener_alineacion;
DELIMITER //
CREATE PROCEDURE sp_obtener_alineacion(
  IN p_id_alineacion INT UNSIGNED
)
BEGIN
  SELECT a.*, s.nombre AS seleccion_nombre, s.bandera,
         p.fecha, p.hora, p.estadio, p.fase_torneo, p.estado_partido, p.id_torneo,
         t.anio AS anio_torneo, t.nombre AS nombre_torneo
  FROM alineacion a
  JOIN seleccion s ON s.id_seleccion = a.id_seleccion
  JOIN partido p ON p.id_partido = a.id_partido
  JOIN torneo t ON t.id_torneo = p.id_torneo
  WHERE a.id_alineacion = p_id_alineacion;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_obtener_jugadores_alineacion;
DELIMITER //
CREATE PROCEDURE sp_obtener_jugadores_alineacion(
  IN p_id_alineacion INT UNSIGNED
)
BEGIN
  SELECT aj.*, j.nombre, j.dorsal, j.posicion
  FROM alineacion_jugador aj
  JOIN jugador j ON j.id_jugador = aj.id_jugador
  WHERE aj.id_alineacion = p_id_alineacion
  ORDER BY aj.rol DESC, j.dorsal ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_crear_alineacion;
DELIMITER //
CREATE PROCEDURE sp_crear_alineacion(
  IN p_id_partido INT UNSIGNED,
  IN p_id_seleccion INT UNSIGNED,
  IN p_formacion_tactica VARCHAR(20),
  IN p_tipo VARCHAR(20),
  IN p_fuente VARCHAR(150),
  IN p_fecha_publicacion TIMESTAMP,
  IN p_estado VARCHAR(20)
)
BEGIN
  INSERT INTO alineacion (id_partido, id_seleccion, formacion_tactica, tipo, fuente, fecha_publicacion, estado)
  VALUES (p_id_partido, p_id_seleccion, p_formacion_tactica, p_tipo, p_fuente, p_fecha_publicacion, p_estado);

  SELECT LAST_INSERT_ID() AS id_alineacion;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_actualizar_alineacion;
DELIMITER //
CREATE PROCEDURE sp_actualizar_alineacion(
  IN p_id_alineacion INT UNSIGNED,
  IN p_id_partido INT UNSIGNED,
  IN p_id_seleccion INT UNSIGNED,
  IN p_formacion_tactica VARCHAR(20),
  IN p_tipo VARCHAR(20),
  IN p_fuente VARCHAR(150),
  IN p_fecha_publicacion TIMESTAMP,
  IN p_estado VARCHAR(20)
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM alineacion WHERE id_alineacion = p_id_alineacion) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Alineación no encontrada.';
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

  SELECT p_id_alineacion AS id_alineacion;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_eliminar_alineacion;
DELIMITER //
CREATE PROCEDURE sp_eliminar_alineacion(
  IN p_id_alineacion INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM alineacion WHERE id_alineacion = p_id_alineacion) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Alineación no encontrada.';
  END IF;

  DELETE FROM alineacion_jugador WHERE id_alineacion = p_id_alineacion;
  DELETE FROM notificacion WHERE id_alineacion = p_id_alineacion;
  DELETE FROM alineacion WHERE id_alineacion = p_id_alineacion;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_limpiar_jugadores_alineacion;
DELIMITER //
CREATE PROCEDURE sp_limpiar_jugadores_alineacion(
  IN p_id_alineacion INT UNSIGNED
)
BEGIN
  DELETE FROM alineacion_jugador WHERE id_alineacion = p_id_alineacion;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_asignar_jugador_alineacion;
DELIMITER //
CREATE PROCEDURE sp_asignar_jugador_alineacion(
  IN p_id_alineacion INT UNSIGNED,
  IN p_id_jugador INT UNSIGNED,
  IN p_rol VARCHAR(15),
  IN p_posicion_cancha VARCHAR(30),
  IN p_minuto_cambio SMALLINT UNSIGNED
)
BEGIN
  INSERT INTO alineacion_jugador (id_alineacion, id_jugador, rol, posicion_cancha, minuto_cambio)
  VALUES (p_id_alineacion, p_id_jugador, p_rol, p_posicion_cancha, p_minuto_cambio)
  ON DUPLICATE KEY UPDATE
    rol = VALUES(rol),
    posicion_cancha = VALUES(posicion_cancha),
    minuto_cambio = VALUES(minuto_cambio);
END //
DELIMITER ;

-- =============================================================================
-- 8. PROCEDIMIENTOS ALMACENADOS: NOTIFICACIONES (CRUD)
-- =============================================================================

DROP PROCEDURE IF EXISTS sp_listar_notificaciones;
DELIMITER //
CREATE PROCEDURE sp_listar_notificaciones()
BEGIN
  SELECT n.*, u.nombre AS usuario_nombre, u.correo,
         a.formacion_tactica, s.nombre AS seleccion_nombre,
         p.fecha, p.estadio
  FROM notificacion n
  JOIN usuario u ON u.id_usuario = n.id_usuario
  JOIN alineacion a ON a.id_alineacion = n.id_alineacion
  JOIN seleccion s ON s.id_seleccion = a.id_seleccion
  JOIN partido p ON p.id_partido = a.id_partido
  ORDER BY n.id_notificacion DESC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_obtener_notificacion;
DELIMITER //
CREATE PROCEDURE sp_obtener_notificacion(
  IN p_id_notificacion INT UNSIGNED
)
BEGIN
  SELECT * FROM notificacion WHERE id_notificacion = p_id_notificacion;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_crear_notificacion;
DELIMITER //
CREATE PROCEDURE sp_crear_notificacion(
  IN p_fecha_envio TIMESTAMP,
  IN p_estado VARCHAR(20),
  IN p_id_usuario INT UNSIGNED,
  IN p_id_alineacion INT UNSIGNED
)
BEGIN
  INSERT INTO notificacion (fecha_envio, estado, id_usuario, id_alineacion)
  VALUES (p_fecha_envio, p_estado, p_id_usuario, p_id_alineacion);

  SELECT LAST_INSERT_ID() AS id_notificacion;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_actualizar_notificacion;
DELIMITER //
CREATE PROCEDURE sp_actualizar_notificacion(
  IN p_id_notificacion INT UNSIGNED,
  IN p_fecha_envio TIMESTAMP,
  IN p_estado VARCHAR(20),
  IN p_id_usuario INT UNSIGNED,
  IN p_id_alineacion INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM notificacion WHERE id_notificacion = p_id_notificacion) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Notificación no encontrada.';
  END IF;

  UPDATE notificacion
  SET fecha_envio = p_fecha_envio,
      estado = p_estado,
      id_usuario = p_id_usuario,
      id_alineacion = p_id_alineacion
  WHERE id_notificacion = p_id_notificacion;

  SELECT p_id_notificacion AS id_notificacion;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_eliminar_notificacion;
DELIMITER //
CREATE PROCEDURE sp_eliminar_notificacion(
  IN p_id_notificacion INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM notificacion WHERE id_notificacion = p_id_notificacion) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Notificación no encontrada.';
  END IF;

  DELETE FROM notificacion WHERE id_notificacion = p_id_notificacion;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS sp_obtener_notificaciones_usuario;
DELIMITER //
CREATE PROCEDURE sp_obtener_notificaciones_usuario(
  IN p_id_usuario INT UNSIGNED
)
BEGIN
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
END //
DELIMITER ;

-- =============================================================================
-- 9. PROCEDIMIENTOS ALMACENADOS DE CONSULTAS E INFORMES OFICIALES (DOCUMENTO)
-- =============================================================================

-- Consulta 1 (Documento pág. 37): Consultar alineaciones confirmadas
DROP PROCEDURE IF EXISTS sp_consultar_alineaciones_confirmadas;
DELIMITER //
CREATE PROCEDURE sp_consultar_alineaciones_confirmadas()
BEGIN
  SELECT
    id_alineacion,
    id_partido,
    id_seleccion,
    formacion_tactica,
    fecha_publicacion
  FROM alineacion
  WHERE estado = 'Confirmada';
END //
DELIMITER ;

-- Consulta 2 (Documento pág. 38): Consultar titulares de una alineación
DROP PROCEDURE IF EXISTS sp_consultar_titulares_alineacion;
DELIMITER //
CREATE PROCEDURE sp_consultar_titulares_alineacion(
  IN p_id_alineacion INT UNSIGNED
)
BEGIN
  SELECT
    j.nombre,
    j.dorsal,
    aj.posicion_cancha
  FROM alineacion_jugador aj
  INNER JOIN jugador j ON aj.id_jugador = j.id_jugador
  WHERE aj.id_alineacion = p_id_alineacion
    AND aj.rol = 'Titular'
  ORDER BY j.dorsal ASC;
END //
DELIMITER ;

-- Consulta 3 (Documento pág. 39): Consultar usuarios con notificaciones activadas
DROP PROCEDURE IF EXISTS sp_consultar_usuarios_notificaciones;
DELIMITER //
CREATE PROCEDURE sp_consultar_usuarios_notificaciones()
BEGIN
  SELECT
    id_usuario,
    nombre,
    correo,
    idioma
  FROM usuario
  WHERE notificaciones = 1
  ORDER BY nombre ASC;
END //
DELIMITER ;

-- Consulta 4 (Documento pág. 39): Consultar alineaciones confirmadas para notificar
DROP PROCEDURE IF EXISTS sp_consultar_alineaciones_para_notificar;
DELIMITER //
CREATE PROCEDURE sp_consultar_alineaciones_para_notificar()
BEGIN
  SELECT
    a.id_alineacion,
    s.nombre AS seleccion_nombre,
    p.fecha,
    p.hora,
    a.formacion_tactica
  FROM alineacion a
  INNER JOIN partido p ON a.id_partido = p.id_partido
  INNER JOIN seleccion s ON a.id_seleccion = s.id_seleccion
  WHERE a.estado = 'Confirmada';
END //
DELIMITER ;

-- Informe de Historial y Rotaciones (Documento numeral 1.4)
DROP PROCEDURE IF EXISTS sp_historial_alineaciones;
DELIMITER //
CREATE PROCEDURE sp_historial_alineaciones(
  IN p_id_seleccion INT UNSIGNED
)
BEGIN
  SELECT ha.*, s.nombre AS seleccion_nombre, p.fecha AS fecha_partido, p.estadio
  FROM historial_alineacion ha
  JOIN seleccion s ON s.id_seleccion = ha.id_seleccion
  JOIN partido p ON p.id_partido = ha.id_partido
  WHERE (p_id_seleccion IS NULL OR ha.id_seleccion = p_id_seleccion)
  ORDER BY ha.fecha_cambio DESC;
END //
DELIMITER ;

-- =============================================================================
-- 10. TRIGGERS (DISPARADORES)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TRIGGER 1: Regla de negocio 1 (Documento pág. 22)
-- "Cada partido debe tener exactamente dos alineaciones oficiales (una por selección)"
-- Valida que no se inserten más de 2 alineaciones en un mismo partido.
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_alineacion_before_insert;
DELIMITER //
CREATE TRIGGER trg_alineacion_before_insert
BEFORE INSERT ON alineacion
FOR EACH ROW
BEGIN
  DECLARE v_total INT;

  SELECT COUNT(*) INTO v_total
  FROM alineacion
  WHERE id_partido = NEW.id_partido;

  IF v_total >= 2 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Regla de negocio 1 violada: Cada partido puede tener un máximo de dos alineaciones oficiales.';
  END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- TRIGGER 2: Generación automática de notificaciones al insertar alineación Confirmada
-- (Objetivo 1.4 y Flujo misional pág. 5)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_alineacion_confirmada_after_insert;
DELIMITER //
CREATE TRIGGER trg_alineacion_confirmada_after_insert
AFTER INSERT ON alineacion
FOR EACH ROW
BEGIN
  IF NEW.estado = 'Confirmada' THEN
    INSERT INTO notificacion (fecha_envio, estado, id_usuario, id_alineacion)
    SELECT NOW(), 'Pendiente', u.id_usuario, NEW.id_alineacion
    FROM usuario u
    WHERE u.notificaciones = 1
      AND NOT EXISTS (
        SELECT 1 FROM notificacion n
        WHERE n.id_usuario = u.id_usuario AND n.id_alineacion = NEW.id_alineacion
      );
  END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- TRIGGER 3: Generación automática de notificaciones al cambiar a Confirmada
-- (Subproceso Confirmación del estado de la alineación pág. 8)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_alineacion_confirmada_after_update;
DELIMITER //
CREATE TRIGGER trg_alineacion_confirmada_after_update
AFTER UPDATE ON alineacion
FOR EACH ROW
BEGIN
  IF NEW.estado = 'Confirmada' AND (OLD.estado <> 'Confirmada' OR OLD.estado IS NULL) THEN
    INSERT INTO notificacion (fecha_envio, estado, id_usuario, id_alineacion)
    SELECT NOW(), 'Pendiente', u.id_usuario, NEW.id_alineacion
    FROM usuario u
    WHERE u.notificaciones = 1
      AND NOT EXISTS (
        SELECT 1 FROM notificacion n
        WHERE n.id_usuario = u.id_usuario AND n.id_alineacion = NEW.id_alineacion
      );
  END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- TRIGGER 4: Auditoría e historial de cambios en alineaciones (Objetivo 1.4 pág. 3)
-- "Registrar el historial de alineaciones de cada selección durante el torneo"
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_alineacion_historial_after_update;
DELIMITER //
CREATE TRIGGER trg_alineacion_historial_after_update
AFTER UPDATE ON alineacion
FOR EACH ROW
BEGIN
  IF (OLD.formacion_tactica <> NEW.formacion_tactica OR OLD.estado <> NEW.estado) THEN
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
      NOW(),
      CASE
        WHEN OLD.estado = 'Probable' AND NEW.estado = 'Confirmada' THEN 'Confirmación oficial de alineación'
        WHEN OLD.formacion_tactica <> NEW.formacion_tactica THEN CONCAT('Ajuste táctico: ', OLD.formacion_tactica, ' a ', NEW.formacion_tactica)
        ELSE 'Modificación de parámetros de la alineación'
      END
    );
  END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- TRIGGER 5: Validación de convocatoria y reglas de rol / minuto al insertar
-- (Integridad referencial y Reglas 5 y 6 del documento pág. 22)
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_aj_before_insert;
DELIMITER //
CREATE TRIGGER trg_aj_before_insert
BEFORE INSERT ON alineacion_jugador
FOR EACH ROW
BEGIN
  DECLARE v_id_sel_ali INT UNSIGNED;
  DECLARE v_id_sel_jug INT UNSIGNED;

  -- 1. Validar que el jugador pertenezca a la selección de la alineación
  SELECT id_seleccion INTO v_id_sel_ali FROM alineacion WHERE id_alineacion = NEW.id_alineacion;
  SELECT id_seleccion INTO v_id_sel_jug FROM jugador WHERE id_jugador = NEW.id_jugador;

  IF v_id_sel_ali IS NOT NULL AND v_id_sel_jug IS NOT NULL AND v_id_sel_ali <> v_id_sel_jug THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Regla de integridad: El jugador convocado debe pertenecer obligatoriamente a la selección de la alineación.';
  END IF;

  -- 2. Regla 5 y 6: El rol es Titular o Suplente; titular no puede tener minuto de cambio
  IF NEW.rol = 'Titular' AND NEW.minuto_cambio IS NOT NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Regla de negocio 6 violada: El minuto de cambio solo podrá registrarse para jugadores suplentes que ingresaron.';
  END IF;

  IF NEW.minuto_cambio IS NOT NULL AND (NEW.minuto_cambio < 1 OR NEW.minuto_cambio > 120) THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Regla de validación: El minuto de cambio debe estar comprendido entre 1 y 120.';
  END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- TRIGGER 6: Validación de reglas de rol / minuto al actualizar en alineacion_jugador
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_aj_before_update;
DELIMITER //
CREATE TRIGGER trg_aj_before_update
BEFORE UPDATE ON alineacion_jugador
FOR EACH ROW
BEGIN
  IF NEW.rol = 'Titular' AND NEW.minuto_cambio IS NOT NULL THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Regla de negocio 6 violada: El minuto de cambio solo podrá registrarse para jugadores suplentes que ingresaron.';
  END IF;

  IF NEW.minuto_cambio IS NOT NULL AND (NEW.minuto_cambio < 1 OR NEW.minuto_cambio > 120) THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Regla de validación: El minuto de cambio debe estar comprendido entre 1 y 120.';
  END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- TRIGGER 7: Regla de negocio 8 (Documento pág. 22) al insertar jugador
-- "El dorsal de un jugador no puede repetirse dentro de una misma selección"
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_jugador_before_insert;
DELIMITER //
CREATE TRIGGER trg_jugador_before_insert
BEFORE INSERT ON jugador
FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM jugador WHERE id_seleccion = NEW.id_seleccion AND dorsal = NEW.dorsal) THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Regla de negocio 8 violada: El dorsal ya está asignado a otro jugador de la misma selección.';
  END IF;
END //
DELIMITER ;

-- -----------------------------------------------------------------------------
-- TRIGGER 8: Regla de negocio 8 al actualizar jugador
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_jugador_before_update;
DELIMITER //
CREATE TRIGGER trg_jugador_before_update
BEFORE UPDATE ON jugador
FOR EACH ROW
BEGIN
  IF (NEW.dorsal <> OLD.dorsal OR NEW.id_seleccion <> OLD.id_seleccion) THEN
    IF EXISTS (
      SELECT 1 FROM jugador 
      WHERE id_seleccion = NEW.id_seleccion 
        AND dorsal = NEW.dorsal 
        AND id_jugador <> OLD.id_jugador
    ) THEN
      SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Regla de negocio 8 violada: El dorsal ya está asignado a otro jugador de la misma selección.';
    END IF;
  END IF;
END //
DELIMITER ;
