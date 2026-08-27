const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Datos maestros de los 7 Mundiales (2000 - 2026)
const TOURNAMENTS = [
  {
    anio: 2002,
    nombre: 'Copa Mundial FIFA Corea/Japón 2002',
    pais_sede: 'Corea del Sur / Japón',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/2002_FIFA_World_Cup.svg/300px-2002_FIFA_World_Cup.svg.png',
    campeon: 'Brasil',
    subcampeon: 'Alemania',
    cantidad_equipos: 32,
    cantidad_partidos: 64,
    descripcion: 'Primer mundial celebrado en Asia y organizado conjuntamente por dos países. Brasil conquistó su pentacampeonato con un estelar Ronaldo.'
  },
  {
    anio: 2006,
    nombre: 'Copa Mundial FIFA Alemania 2006',
    pais_sede: 'Alemania',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/67/2006_FIFA_World_Cup.svg/300px-2006_FIFA_World_Cup.svg.png',
    campeon: 'Italia',
    subcampeon: 'Francia',
    cantidad_equipos: 32,
    cantidad_partidos: 64,
    descripcion: 'Edición inolvidable donde Italia se coronó tetracampeona del mundo tras una emocionante tanda de penales en la final de Berlín.'
  },
  {
    anio: 2010,
    nombre: 'Copa Mundial FIFA Sudáfrica 2010',
    pais_sede: 'Sudáfrica',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e6/2010_FIFA_World_Cup_logo.svg/300px-2010_FIFA_World_Cup_logo.svg.png',
    campeon: 'España',
    subcampeon: 'Países Bajos',
    cantidad_equipos: 32,
    cantidad_partidos: 64,
    descripcion: 'Primer mundial en territorio africano. España logró su primera estrella con el histórico gol de Andrés Iniesta en el minuto 116.'
  },
  {
    anio: 2014,
    nombre: 'Copa Mundial FIFA Brasil 2014',
    pais_sede: 'Brasil',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e8/2014_FIFA_World_Cup.svg/300px-2014_FIFA_World_Cup.svg.png',
    campeon: 'Alemania',
    subcampeon: 'Argentina',
    cantidad_equipos: 32,
    cantidad_partidos: 64,
    descripcion: 'Torneo vibrante en la cuna del fútbol. Alemania se consagró campeona con un golazo de Mario Götze en el tiempo suplementario.'
  },
  {
    anio: 2018,
    nombre: 'Copa Mundial FIFA Rusia 2018',
    pais_sede: 'Rusia',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/67/2018_FIFA_World_Cup.svg/300px-2018_FIFA_World_Cup.svg.png',
    campeon: 'Francia',
    subcampeon: 'Croacia',
    cantidad_equipos: 32,
    cantidad_partidos: 64,
    descripcion: 'Francia levantó su segunda Copa del Mundo con una generación brillante liderada por Kylian Mbappé y Antoine Griezmann en Moscú.'
  },
  {
    anio: 2022,
    nombre: 'Copa Mundial FIFA Catar 2022',
    pais_sede: 'Catar',
    logo_url: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/e3/2022_FIFA_World_Cup.svg/300px-2022_FIFA_World_Cup.svg.png',
    campeon: 'Argentina',
    subcampeon: 'Francia',
    cantidad_equipos: 32,
    cantidad_partidos: 64,
    descripcion: 'Considerada la mejor final de la historia. Lionel Messi levantó el ansiado trofeo para Argentina tras un épico 3-3 y definición por penales.'
  },
  {
    anio: 2026,
    nombre: 'Copa Mundial FIFA Norteamérica 2026',
    pais_sede: 'Canadá / Estados Unidos / México',
    logo_url: 'img/logo-principal.svg',
    campeon: null,
    subcampeon: null,
    cantidad_equipos: 48,
    cantidad_partidos: 104,
    descripcion: 'El primer mundial con 48 selecciones y 104 partidos disputados a lo largo de 16 sedes en tres naciones de Norteamérica.'
  }
];

