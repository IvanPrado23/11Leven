# 11Leven — Alineaciones del Mundial 2026

11Leven es una aplicación web académica para consultar y administrar selecciones, jugadores, partidos y alineaciones del Mundial 2026. Permite visualizar los titulares sobre una cancha, consultar suplentes, revisar formaciones tácticas y organizar los partidos por grupos y rondas eliminatorias.

El proyecto mantiene el modelo relacional original de la base de datos. En particular, la tabla `PARTIDO` no contiene columnas para selección local y visitante. Los participantes se obtienen mediante la relación:

```text
PARTIDO (1:N) → ALINEACION (N:1) → SELECCION
```

No se agregaron `id_seleccion_local`, `id_seleccion_visitante` ni columnas redundantes.

## Funcionalidades

- Consulta pública de partidos y alineaciones.
- Partidos organizados por grupos A–L.
- Cuadro horizontal para las rondas eliminatorias.
- Sección especial para partidos de prueba o fases personalizadas.
- Banderas y resultados oficiales disponibles.
- Visualización de titulares sobre una cancha de fútbol.
- Distribución basada en la formación táctica.
- Lista separada de suplentes.
- Panel de administración protegido con contraseña.
- Creación, edición y eliminación de selecciones, jugadores, partidos y alineaciones.
- Gestión de usuarios y preferencias de notificación.
- Creación automática de notificaciones internas al confirmar alineaciones.
- Modo usuario con campana flotante y avisos emergentes en la página pública.
- Importación automática de información oficial disponible en FIFA.
- Consultas MySQL parametrizadas para reducir riesgos de inyección SQL.
- Validaciones en frontend, backend y base de datos.

## Tecnologías utilizadas

### Frontend

- **HTML5:** estructura de las páginas, formularios, tarjetas y cancha.
- **CSS3:** diseño verde, blanco y negro, adaptación móvil, grupos y bracket.
- **JavaScript Vanilla:** consumo de la API, renderizado de partidos, formularios y distribución de jugadores. No se utilizan React, Vue ni librerías externas.

### Backend

- **Node.js:** entorno que ejecuta el servidor.
- **Express:** rutas HTTP, API REST, archivos estáticos y control de acceso.
- **mysql2:** conexión asíncrona con MySQL y consultas parametrizadas.
- **dotenv:** lectura de variables privadas desde `backend/.env`.

### Base de datos

- **MySQL 8:** almacenamiento persistente de toda la información.
- Claves primarias y foráneas.
- Restricciones `CHECK` y `UNIQUE`.
- Índices y vistas de consulta.
- Transacciones para guardar alineaciones y jugadores de forma segura.

## Arquitectura

```text
Navegador
   │
   │ HTTP / JSON
   ▼
Node.js + Express
   │
   │ Consultas parametrizadas
   ▼
MySQL — base 11leven
```

El navegador nunca se conecta directamente con MySQL. JavaScript consulta la API de Express y el backend valida las solicitudes antes de ejecutarlas en la base.

## Estructura del proyecto

```text
11leven/
├── backend/
│   ├── config/                 Conexión con MySQL
│   ├── controllers/            Consultas y reglas del backend
│   ├── middleware/             Seguridad del administrador
│   ├── routes/                 Rutas de la API
│   ├── scripts/                Instalación e importación de datos
│   ├── server.js               Servidor principal
│   ├── package.json            Dependencias y comandos
│   ├── .env                    Configuración privada local
│   └── .env.example            Plantilla de configuración
├── database/
│   ├── 11leven_mysql.sql       Esquema, restricciones, reglas y vistas
│   └── poblacion_mundial_2026.sql
├── frontend/
│   ├── css/                    Estilos visuales
│   ├── img/                    Logos y banderas locales
│   ├── js/                     Lógica del navegador
│   ├── index.html              Página principal
│   ├── partido.html            Detalle y cancha
│   ├── login.html              Acceso administrativo
│   └── admin.html              Panel de administración
└── README.md
```

## Modelo de datos

### `seleccion`

Guarda nombre, bandera y grupo FIFA.

### `jugador`

Guarda nombre, dorsal, posición habitual y selección. Una restricción evita dorsales repetidos dentro de la misma selección.

### `partido`

Guarda fecha, hora, estadio, fase y estado. Los equipos no se almacenan directamente en esta tabla.

### `alineacion`

Relaciona un partido con una selección y registra formación, tipo, fuente, fecha de publicación y estado. La combinación partido–selección es única.

### `alineacion_jugador`

Relaciona una alineación con sus jugadores. Registra rol `Titular` o `Suplente`, posición en cancha y minuto de ingreso cuando corresponde. Su clave compuesta impide repetir un jugador en la misma alineación.

### `usuario` y `notificacion`

