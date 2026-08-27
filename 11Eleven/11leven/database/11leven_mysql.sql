-- =============================================================
-- 11LEVEN - ESQUEMA RELACIONAL PARA MYSQL 8 (MULTI-TORNEO)
-- =============================================================
-- Este archivo crea la estructura de la base de datos con soporte
-- para todas las ediciones de la Copa Mundial de la FIFA (2000 - 2026).
--
-- utf8mb4 permite almacenar correctamente nombres internacionales,
-- tildes y caracteres especiales.
CREATE DATABASE IF NOT EXISTS `11leven` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `11leven`;

-- =============================================================
-- LIMPIEZA DEL ESQUEMA ANTERIOR
-- =============================================================
SET FOREIGN_KEY_CHECKS = 0;
DROP VIEW IF EXISTS vista_administrador_datos;
DROP VIEW IF EXISTS vista_usuario_final;
DROP TABLE IF EXISTS notificacion;
DROP TABLE IF EXISTS alineacion_jugador;
DROP TABLE IF EXISTS alineacion;
DROP TABLE IF EXISTS usuario;
DROP TABLE IF EXISTS jugador;
DROP TABLE IF EXISTS seleccion;
DROP TABLE IF EXISTS partido;
DROP TABLE IF EXISTS torneo;
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- TABLA TORNEO
-- =============================================================
-- Representa cada edición de la Copa Mundial de la FIFA.
CREATE TABLE torneo (
  id_torneo INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  anio SMALLINT UNSIGNED NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  pais_sede VARCHAR(120) NOT NULL,
  logo_url VARCHAR(255) NULL,
  campeon VARCHAR(80) NULL,
  subcampeon VARCHAR(80) NULL,
  cantidad_equipos SMALLINT UNSIGNED NOT NULL,
  cantidad_partidos SMALLINT UNSIGNED NOT NULL,
  descripcion VARCHAR(255) NULL,
  CONSTRAINT chk_torneo_anio CHECK (anio BETWEEN 1930 AND 2100)
) ENGINE=InnoDB;

-- =============================================================
-- TABLA PARTIDO
-- =============================================================
-- Almacena la información general de cada encuentro.
-- Por decisión del modelo relacional original, PARTIDO no contiene
-- local/visitante redundantes; los participantes se obtienen mediante:
-- PARTIDO (1:N) -> ALINEACION (N:1) -> SELECCION.
CREATE TABLE partido (
  id_partido INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_torneo INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  estadio VARCHAR(100) NOT NULL,
  fase_torneo VARCHAR(50) NOT NULL,
  estado_partido VARCHAR(20) NOT NULL,
  CONSTRAINT fk_partido_torneo FOREIGN KEY (id_torneo) REFERENCES torneo(id_torneo) ON DELETE CASCADE,
  CONSTRAINT chk_partido_estado CHECK (estado_partido IN ('Programado','En curso','Finalizado','Suspendido')),
  INDEX idx_partido_torneo (id_torneo),
  INDEX idx_partido_fecha (fecha)
) ENGINE=InnoDB;

-- =============================================================
-- TABLA SELECCION
-- =============================================================
-- Registra la delegación/selección que participa en una edición concreta.
CREATE TABLE seleccion (
  id_seleccion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_torneo INT UNSIGNED NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  bandera VARCHAR(255) NULL,
  grupo_fifa CHAR(1) NOT NULL,
  CONSTRAINT fk_seleccion_torneo FOREIGN KEY (id_torneo) REFERENCES torneo(id_torneo) ON DELETE CASCADE,
  CONSTRAINT uq_seleccion_nombre_torneo UNIQUE (nombre, id_torneo),
  INDEX idx_seleccion_torneo (id_torneo)
) ENGINE=InnoDB;

-- =============================================================
-- TABLA JUGADOR
-- =============================================================
-- Contiene los jugadores convocados por cada selección en ese torneo.
CREATE TABLE jugador (
  id_jugador INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  dorsal SMALLINT UNSIGNED NOT NULL,
  posicion VARCHAR(30) NOT NULL,
  id_seleccion INT UNSIGNED NOT NULL,
  CONSTRAINT fk_jugador_seleccion FOREIGN KEY (id_seleccion) REFERENCES seleccion(id_seleccion) ON DELETE CASCADE,
  CONSTRAINT uq_jugador_dorsal_seleccion UNIQUE (id_seleccion, dorsal),
  CONSTRAINT chk_jugador_dorsal CHECK (dorsal BETWEEN 1 AND 99),
  INDEX idx_jugador_seleccion (id_seleccion)
) ENGINE=InnoDB;