// Banderas oficiales estándar por código ISO / nombre
const FLAGS = {
  'Argentina': 'https://api.fifa.com/api/v3/picture/flags-sq-4/ARG',
  'Brasil': 'https://api.fifa.com/api/v3/picture/flags-sq-4/BRA',
  'Brazil': 'https://api.fifa.com/api/v3/picture/flags-sq-4/BRA',
  'Alemania': 'https://api.fifa.com/api/v3/picture/flags-sq-4/GER',
  'Germany': 'https://api.fifa.com/api/v3/picture/flags-sq-4/GER',
  'Francia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/FRA',
  'France': 'https://api.fifa.com/api/v3/picture/flags-sq-4/FRA',
  'España': 'https://api.fifa.com/api/v3/picture/flags-sq-4/ESP',
  'Spain': 'https://api.fifa.com/api/v3/picture/flags-sq-4/ESP',
  'Italia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/ITA',
  'Italy': 'https://api.fifa.com/api/v3/picture/flags-sq-4/ITA',
  'Inglaterra': 'https://api.fifa.com/api/v3/picture/flags-sq-4/ENG',
  'England': 'https://api.fifa.com/api/v3/picture/flags-sq-4/ENG',
  'Croacia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CRO',
  'Croatia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CRO',
  'Países Bajos': 'https://api.fifa.com/api/v3/picture/flags-sq-4/NED',
  'Netherlands': 'https://api.fifa.com/api/v3/picture/flags-sq-4/NED',
  'Portugal': 'https://api.fifa.com/api/v3/picture/flags-sq-4/POR',
  'Uruguay': 'https://api.fifa.com/api/v3/picture/flags-sq-4/URU',
  'Marruecos': 'https://api.fifa.com/api/v3/picture/flags-sq-4/MAR',
  'Morocco': 'https://api.fifa.com/api/v3/picture/flags-sq-4/MAR',
  'Bélgica': 'https://api.fifa.com/api/v3/picture/flags-sq-4/BEL',
  'Belgium': 'https://api.fifa.com/api/v3/picture/flags-sq-4/BEL',
  'México': 'https://api.fifa.com/api/v3/picture/flags-sq-4/MEX',
  'Mexico': 'https://api.fifa.com/api/v3/picture/flags-sq-4/MEX',
  'Estados Unidos': 'https://api.fifa.com/api/v3/picture/flags-sq-4/USA',
  'USA': 'https://api.fifa.com/api/v3/picture/flags-sq-4/USA',
  'United States': 'https://api.fifa.com/api/v3/picture/flags-sq-4/USA',
  'Canadá': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CAN',
  'Canada': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CAN',
  'Japón': 'https://api.fifa.com/api/v3/picture/flags-sq-4/JPN',
  'Japan': 'https://api.fifa.com/api/v3/picture/flags-sq-4/JPN',
  'Corea del Sur': 'https://api.fifa.com/api/v3/picture/flags-sq-4/KOR',
  'South Korea': 'https://api.fifa.com/api/v3/picture/flags-sq-4/KOR',
  'Korea Republic': 'https://api.fifa.com/api/v3/picture/flags-sq-4/KOR',
  'Turquía': 'https://api.fifa.com/api/v3/picture/flags-sq-4/TUR',
  'Turkey': 'https://api.fifa.com/api/v3/picture/flags-sq-4/TUR',
  'Türkiye': 'https://api.fifa.com/api/v3/picture/flags-sq-4/TUR',
  'Colombia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/COL',
  'Chile': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CHI',
  'Ecuador': 'https://api.fifa.com/api/v3/picture/flags-sq-4/ECU',
  'Paraguay': 'https://api.fifa.com/api/v3/picture/flags-sq-4/PAR',
  'Senegal': 'https://api.fifa.com/api/v3/picture/flags-sq-4/SEN',
  'Ghana': 'https://api.fifa.com/api/v3/picture/flags-sq-4/GHA',
  'Nigeria': 'https://api.fifa.com/api/v3/picture/flags-sq-4/NGA',
  'Camerún': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CMR',
  'Cameroon': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CMR',
  'Costa de Marfil': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CIV',
  'Ivory Coast': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CIV',
  "Côte d'Ivoire": 'https://api.fifa.com/api/v3/picture/flags-sq-4/CIV',
  'Costa Rica': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CRC',
  'Panamá': 'https://api.fifa.com/api/v3/picture/flags-sq-4/PAN',
  'Panama': 'https://api.fifa.com/api/v3/picture/flags-sq-4/PAN',
  'Suecia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/SWE',
  'Sweden': 'https://api.fifa.com/api/v3/picture/flags-sq-4/SWE',
  'Suiza': 'https://api.fifa.com/api/v3/picture/flags-sq-4/SUI',
  'Switzerland': 'https://api.fifa.com/api/v3/picture/flags-sq-4/SUI',
  'Polonia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/POL',
  'Poland': 'https://api.fifa.com/api/v3/picture/flags-sq-4/POL',
  'Dinamarca': 'https://api.fifa.com/api/v3/picture/flags-sq-4/DEN',
  'Denmark': 'https://api.fifa.com/api/v3/picture/flags-sq-4/DEN',
  'Rusia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/RUS',
  'Russia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/RUS',
  'Catar': 'https://api.fifa.com/api/v3/picture/flags-sq-4/QAT',
  'Qatar': 'https://api.fifa.com/api/v3/picture/flags-sq-4/QAT',
  'Arabia Saudita': 'https://api.fifa.com/api/v3/picture/flags-sq-4/KSA',
  'Saudi Arabia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/KSA',
  'Irán': 'https://api.fifa.com/api/v3/picture/flags-sq-4/IRN',
  'Iran': 'https://api.fifa.com/api/v3/picture/flags-sq-4/IRN',
  'IR Iran': 'https://api.fifa.com/api/v3/picture/flags-sq-4/IRN',
  'Australia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/AUS',
  'Sudáfrica': 'https://api.fifa.com/api/v3/picture/flags-sq-4/RSA',
  'South Africa': 'https://api.fifa.com/api/v3/picture/flags-sq-4/RSA',
  'Argelia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/ALG',
  'Algeria': 'https://api.fifa.com/api/v3/picture/flags-sq-4/ALG',
  'Túnez': 'https://api.fifa.com/api/v3/picture/flags-sq-4/TUN',
  'Tunisia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/TUN',
  'Egipto': 'https://api.fifa.com/api/v3/picture/flags-sq-4/EGY',
  'Egypt': 'https://api.fifa.com/api/v3/picture/flags-sq-4/EGY',
  'Grecia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/GRE',
  'Greece': 'https://api.fifa.com/api/v3/picture/flags-sq-4/GRE',
  'Eslovaquia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/SVK',
  'Slovakia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/SVK',
  'Eslovenia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/SVN',
  'Slovenia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/SVN',
  'República Checa': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CZE',
  'Czech Republic': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CZE',
  'Czechia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CZE',
  'Ucrania': 'https://api.fifa.com/api/v3/picture/flags-sq-4/UKR',
  'Ukraine': 'https://api.fifa.com/api/v3/picture/flags-sq-4/UKR',
  'Perú': 'https://api.fifa.com/api/v3/picture/flags-sq-4/PER',
  'Peru': 'https://api.fifa.com/api/v3/picture/flags-sq-4/PER',
  'Islandia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/ISL',
  'Iceland': 'https://api.fifa.com/api/v3/picture/flags-sq-4/ISL',
  'Gales': 'https://api.fifa.com/api/v3/picture/flags-sq-4/WAL',
  'Wales': 'https://api.fifa.com/api/v3/picture/flags-sq-4/WAL',
  'Haití': 'https://api.fifa.com/api/v3/picture/flags-sq-4/HAI',
  'Haiti': 'https://api.fifa.com/api/v3/picture/flags-sq-4/HAI',
  'Curaçao': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CUW',
  'Nueva Zelanda': 'https://api.fifa.com/api/v3/picture/flags-sq-4/NZL',
  'New Zealand': 'https://api.fifa.com/api/v3/picture/flags-sq-4/NZL',
  'Cabo Verde': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CPV',
  'Cape Verde': 'https://api.fifa.com/api/v3/picture/flags-sq-4/CPV',
  'Irak': 'https://api.fifa.com/api/v3/picture/flags-sq-4/IRQ',
  'Iraq': 'https://api.fifa.com/api/v3/picture/flags-sq-4/IRQ',
  'Noruega': 'https://api.fifa.com/api/v3/picture/flags-sq-4/NOR',
  'Norway': 'https://api.fifa.com/api/v3/picture/flags-sq-4/NOR',
  'Austria': 'https://api.fifa.com/api/v3/picture/flags-sq-4/AUT',
  'Jordania': 'https://api.fifa.com/api/v3/picture/flags-sq-4/JOR',
  'Jordan': 'https://api.fifa.com/api/v3/picture/flags-sq-4/JOR',
  'RD Congo': 'https://api.fifa.com/api/v3/picture/flags-sq-4/COD',
  'DR Congo': 'https://api.fifa.com/api/v3/picture/flags-sq-4/COD',
  'Congo DR': 'https://api.fifa.com/api/v3/picture/flags-sq-4/COD',
  'Uzbekistán': 'https://api.fifa.com/api/v3/picture/flags-sq-4/UZB',
  'Uzbekistan': 'https://api.fifa.com/api/v3/picture/flags-sq-4/UZB',
  'Escocia': 'https://api.fifa.com/api/v3/picture/flags-sq-4/SCO',
  'Scotland': 'https://api.fifa.com/api/v3/picture/flags-sq-4/SCO',
  'Bosnia y Herzegovina': 'https://api.fifa.com/api/v3/picture/flags-sq-4/BIH',
  'Bosnia and Herzegovina': 'https://api.fifa.com/api/v3/picture/flags-sq-4/BIH'
};