`usuario` almacena nombre, correo único, idioma y la preferencia para recibir avisos. `notificacion` relaciona un usuario con una alineación y registra fecha y estado `Pendiente`, `Enviada` o `Fallida`.

Cuando una alineación se guarda como `Confirmada`, el backend crea una notificación `Pendiente` para cada usuario con avisos activados. Una comprobación `NOT EXISTS` evita repetir el aviso para la misma combinación de usuario y alineación. Las notificaciones son internas y administrativas; el proyecto no envía correos electrónicos.

En la página pública, una campana flotante permite seleccionar uno de los usuarios con avisos habilitados. La aplicación consulta nuevas notificaciones periódicamente, muestra un aviso emergente y permite abrir directamente el partido relacionado. El navegador recuerda el usuario seleccionado y los avisos ya mostrados mediante `localStorage`.

## Procedencia e importación de los datos

### Selecciones, plantillas y calendario inicial

El archivo `database/poblacion_mundial_2026.sql` contiene los `INSERT` iniciales para selecciones, jugadores y los 104 partidos. Se aplica con:

```bat
npm run db:populate
```

El script utiliza condiciones para evitar duplicados por selección, dorsal y partido.

### Alineaciones, banderas y resultados oficiales

El archivo `backend/scripts/syncFifaLineups.js` consulta la API pública utilizada por FIFA:

```text
https://api.fifa.com/api/v3
```

Primero obtiene el calendario oficial y después consulta el detalle individual de cada partido. De esta información toma:

- Equipos participantes.
- Banderas.
- Resultado.
- Estado del partido.
- Formación táctica.
- Jugadores convocados.
- Dorsal.
- Posición.
- Titulares y suplentes.

La sincronización se ejecuta con:

```bat
npm run db:lineups
```

El comando es repetible: actualiza registros existentes en vez de duplicarlos. Cada jugador se relaciona mediante selección y dorsal; cada alineación mediante partido y selección.

Si FIFA todavía no publica una alineación, no se inventan datos ni se insertan registros vacíos. La interfaz muestra:

```text
Alineación aún no disponible
```

## Visualización de alineaciones

En el detalle de un partido, JavaScript separa titulares y suplentes. Solo los titulares se dibujan sobre la cancha.

Una formación como `4-3-3` se interpreta como:

```text
1 portero
4 defensas
3 mediocampistas
3 delanteros
```

El número del dorsal aparece dentro del marcador y el nombre corto debajo. Cuando no existen coordenadas específicas, la aplicación distribuye los jugadores automáticamente según la formación.

Las formaciones del administrador se seleccionan desde una lista preestablecida. El backend vuelve a validarlas para rechazar valores incorrectos como `191` o `2321`.

Las posiciones también se seleccionan entre `Portero`, `Defensa`, `Mediocampista` y `Delantero`. Una alineación `Confirmada` debe contener exactamente 11 titulares: un portero y la cantidad de defensas, mediocampistas y delanteros indicada por la formación. El backend rechaza cualquier distribución incompatible antes de modificar MySQL.

## Organización de partidos

La portada interpreta `fase_torneo`:

- `Fase de grupos - Grupo A` hasta `Grupo L`: pestañas de grupos.
- `Dieciseisavos de final`: bracket de dieciseisavos.
- `Octavos de final`: bracket de octavos.
- `Cuartos de final`: bracket de cuartos.
- `Semifinal`: bracket de semifinales.
- `Partido por el tercer puesto`: ronda correspondiente.
- `Final`: columna final.

Una fase diferente aparece en **Partidos de prueba / Otros**. Esto permite crear demostraciones sin mezclarlas con el calendario oficial.

## Requisitos

- Node.js 18 o posterior.
- MySQL 8 o compatible.
- Navegador moderno.
- Conexión a internet únicamente para actualizar datos desde FIFA.

## Instalación

### 1. Instalar dependencias

Abre una terminal en `backend`:

```bat
cd "D:\Documentos\11Eleven\11leven\backend"
npm install
```

### 2. Configurar `.env`