-- =============================================================
-- TABLA USUARIO
-- =============================================================
CREATE TABLE usuario (
  id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  idioma VARCHAR(30) NOT NULL,
  notificaciones BOOLEAN NOT NULL,
  CONSTRAINT uq_usuario_correo UNIQUE (correo)
) ENGINE=InnoDB;

-- =============================================================
-- TABLA ALINEACION
-- =============================================================
-- Relaciona un partido con una selección. Cada partido tiene dos alineaciones.
CREATE TABLE alineacion (
  id_alineacion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  id_partido INT UNSIGNED NOT NULL,
  id_seleccion INT UNSIGNED NOT NULL,
  formacion_tactica VARCHAR(20) NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  fuente VARCHAR(150) NOT NULL,
  fecha_publicacion TIMESTAMP NOT NULL,
  estado VARCHAR(20) NOT NULL,
  goles SMALLINT UNSIGNED DEFAULT 0,
  CONSTRAINT fk_alineacion_partido FOREIGN KEY (id_partido) REFERENCES partido(id_partido) ON DELETE CASCADE,
  CONSTRAINT fk_alineacion_seleccion FOREIGN KEY (id_seleccion) REFERENCES seleccion(id_seleccion) ON DELETE CASCADE,
  CONSTRAINT uq_alineacion_partido_seleccion UNIQUE (id_partido, id_seleccion),
  CONSTRAINT chk_alineacion_estado CHECK (estado IN ('Probable','Confirmada')),
  CONSTRAINT chk_alineacion_tipo CHECK (tipo IN ('Titular','Alternativa')),
  INDEX idx_alineacion_estado (estado)
) ENGINE=InnoDB;

-- =============================================================
-- TABLA ASOCIATIVA ALINEACION_JUGADOR
-- =============================================================
CREATE TABLE alineacion_jugador (
  id_alineacion INT UNSIGNED NOT NULL,
  id_jugador INT UNSIGNED NOT NULL,
  rol VARCHAR(15) NOT NULL,
  posicion_cancha VARCHAR(30) NULL,
  minuto_cambio SMALLINT UNSIGNED NULL,
  goles SMALLINT UNSIGNED DEFAULT 0,
  asistencias SMALLINT UNSIGNED DEFAULT 0,
  regates SMALLINT UNSIGNED DEFAULT 0,
  PRIMARY KEY (id_alineacion, id_jugador),
  CONSTRAINT fk_aj_alineacion FOREIGN KEY (id_alineacion) REFERENCES alineacion(id_alineacion) ON DELETE CASCADE,
  CONSTRAINT fk_aj_jugador FOREIGN KEY (id_jugador) REFERENCES jugador(id_jugador) ON DELETE CASCADE,
  CONSTRAINT chk_aj_rol CHECK (rol IN ('Titular','Suplente')),
  CONSTRAINT chk_aj_minuto_solo_suplente CHECK (minuto_cambio IS NULL OR rol='Suplente'),
  CONSTRAINT chk_aj_minuto_rango CHECK (minuto_cambio IS NULL OR minuto_cambio BETWEEN 1 AND 120),
  INDEX idx_aj_jugador (id_jugador)
) ENGINE=InnoDB;

-- =============================================================
-- TABLA NOTIFICACION
-- =============================================================
CREATE TABLE notificacion (
  id_notificacion INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fecha_envio TIMESTAMP NOT NULL,
  estado VARCHAR(20) NOT NULL,
  id_usuario INT UNSIGNED NOT NULL,
  id_alineacion INT UNSIGNED NOT NULL,
  CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  CONSTRAINT fk_notificacion_alineacion FOREIGN KEY (id_alineacion) REFERENCES alineacion(id_alineacion) ON DELETE CASCADE,
  CONSTRAINT chk_notificacion_estado CHECK (estado IN ('Pendiente','Enviada','Fallida'))
) ENGINE=InnoDB;

-- =============================================================
-- VISTA PARA EL ADMINISTRADOR
-- =============================================================
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

-- =============================================================
-- VISTA PARA EL USUARIO FINAL
-- =============================================================
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