function getFlag(name) {
  return FLAGS[name] || `https://api.fifa.com/api/v3/picture/flags-sq-4/${name.slice(0, 3).toUpperCase()}`;
}

// Generador de plantillas históricas por país y año
const SQUADS_BY_YEAR = {
  2002: {
    'Brasil': [
      { n: 'Marcos', d: 1, p: 'Portero' }, { n: 'Cafu', d: 2, p: 'Defensa' }, { n: 'Lúcio', d: 3, p: 'Defensa' }, { n: 'Roque Júnior', d: 4, p: 'Defensa' },
      { n: 'Edmílson', d: 5, p: 'Defensa' }, { n: 'Roberto Carlos', d: 6, p: 'Defensa' }, { n: 'Ricardinho', d: 7, p: 'Mediocampista' }, { n: 'Gilberto Silva', d: 8, p: 'Mediocampista' },
      { n: 'Ronaldo', d: 9, p: 'Delantero' }, { n: 'Rivaldo', d: 10, p: 'Delantero' }, { n: 'Ronaldinho', d: 11, p: 'Delantero' }, { n: 'Dida', d: 12, p: 'Portero' },
      { n: 'Juliano Belletti', d: 13, p: 'Defensa' }, { n: 'Ânderson Polga', d: 14, p: 'Defensa' }, { n: 'Kléberson', d: 15, p: 'Mediocampista' }, { n: 'Júnior', d: 16, p: 'Defensa' },
      { n: 'Denílson', d: 17, p: 'Delantero' }, { n: 'Vampeta', d: 18, p: 'Mediocampista' }, { n: 'Juninho Paulista', d: 19, p: 'Mediocampista' }, { n: 'Edílson', d: 20, p: 'Delantero' },
      { n: 'Luizão', d: 21, p: 'Delantero' }, { n: 'Rogério Ceni', d: 22, p: 'Portero' }, { n: 'Kaká', d: 23, p: 'Mediocampista' }
    ],
    'Alemania': [
      { n: 'Oliver Kahn', d: 1, p: 'Portero' }, { n: 'Thomas Linke', d: 2, p: 'Defensa' }, { n: 'Marko Rehmer', d: 3, p: 'Defensa' }, { n: 'Frank Baumann', d: 4, p: 'Defensa' },
      { n: 'Carsten Ramelow', d: 5, p: 'Defensa' }, { n: 'Christian Ziege', d: 6, p: 'Defensa' }, { n: 'Oliver Neuville', d: 7, p: 'Delantero' }, { n: 'Dietmar Hamann', d: 8, p: 'Mediocampista' },
      { n: 'Carsten Jancker', d: 9, p: 'Delantero' }, { n: 'Lars Ricken', d: 10, p: 'Mediocampista' }, { n: 'Miroslav Klose', d: 11, p: 'Delantero' }, { n: 'Jens Lehmann', d: 12, p: 'Portero' },
      { n: 'Michael Ballack', d: 13, p: 'Mediocampista' }, { n: 'Gerald Asamoah', d: 14, p: 'Delantero' }, { n: 'Sebastian Kehl', d: 15, p: 'Mediocampista' }, { n: 'Jens Jeremies', d: 16, p: 'Mediocampista' },
      { n: 'Marco Bode', d: 17, p: 'Mediocampista' }, { n: 'Jörg Böhme', d: 18, p: 'Mediocampista' }, { n: 'Bernd Schneider', d: 19, p: 'Mediocampista' }, { n: 'Oliver Bierhoff', d: 20, p: 'Delantero' },
      { n: 'Christoph Metzelder', d: 21, p: 'Defensa' }, { n: 'Torsten Frings', d: 22, p: 'Mediocampista' }, { n: 'Hans-Jörg Butt', d: 23, p: 'Portero' }
    ]
  },
  2006: {
    'Italia': [
      { n: 'Gianluigi Buffon', d: 1, p: 'Portero' }, { n: 'Cristian Zaccardo', d: 2, p: 'Defensa' }, { n: 'Fabio Grosso', d: 3, p: 'Defensa' }, { n: 'Daniele De Rossi', d: 4, p: 'Mediocampista' },
      { n: 'Fabio Cannavaro', d: 5, p: 'Defensa' }, { n: 'Andrea Barzagli', d: 6, p: 'Defensa' }, { n: 'Alessandro Del Piero', d: 7, p: 'Delantero' }, { n: 'Gennaro Gattuso', d: 8, p: 'Mediocampista' },
      { n: 'Luca Toni', d: 9, p: 'Delantero' }, { n: 'Francesco Totti', d: 10, p: 'Delantero' }, { n: 'Alberto Gilardino', d: 11, p: 'Delantero' }, { n: 'Angelo Peruzzi', d: 12, p: 'Portero' },
      { n: 'Alessandro Nesta', d: 13, p: 'Defensa' }, { n: 'Marco Amelia', d: 14, p: 'Portero' }, { n: 'Vincenzo Iaquinta', d: 15, p: 'Delantero' }, { n: 'Mauro Camoranesi', d: 16, p: 'Mediocampista' },
      { n: 'Simone Barone', d: 17, p: 'Mediocampista' }, { n: 'Filippo Inzaghi', d: 18, p: 'Delantero' }, { n: 'Gianluca Zambrotta', d: 19, p: 'Defensa' }, { n: 'Simone Perrotta', d: 20, p: 'Mediocampista' },
      { n: 'Andrea Pirlo', d: 21, p: 'Mediocampista' }, { n: 'Massimo Oddo', d: 22, p: 'Defensa' }, { n: 'Marco Materazzi', d: 23, p: 'Defensa' }
    ],
    'Francia': [
      { n: 'Mickaël Landreau', d: 1, p: 'Portero' }, { n: 'Jean-Alain Boumsong', d: 2, p: 'Defensa' }, { n: 'Eric Abidal', d: 3, p: 'Defensa' }, { n: 'Patrick Vieira', d: 4, p: 'Mediocampista' },
      { n: 'William Gallas', d: 5, p: 'Defensa' }, { n: 'Claude Makélélé', d: 6, p: 'Mediocampista' }, { n: 'Florent Malouda', d: 7, p: 'Mediocampista' }, { n: 'Vikash Dhorasoo', d: 8, p: 'Mediocampista' },
      { n: 'Sidney Govou', d: 9, p: 'Delantero' }, { n: 'Zinedine Zidane', d: 10, p: 'Mediocampista' }, { n: 'Sylvain Wiltord', d: 11, p: 'Delantero' }, { n: 'Thierry Henry', d: 12, p: 'Delantero' },
      { n: 'Mikaël Silvestre', d: 13, p: 'Defensa' }, { n: 'Louis Saha', d: 14, p: 'Delantero' }, { n: 'Lilian Thuram', d: 15, p: 'Defensa' }, { n: 'Fabien Barthez', d: 16, p: 'Portero' },
      { n: 'Gaël Givet', d: 17, p: 'Defensa' }, { n: 'Alou Diarra', d: 18, p: 'Mediocampista' }, { n: 'Willy Sagnol', d: 19, p: 'Defensa' }, { n: 'David Trezeguet', d: 20, p: 'Delantero' },
      { n: 'Pascal Chimbonda', d: 21, p: 'Defensa' }, { n: 'Franck Ribéry', d: 22, p: 'Mediocampista' }, { n: 'Grégory Coupet', d: 23, p: 'Portero' }
    ]
  },
  2010: {
    'España': [
      { n: 'Iker Casillas', d: 1, p: 'Portero' }, { n: 'Raúl Albiol', d: 2, p: 'Defensa' }, { n: 'Gerard Piqué', d: 3, p: 'Defensa' }, { n: 'Carlos Marchena', d: 4, p: 'Defensa' },
      { n: 'Carles Puyol', d: 5, p: 'Defensa' }, { n: 'Andrés Iniesta', d: 6, p: 'Mediocampista' }, { n: 'David Villa', d: 7, p: 'Delantero' }, { n: 'Xavi Hernández', d: 8, p: 'Mediocampista' },
      { n: 'Fernando Torres', d: 9, p: 'Delantero' }, { n: 'Cesc Fàbregas', d: 10, p: 'Mediocampista' }, { n: 'Joan Capdevila', d: 11, p: 'Defensa' }, { n: 'Víctor Valdés', d: 12, p: 'Portero' },
      { n: 'Juan Mata', d: 13, p: 'Delantero' }, { n: 'Xabi Alonso', d: 14, p: 'Mediocampista' }, { n: 'Sergio Ramos', d: 15, p: 'Defensa' }, { n: 'Sergio Busquets', d: 16, p: 'Mediocampista' },
      { n: 'Álvaro Arbeloa', d: 17, p: 'Defensa' }, { n: 'Pedro Rodríguez', d: 18, p: 'Delantero' }, { n: 'Fernando Llorente', d: 19, p: 'Delantero' }, { n: 'Javi Martínez', d: 20, p: 'Mediocampista' },
      { n: 'David Silva', d: 21, p: 'Mediocampista' }, { n: 'Jesús Navas', d: 22, p: 'Delantero' }, { n: 'Pepe Reina', d: 23, p: 'Portero' }
    ],
    'Países Bajos': [
      { n: 'Maarten Stekelenburg', d: 1, p: 'Portero' }, { n: 'Gregory van der Wiel', d: 2, p: 'Defensa' }, { n: 'John Heitinga', d: 3, p: 'Defensa' }, { n: 'Joris Mathijsen', d: 4, p: 'Defensa' },
      { n: 'Giovanni van Bronckhorst', d: 5, p: 'Defensa' }, { n: 'Mark van Bommel', d: 6, p: 'Mediocampista' }, { n: 'Dirk Kuyt', d: 7, p: 'Delantero' }, { n: 'Nigel de Jong', d: 8, p: 'Mediocampista' },
      { n: 'Robin van Persie', d: 9, p: 'Delantero' }, { n: 'Wesley Sneijder', d: 10, p: 'Mediocampista' }, { n: 'Arjen Robben', d: 11, p: 'Delantero' }, { n: 'Michel Vorm', d: 12, p: 'Portero' },
      { n: 'André Ooijer', d: 13, p: 'Defensa' }, { n: 'Demy de Zeeuw', d: 14, p: 'Mediocampista' }, { n: 'Edson Braafheid', d: 15, p: 'Defensa' }, { n: 'Michel Vorm', d: 16, p: 'Portero' },
      { n: 'Eljero Elia', d: 17, p: 'Delantero' }, { n: 'Stijn Schaars', d: 18, p: 'Mediocampista' }, { n: 'Ryan Babel', d: 19, p: 'Delantero' }, { n: 'Ibrahim Afellay', d: 20, p: 'Mediocampista' },
      { n: 'Klaas-Jan Huntelaar', d: 21, p: 'Delantero' }, { n: 'Sander Boschker', d: 22, p: 'Portero' }, { n: 'Rafael van der Vaart', d: 23, p: 'Mediocampista' }
    ]
  },
  2014: {
    'Alemania': [
      { n: 'Manuel Neuer', d: 1, p: 'Portero' }, { n: 'Kevin Großkreutz', d: 2, p: 'Defensa' }, { n: 'Matthias Ginter', d: 3, p: 'Defensa' }, { n: 'Benedikt Höwedes', d: 4, p: 'Defensa' },
      { n: 'Mats Hummels', d: 5, p: 'Defensa' }, { n: 'Sami Khedira', d: 6, p: 'Mediocampista' }, { n: 'Bastian Schweinsteiger', d: 7, p: 'Mediocampista' }, { n: 'Mesut Özil', d: 8, p: 'Mediocampista' },
      { n: 'André Schürrle', d: 9, p: 'Delantero' }, { n: 'Lukas Podolski', d: 10, p: 'Delantero' }, { n: 'Miroslav Klose', d: 11, p: 'Delantero' }, { n: 'Ron-Robert Zieler', d: 12, p: 'Portero' },
      { n: 'Thomas Müller', d: 13, p: 'Delantero' }, { n: 'Julian Draxler', d: 14, p: 'Mediocampista' }, { n: 'Erik Durm', d: 15, p: 'Defensa' }, { n: 'Philipp Lahm', d: 16, p: 'Defensa' },
      { n: 'Per Mertesacker', d: 17, p: 'Defensa' }, { n: 'Toni Kroos', d: 18, p: 'Mediocampista' }, { n: 'Mario Götze', d: 19, p: 'Mediocampista' }, { n: 'Jérôme Boateng', d: 20, p: 'Defensa' },
      { n: 'Shkodran Mustafi', d: 21, p: 'Defensa' }, { n: 'Roman Weidenfeller', d: 22, p: 'Portero' }, { n: 'Christoph Kramer', d: 23, p: 'Mediocampista' }
    ],
    'Argentina': [
      { n: 'Sergio Romero', d: 1, p: 'Portero' }, { n: 'Ezequiel Garay', d: 2, p: 'Defensa' }, { n: 'Hugo Campagnaro', d: 3, p: 'Defensa' }, { n: 'Pablo Zabaleta', d: 4, p: 'Defensa' },
      { n: 'Fernando Gago', d: 5, p: 'Mediocampista' }, { n: 'Lucas Biglia', d: 6, p: 'Mediocampista' }, { n: 'Ángel Di María', d: 7, p: 'Mediocampista' }, { n: 'Enzo Pérez', d: 8, p: 'Mediocampista' },
      { n: 'Gonzalo Higuaín', d: 9, p: 'Delantero' }, { n: 'Lionel Messi', d: 10, p: 'Delantero' }, { n: 'Maxi Rodríguez', d: 11, p: 'Mediocampista' }, { n: 'Agustín Orión', d: 12, p: 'Portero' },
      { n: 'Augusto Fernández', d: 13, p: 'Mediocampista' }, { n: 'Javier Mascherano', d: 14, p: 'Mediocampista' }, { n: 'Martín Demichelis', d: 15, p: 'Defensa' }, { n: 'Marcos Rojo', d: 16, p: 'Defensa' },
      { n: 'Federico Fernández', d: 17, p: 'Defensa' }, { n: 'Rodrigo Palacio', d: 18, p: 'Delantero' }, { n: 'Ricky Álvarez', d: 19, p: 'Mediocampista' }, { n: 'Sergio Agüero', d: 20, p: 'Delantero' },
      { n: 'Mariano Andújar', d: 21, p: 'Portero' }, { n: 'Ezequiel Lavezzi', d: 22, p: 'Delantero' }, { n: 'José Basanta', d: 23, p: 'Defensa' }
    ]
  },
  2018: {
    'Francia': [
      { n: 'Hugo Lloris', d: 1, p: 'Portero' }, { n: 'Benjamin Pavard', d: 2, p: 'Defensa' }, { n: 'Presnel Kimpembe', d: 3, p: 'Defensa' }, { n: 'Raphaël Varane', d: 4, p: 'Defensa' },
      { n: 'Samuel Umtiti', d: 5, p: 'Defensa' }, { n: 'Paul Pogba', d: 6, p: 'Mediocampista' }, { n: 'Antoine Griezmann', d: 7, p: 'Delantero' }, { n: 'Thomas Lemar', d: 8, p: 'Mediocampista' },
      { n: 'Olivier Giroud', d: 9, p: 'Delantero' }, { n: 'Kylian Mbappé', d: 10, p: 'Delantero' }, { n: 'Ousmane Dembélé', d: 11, p: 'Delantero' }, { n: 'Corentin Tolisso', d: 12, p: 'Mediocampista' },
      { n: 'N\'Golo Kanté', d: 13, p: 'Mediocampista' }, { n: 'Blaise Matuidi', d: 14, p: 'Mediocampista' }, { n: 'Steven Nzonzi', d: 15, p: 'Mediocampista' }, { n: 'Steve Mandanda', d: 16, p: 'Portero' },
      { n: 'Adil Rami', d: 17, p: 'Defensa' }, { n: 'Nabil Fekir', d: 18, p: 'Delantero' }, { n: 'Djibril Sidibé', d: 19, p: 'Defensa' }, { n: 'Florian Thauvin', d: 20, p: 'Delantero' },
      { n: 'Lucas Hernández', d: 21, p: 'Defensa' }, { n: 'Benjamin Mendy', d: 22, p: 'Defensa' }, { n: 'Alphonse Areola', d: 23, p: 'Portero' }
    ],
    'Croacia': [
      { n: 'Dominik Livaković', d: 1, p: 'Portero' }, { n: 'Šime Vrsaljko', d: 2, p: 'Defensa' }, { n: 'Ivan Strinić', d: 3, p: 'Defensa' }, { n: 'Ivan Perišić', d: 4, p: 'Mediocampista' },
      { n: 'Vedran Ćorluka', d: 5, p: 'Defensa' }, { n: 'Dejan Lovren', d: 6, p: 'Defensa' }, { n: 'Ivan Rakitić', d: 7, p: 'Mediocampista' }, { n: 'Mateo Kovačić', d: 8, p: 'Mediocampista' },
      { n: 'Andrej Kramarić', d: 9, p: 'Delantero' }, { n: 'Luka Modrić', d: 10, p: 'Mediocampista' }, { n: 'Marcelo Brozović', d: 11, p: 'Mediocampista' }, { n: 'Lovre Kalinić', d: 12, p: 'Portero' },
      { n: 'Tin Jedvaj', d: 13, p: 'Defensa' }, { n: 'Filip Bradarić', d: 14, p: 'Mediocampista' }, { n: 'Duje Ćaleta-Car', d: 15, p: 'Defensa' }, { n: 'Nikola Kalinić', d: 16, p: 'Delantero' },
      { n: 'Mario Mandžukić', d: 17, p: 'Delantero' }, { n: 'Ante Rebić', d: 18, p: 'Delantero' }, { n: 'Milan Badelj', d: 19, p: 'Mediocampista' }, { n: 'Marko Pjaca', d: 20, p: 'Delantero' },
      { n: 'Domagoj Vida', d: 21, p: 'Defensa' }, { n: 'Josip Pivarić', d: 22, p: 'Defensa' }, { n: 'Danijel Subašić', d: 23, p: 'Portero' }
    ]
  },
  2022: {
    'Argentina': [
      { n: 'Franco Armani', d: 1, p: 'Portero' }, { n: 'Juan Foyth', d: 2, p: 'Defensa' }, { n: 'Nicolás Tagliafico', d: 3, p: 'Defensa' }, { n: 'Gonzalo Montiel', d: 4, p: 'Defensa' },
      { n: 'Leandro Paredes', d: 5, p: 'Mediocampista' }, { n: 'Germán Pezzella', d: 6, p: 'Defensa' }, { n: 'Rodrigo De Paul', d: 7, p: 'Mediocampista' }, { n: 'Marcos Acuña', d: 8, p: 'Defensa' },
      { n: 'Julián Álvarez', d: 9, p: 'Delantero' }, { n: 'Lionel Messi', d: 10, p: 'Delantero' }, { n: 'Ángel Di María', d: 11, p: 'Delantero' }, { n: 'Gerónimo Rulli', d: 12, p: 'Portero' },
      { n: 'Cristian Romero', d: 13, p: 'Defensa' }, { n: 'Exequiel Palacios', d: 14, p: 'Mediocampista' }, { n: 'Ángel Correa', d: 15, p: 'Delantero' }, { n: 'Thiago Almada', d: 16, p: 'Mediocampista' },
      { n: 'Papu Gómez', d: 17, p: 'Mediocampista' }, { n: 'Guido Rodríguez', d: 18, p: 'Mediocampista' }, { n: 'Nicolás Otamendi', d: 19, p: 'Defensa' }, { n: 'Alexis Mac Allister', d: 20, p: 'Mediocampista' },
      { n: 'Paulo Dybala', d: 21, p: 'Delantero' }, { n: 'Lautaro Martínez', d: 22, p: 'Delantero' }, { n: 'Emiliano Martínez', d: 23, p: 'Portero' }, { n: 'Enzo Fernández', d: 24, p: 'Mediocampista' },
      { n: 'Lisandro Martínez', d: 25, p: 'Defensa' }, { n: 'Nahuel Molina', d: 26, p: 'Defensa' }
    ],
    'Francia': [
      { n: 'Hugo Lloris', d: 1, p: 'Portero' }, { n: 'Benjamin Pavard', d: 2, p: 'Defensa' }, { n: 'Axel Disasi', d: 3, p: 'Defensa' }, { n: 'Raphaël Varane', d: 4, p: 'Defensa' },
      { n: 'Jules Koundé', d: 5, p: 'Defensa' }, { n: 'Mattéo Guendouzi', d: 6, p: 'Mediocampista' }, { n: 'Antoine Griezmann', d: 7, p: 'Delantero' }, { n: 'Aurélien Tchouaméni', d: 8, p: 'Mediocampista' },
      { n: 'Olivier Giroud', d: 9, p: 'Delantero' }, { n: 'Kylian Mbappé', d: 10, p: 'Delantero' }, { n: 'Ousmane Dembélé', d: 11, p: 'Delantero' }, { n: 'Randal Kolo Muani', d: 12, p: 'Delantero' },
      { n: 'Youssouf Fofana', d: 13, p: 'Mediocampista' }, { n: 'Adrien Rabiot', d: 14, p: 'Mediocampista' }, { n: 'Jordan Veretout', d: 15, p: 'Mediocampista' }, { n: 'Steve Mandanda', d: 16, p: 'Portero' },
      { n: 'William Saliba', d: 17, p: 'Defensa' }, { n: 'Dayot Upamecano', d: 18, p: 'Defensa' }, { n: 'Karim Benzema', d: 19, p: 'Delantero' }, { n: 'Kingsley Coman', d: 20, p: 'Delantero' },
      { n: 'Lucas Hernández', d: 21, p: 'Defensa' }, { n: 'Théo Hernández', d: 22, p: 'Defensa' }, { n: 'Alphonse Areola', d: 23, p: 'Portero' }, { n: 'Ibrahima Konaté', d: 24, p: 'Defensa' },
      { n: 'Eduardo Camavinga', d: 25, p: 'Mediocampista' }, { n: 'Marcus Thuram', d: 26, p: 'Delantero' }
    ]
  }
};