Copia `backend/.env.example` como `backend/.env` y configura:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=11leven
ADMIN_PASSWORD=una_contraseña_segura
```

`.env.example` es una plantilla. La aplicación lee `.env`. Este archivo contiene secretos y no debe publicarse en GitHub ni compartirse sin revisar sus valores.

### 3. Crear el esquema

Desde `backend`:

```bat
npm run db:setup
```

> Advertencia: `db:setup` elimina y recrea las tablas. No debe ejecutarse sobre una base con información que se quiera conservar.

### 4. Cargar los datos iniciales

```bat
npm run db:populate
```

### 5. Sincronizar alineaciones oficiales

```bat
npm run db:lineups
```

### 6. Iniciar la aplicación

```bat
npm start
```

Abre:

- Aplicación: [http://localhost:3000](http://localhost:3000)
- Administración: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

La terminal debe permanecer abierta mientras se utiliza la aplicación. Para detenerla se presiona `Ctrl + C`.

## Comandos disponibles

| Comando | Función |
|---|---|
| `npm start` | Inicia el servidor. |
| `npm run dev` | Inicia el servidor con reinicio automático durante desarrollo. |
| `npm run db:setup` | Crea nuevamente el esquema; elimina datos existentes. |
| `npm run db:populate` | Inserta selecciones, jugadores y partidos iniciales. |
| `npm run db:lineups` | Sincroniza alineaciones, banderas, resultados y estados oficiales. |

## Panel de administración

El flujo recomendado es:

1. Crear la selección.
2. Crear sus jugadores.
3. Crear el partido.
4. Crear una alineación por cada selección participante.
5. Seleccionar formación táctica.
6. Marcar jugadores como titulares o suplentes.
7. Registrar fuente, fecha y estado.

Los apartados **Usuarios** y **Notificaciones** permiten administrar las dos tablas restantes del modelo. Para probar la automatización, crea un usuario con avisos activados y guarda una alineación como `Confirmada`; el aviso aparecerá en la pestaña Notificaciones.

Las operaciones de escritura requieren una sesión administrativa. Las consultas públicas pueden realizarse sin iniciar sesión.

## Dónde se guardan los cambios manuales

Los datos creados desde Administración no se escriben en HTML, JavaScript ni en los SQL originales. Se guardan en el servicio MySQL instalado en el computador.

Pueden consultarse en MySQL Workbench mediante:

```text
Schemas → 11leven → Tables → tabla → Select Rows
```

Cerrar el navegador, detener Node.js o reiniciar el computador no elimina esos registros.

## Compartir el proyecto

El código y los datos son elementos diferentes:

- La carpeta o ZIP contiene la aplicación y los scripts iniciales.
- MySQL contiene los cambios realizados manualmente.

Si otra persona ejecuta `db:setup`, `db:populate` y `db:lineups`, reconstruirá los datos oficiales. Para compartir también pruebas manuales se debe exportar la base desde MySQL Workbench:

```text
Server → Data Export → 11leven → Export to Self-Contained File
```

El archivo resultante puede incluirse en `database/` e importarse en el otro computador mediante `Server → Data Import`.

No es necesario incluir `backend/node_modules`; se reconstruye ejecutando `npm install`. Tampoco se recomienda compartir `.env` con contraseñas personales.

## Seguridad

- El administrador se protege mediante `ADMIN_PASSWORD`.
- Las sesiones caducan.
- Los intentos fallidos reciben limitación temporal.
- Las operaciones de escritura requieren autenticación.
- Las consultas utilizan parámetros `?` en lugar de concatenar datos del usuario.
- MySQL aplica restricciones adicionales.
- Para publicar en internet debe utilizarse una contraseña nueva y segura, no `1234`.

La autenticación actual es apropiada para una demostración académica local. Una aplicación pública real debería utilizar usuarios individuales, contraseñas cifradas y almacenamiento persistente de sesiones.

## Errores frecuentes

### `EADDRINUSE: address already in use :::3000`

Ya existe una instancia usando el puerto 3000. No ejecutes `npm start` dos veces. Utiliza la ventana que ya está abierta o detén el servidor anterior con `Ctrl + C`.

### No fue posible conectar con MySQL

Comprueba:

- Que el servicio MySQL esté iniciado.
- Que la contraseña de `backend/.env` sea correcta.
- Que `DB_NAME=11leven`.
- Que el puerto habitual sea `3306`.

### No aparece un partido creado manualmente

- Si la fase coincide con una ronda oficial, aparecerá en el bracket.
- Si contiene `Grupo A`–`Grupo L`, aparecerá en grupos.
- Si es personalizada, aparecerá en **Partidos de prueba / Otros**.

### No aparecen los equipos de un partido

El diseño obtiene los equipos desde `ALINEACION`. Crea una alineación para cada selección participante. Si existe solo una, la interfaz mostrará “Rival por registrar”.

### Los cambios no aparecen en el navegador

Actualiza con `Ctrl + F5`. Si se modificó el backend, detén el servidor con `Ctrl + C` y vuelve a ejecutar `npm start`.

## Alcance académico

11Leven demuestra:

- Diseño y uso de una base relacional.
- Integridad referencial.
- Backend REST con Node.js y Express.
- Consultas SQL parametrizadas.
- Importación y normalización de información externa verificable.
- Administración persistente de datos.
- Visualización dinámica con HTML, CSS y JavaScript Vanilla.
- Separación entre frontend, backend y base de datos.

El objetivo prioritario del proyecto es mantener datos verificables y respetar el modelo original antes que completar información mediante suposiciones.