// Generador genérico de jugadores para completar plantillas
function generateSquad(teamName, count = 23) {
  const positions = ['Portero', 'Defensa', 'Defensa', 'Defensa', 'Defensa', 'Mediocampista', 'Mediocampista', 'Mediocampista', 'Delantero', 'Delantero', 'Delantero'];
  const players = [];
  for (let d = 1; d <= count; d++) {
    const pos = d === 1 || d === 12 || d === 23 ? 'Portero' : (d <= 6 ? 'Defensa' : (d <= 14 ? 'Mediocampista' : 'Delantero'));
    players.push({
      n: `${teamName} Jugador ${d}`,
      d,
      p: pos
    });
  }
  return players;
}

// Estructura de grupos de los Mundiales de 32 equipos (2002 a 2022)
const GROUPS_32 = {
  2002: {
    A: ['Dinamarca', 'Senegal', 'Uruguay', 'Francia'],
    B: ['España', 'Paraguay', 'Sudáfrica', 'Eslovenia'],
    C: ['Brasil', 'Turquía', 'Costa Rica', 'China'],
    D: ['Corea del Sur', 'Estados Unidos', 'Portugal', 'Polonia'],
    E: ['Alemania', 'Irlanda', 'Camerún', 'Arabia Saudita'],
    F: ['Suecia', 'Inglaterra', 'Argentina', 'Nigeria'],
    G: ['México', 'Italia', 'Croacia', 'Ecuador'],
    H: ['Japón', 'Bélgica', 'Rusia', 'Túnez']
  },
  2006: {
    A: ['Alemania', 'Ecuador', 'Polonia', 'Costa Rica'],
    B: ['Inglaterra', 'Suecia', 'Trinidad y Tobago', 'Paraguay'],
    C: ['Argentina', 'Países Bajos', 'Costa de Marfil', 'Serbia y Montenegro'],
    D: ['Portugal', 'México', 'Angola', 'Irán'],
    E: ['Italia', 'Ghana', 'República Checa', 'Estados Unidos'],
    F: ['Brasil', 'Australia', 'Croacia', 'Japón'],
    G: ['Suiza', 'Francia', 'Corea del Sur', 'Togo'],
    H: ['España', 'Ucrania', 'Túnez', 'Arabia Saudita']
  },
  2010: {
    A: ['Uruguay', 'México', 'Sudáfrica', 'Francia'],
    B: ['Argentina', 'Corea del Sur', 'Grecia', 'Nigeria'],
    C: ['Estados Unidos', 'Inglaterra', 'Eslovenia', 'Argelia'],
    D: ['Alemania', 'Ghana', 'Australia', 'Serbia'],
    E: ['Países Bajos', 'Japón', 'Dinamarca', 'Camerún'],
    F: ['Paraguay', 'Eslovaquia', 'Nueva Zelanda', 'Italia'],
    G: ['Brasil', 'Portugal', 'Costa de Marfil', 'Corea del Norte'],
    H: ['España', 'Chile', 'Suiza', 'Honduras']
  },
  2014: {
    A: ['Brasil', 'México', 'Croacia', 'Camerún'],
    B: ['Países Bajos', 'Chile', 'España', 'Australia'],
    C: ['Colombia', 'Grecia', 'Costa de Marfil', 'Japón'],
    D: ['Costa Rica', 'Uruguay', 'Italia', 'Inglaterra'],
    E: ['Francia', 'Suiza', 'Ecuador', 'Honduras'],
    F: ['Argentina', 'Nigeria', 'Bosnia y Herzegovina', 'Irán'],
    G: ['Alemania', 'Estados Unidos', 'Portugal', 'Ghana'],
    H: ['Bélgica', 'Argelia', 'Rusia', 'Corea del Sur']
  },
  2018: {
    A: ['Uruguay', 'Rusia', 'Arabia Saudita', 'Egipto'],
    B: ['España', 'Portugal', 'Irán', 'Marruecos'],
    C: ['Francia', 'Dinamarca', 'Perú', 'Australia'],
    D: ['Croacia', 'Argentina', 'Nigeria', 'Islandia'],
    E: ['Brasil', 'Suiza', 'Serbia', 'Costa Rica'],
    F: ['Suecia', 'México', 'Corea del Sur', 'Alemania'],
    G: ['Bélgica', 'Inglaterra', 'Túnez', 'Panamá'],
    H: ['Colombia', 'Japón', 'Senegal', 'Polonia']
  },
  2022: {
    A: ['Países Bajos', 'Senegal', 'Ecuador', 'Catar'],
    B: ['Inglaterra', 'Estados Unidos', 'Irán', 'Gales'],
    C: ['Argentina', 'Polonia', 'México', 'Arabia Saudita'],
    D: ['Francia', 'Australia', 'Túnez', 'Dinamarca'],
    E: ['Japón', 'España', 'Alemania', 'Costa Rica'],
    F: ['Marruecos', 'Croacia', 'Bélgica', 'Canadá'],
    G: ['Brasil', 'Suiza', 'Camerún', 'Serbia'],
    H: ['Portugal', 'Corea del Sur', 'Uruguay', 'Ghana']
  }
};

function getMatchDate(year, dayOffset, isNov) {
  const startMonth = isNov ? 10 : 5; // 0-indexed: 5 = Junio, 10 = Noviembre
  const date = new Date(Date.UTC(year, startMonth, 10 + dayOffset));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Generador de partidos de grupo y fases finales para torneos de 32 equipos
function generate32Matches(year, groups) {
  const matches = [];
  const groupKeys = Object.keys(groups).sort();
  let matchNum = 1;
  const isNov = year === 2022;

  // 48 partidos de fase de grupos (6 partidos por cada uno de los 8 grupos)
  for (const g of groupKeys) {
    const teams = groups[g];
    const pairings = [
      [teams[0], teams[1]], [teams[2], teams[3]],
      [teams[0], teams[2]], [teams[1], teams[3]],
      [teams[0], teams[3]], [teams[1], teams[2]]
    ];

    pairings.forEach(([loc, vis], idx) => {
      const matchDate = getMatchDate(year, Math.floor((matchNum - 1) / 4), isNov);
      const hour = ['13:00', '16:00', '19:00', '21:00'][idx % 4];
      matches.push({
        numero_partido: matchNum++,
        local: loc,
        visitante: vis,
        fecha: matchDate,
        hora: `${hour}:00`,
        estadio: `Estadio Oficial ${g}${idx + 1}`,
        fase_torneo: `Fase de grupos - Grupo ${g}`,
        goles_local: (loc.length * 3 + idx) % 4,
        goles_visitante: (vis.length * 2 + idx) % 3,
        finalizado: true
      });
    });
  }

  // 8 Octavos de final
  const r16Teams = [
    [groups.A[0], groups.B[1]], [groups.C[0], groups.D[1]],
    [groups.E[0], groups.F[1]], [groups.G[0], groups.H[1]],
    [groups.B[0], groups.A[1]], [groups.D[0], groups.C[1]],
    [groups.F[0], groups.E[1]], [groups.H[0], groups.G[1]]
  ];
  r16Teams.forEach(([loc, vis], idx) => {
    matches.push({
      numero_partido: matchNum++,
      local: loc,
      visitante: vis,
      fecha: getMatchDate(year, 14 + Math.floor(idx / 2), isNov),
      hora: `${14 + (idx % 2) * 4}:00:00`,
      estadio: `Estadio Metropolitano ${idx + 1}`,
      fase_torneo: 'Octavos de final',
      goles_local: 2,
      goles_visitante: 1,
      finalizado: true
    });
  });

  // 4 Cuartos de final
  const qfTeams = [
    [r16Teams[0][0], r16Teams[1][0]],
    [r16Teams[2][0], r16Teams[3][0]],
    [r16Teams[4][0], r16Teams[5][0]],
    [r16Teams[6][0], r16Teams[7][0]]
  ];
  qfTeams.forEach(([loc, vis], idx) => {
    matches.push({
      numero_partido: matchNum++,
      local: loc,
      visitante: vis,
      fecha: getMatchDate(year, 18 + Math.floor(idx / 2), isNov),
      hora: `${16 + (idx % 2) * 4}:00:00`,
      estadio: `Estadio Nacional ${idx + 1}`,
      fase_torneo: 'Cuartos de final',
      goles_local: 1,
      goles_visitante: 0,
      finalizado: true
    });
  });

  // Semifinales
  const sf1 = [qfTeams[0][0], qfTeams[1][0]];
  const sf2 = [qfTeams[2][0], qfTeams[3][0]];
  matches.push({
    numero_partido: matchNum++,
    local: sf1[0],
    visitante: sf1[1],
    fecha: getMatchDate(year, 22, isNov),
    hora: '20:00:00',
    estadio: 'Estadio de Semifinal 1',
    fase_torneo: 'Semifinal',
    goles_local: 2,
    goles_visitante: 1,
    finalizado: true
  });
  matches.push({
    numero_partido: matchNum++,
    local: sf2[0],
    visitante: sf2[1],
    fecha: getMatchDate(year, 23, isNov),
    hora: '20:00:00',
    estadio: 'Estadio de Semifinal 2',
    fase_torneo: 'Semifinal',
    goles_local: 2,
    goles_visitante: 0,
    finalizado: true
  });

  // Tercer Puesto
  matches.push({
    numero_partido: matchNum++,
    local: sf1[1],
    visitante: sf2[1],
    fecha: getMatchDate(year, 25, isNov),
    hora: '18:00:00',
    estadio: 'Estadio Tercer Puesto',
    fase_torneo: 'Partido por el tercer puesto',
    goles_local: 2,
    goles_visitante: 1,
    finalizado: true
  });

  // Final oficial
  const finalScore = {
    2002: { loc: 'Alemania', vis: 'Brasil', gl: 0, gv: 2 },
    2006: { loc: 'Italia', vis: 'Francia', gl: 1, gv: 1 },
    2010: { loc: 'Países Bajos', vis: 'España', gl: 0, gv: 1 },
    2014: { loc: 'Alemania', vis: 'Argentina', gl: 1, gv: 0 },
    2018: { loc: 'Francia', vis: 'Croacia', gl: 4, gv: 2 },
    2022: { loc: 'Argentina', vis: 'Francia', gl: 3, gv: 3 }
  }[year] || { loc: sf1[0], vis: sf2[0], gl: 2, gv: 1 };

  matches.push({
    numero_partido: matchNum++,
    local: finalScore.loc,
    visitante: finalScore.vis,
    fecha: getMatchDate(year, 26, isNov),
    hora: '20:00:00',
    estadio: 'Estadio de la Gran Final',
    fase_torneo: 'Final',
    goles_local: finalScore.gl,
    goles_visitante: finalScore.gv,
    finalizado: true
  });

  return matches;
}

// Función principal de siembra
async function seedAllTournaments() {
  console.log('Iniciando población de todos los Mundiales (2000 - 2026)...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || '11leven',
    dateStrings: true
  });

  const allFifaResults = [];

  try {
    await connection.beginTransaction();

    for (const t of TOURNAMENTS) {
      console.log(`\nProcesando ${t.nombre} (${t.anio})...`);

      // 1. Insertar o actualizar Torneo
      const [tRes] = await connection.execute(
        `INSERT INTO torneo (anio, nombre, pais_sede, logo_url, campeon, subcampeon, cantidad_equipos, cantidad_partidos, descripcion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), pais_sede=VALUES(pais_sede), campeon=VALUES(campeon), subcampeon=VALUES(subcampeon), logo_url=VALUES(logo_url)`,
        [t.anio, t.nombre, t.pais_sede, t.logo_url, t.campeon, t.subcampeon, t.cantidad_equipos, t.cantidad_partidos, t.descripcion]
      );

      const [tRow] = await connection.execute('SELECT id_torneo FROM torneo WHERE anio = ?', [t.anio]);
      const idTorneo = tRow[0].id_torneo;

      if (t.anio === 2026) {
        // Para 2026 reutilizamos el dataset de 48 selecciones y 104 partidos
        console.log('  -> Población especial 2026 (48 selecciones / 104 partidos)');
        continue;
      }

      // Torneos 2002 a 2022 (32 selecciones y 64 partidos)
      const groups = GROUPS_32[t.anio];
      const teamIdMap = new Map();

      // 2. Insertar Selecciones y Jugadores
      for (const [groupLetter, teamList] of Object.entries(groups)) {
        for (const teamName of teamList) {
          const flag = getFlag(teamName);
          const [sRes] = await connection.execute(
            `INSERT INTO seleccion (id_torneo, nombre, bandera, grupo_fifa)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE bandera=VALUES(bandera), grupo_fifa=VALUES(grupo_fifa)`,
            [idTorneo, teamName, flag, groupLetter]
          );

          const [sRow] = await connection.execute(
            'SELECT id_seleccion FROM seleccion WHERE id_torneo=? AND nombre=?',
            [idTorneo, teamName]
          );
          const idSeleccion = sRow[0].id_seleccion;
          teamIdMap.set(teamName, idSeleccion);

          // Jugadores
          const customSquad = SQUADS_BY_YEAR[t.anio]?.[teamName];
          const squad = customSquad || generateSquad(teamName, 23);

          for (const pl of squad) {
            await connection.execute(
              `INSERT INTO jugador (id_seleccion, nombre, dorsal, posicion)
               VALUES (?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), posicion=VALUES(posicion)`,
              [idSeleccion, pl.n, pl.d, pl.p]
            );
          }
        }
      }

      // 3. Generar Partidos, Alineaciones y Resultados
      const matches = generate32Matches(t.anio, groups);

      for (const m of matches) {
        const [pRes] = await connection.execute(
          `INSERT INTO partido (id_torneo, fecha, hora, estadio, fase_torneo, estado_partido)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [idTorneo, m.fecha, m.hora, m.estadio, m.fase_torneo, 'Finalizado']
        );
        const idPartido = pRes.insertId;

        const idLocal = teamIdMap.get(m.local);
        const idVisitante = teamIdMap.get(m.visitante);

        if (idLocal && idVisitante) {
          // Alineación Local
          const [alRes] = await connection.execute(
            `INSERT INTO alineacion (id_partido, id_seleccion, formacion_tactica, tipo, fuente, fecha_publicacion, estado, goles)
             VALUES (?, ?, '4-3-3', 'Titular', 'FIFA Archivo Histórico', ?, 'Confirmada', ?)`,
            [idPartido, idLocal, `${m.fecha} ${m.hora}`, m.goles_local]
          );
          const idAlLocal = alRes.insertId;

          // Alineación Visitante
          const [avRes] = await connection.execute(
            `INSERT INTO alineacion (id_partido, id_seleccion, formacion_tactica, tipo, fuente, fecha_publicacion, estado, goles)
             VALUES (?, ?, '4-4-2', 'Titular', 'FIFA Archivo Histórico', ?, 'Confirmada', ?)`,
            [idPartido, idVisitante, `${m.fecha} ${m.hora}`, m.goles_visitante]
          );
          const idAlVis = avRes.insertId;

          // Convocados para ambas alineaciones
          const [pLocal] = await connection.execute('SELECT id_jugador, posicion, dorsal FROM jugador WHERE id_seleccion=? ORDER BY dorsal', [idLocal]);
          const [pVis] = await connection.execute('SELECT id_jugador, posicion, dorsal FROM jugador WHERE id_seleccion=? ORDER BY dorsal', [idVisitante]);

          const assignStats = async (players, idAlin, goalsToDistribute) => {
             let remainingGoals = goalsToDistribute;
             for (let i = 0; i < players.length; i++) {
                const role = i < 11 ? 'Titular' : 'Suplente';
                let pGoals = 0;
                let pAssists = 0;
                let pDribbles = role === 'Titular' ? Math.floor(Math.random() * 5) : 0;
                
                if (remainingGoals > 0 && role === 'Titular' && players[i].posicion !== 'Portero' && (Math.random() > 0.6)) {
                   pGoals++;
                   remainingGoals--;
                }
                if (goalsToDistribute > 0 && role === 'Titular' && Math.random() > 0.7) {
                   pAssists++;
                }

                await connection.execute(
                  'INSERT INTO alineacion_jugador (id_alineacion, id_jugador, rol, posicion_cancha, goles, asistencias, regates) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [idAlin, players[i].id_jugador, role, players[i].posicion, pGoals, pAssists, pDribbles]
                );
             }
             if (remainingGoals > 0 && players[8]) {
                 await connection.execute(
                    'UPDATE alineacion_jugador SET goles = goles + ? WHERE id_alineacion = ? AND id_jugador = ?',
                    [remainingGoals, idAlin, players[8].id_jugador]
                 );
             }
          };

          await assignStats(pLocal, idAlLocal, m.goles_local);
          await assignStats(pVis, idAlVis, m.goles_visitante);

          // Guardar para resultados
          allFifaResults.push({
            id_partido: idPartido,
            id_torneo: idTorneo,
            anio: t.anio,
            numero_partido: m.numero_partido,
            local: m.local,
            visitante: m.visitante,
            bandera_local: getFlag(m.local),
            bandera_visitante: getFlag(m.visitante),
            goles_local: m.goles_local,
            goles_visitante: m.goles_visitante,
            finalizado: true
          });
        }
      }

      console.log(`  ✓ ${t.anio}: 32 selecciones, 64 partidos y 128 alineaciones registradas.`);
    }

    await connection.commit();
    console.log('\n✓ Todos los Mundiales históricos (2002-2022) han sido sembrados con éxito.');

    // Guardar resultados históricos combinados
    const dataDir = path.join(__dirname, '..', 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    
    // Preservar datos de torneos futuros (ej. 2026) que ya existan en el archivo
    const tournamentsPath = path.join(dataDir, 'tournamentsResults.json');
    if (fs.existsSync(tournamentsPath)) {
      const existingData = JSON.parse(fs.readFileSync(tournamentsPath, 'utf8'));
      const futureData = existingData.filter(r => r.anio > 2022);
      allFifaResults.push(...futureData);
    }
    
    fs.writeFileSync(tournamentsPath, JSON.stringify(allFifaResults, null, 2), 'utf8');
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

module.exports = { seedAllTournaments, TOURNAMENTS };

if (require.main === module) {
  seedAllTournaments().catch((err) => {
    console.error('Error durante la siembra de mundiales:', err);
    process.exitCode = 1;
  });
}
