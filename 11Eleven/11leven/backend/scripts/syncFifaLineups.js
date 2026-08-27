const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const COMPETITION = '17';
const SEASON = '285023';
const API = 'https://api.fifa.com/api/v3';
const aliases = new Map([['czech republic','czechia'],['turkey','turkiye'],['south korea','korea republic'],['ivory coast',"cote d ivoire"],['united states','usa'],['dr congo','congo dr'],['cape verde','cabo verde'],['ir iran','iran']]);
const venueKeys = [['mexico city','mexico-city'],['azteca','mexico-city'],['guadalajara','guadalajara'],['akron','guadalajara'],['monterrey','monterrey'],['bbva','monterrey'],['toronto','toronto'],['bmo','toronto'],['vancouver','vancouver'],['bc place','vancouver'],['new york/new jersey','new-york'],['new york new jersey','new-york'],['metlife','new-york'],['dallas','dallas'],['at&t','dallas'],['kansas city','kansas-city'],['arrowhead','kansas-city'],['los angeles','los-angeles'],['sofi','los-angeles'],['miami','miami'],['hard rock','miami'],['atlanta','atlanta'],['mercedes-benz','atlanta'],['boston','boston'],['gillette','boston'],['houston','houston'],['nrg','houston'],['philadelphia','philadelphia'],['lincoln financial','philadelphia'],['san francisco bay area','san-francisco'],["levi's",'san-francisco'],['seattle','seattle'],['lumen','seattle']];

function text(values, fallback = '') { return values?.find((x) => x.Locale === 'en-GB')?.Description || values?.[0]?.Description || fallback; }
function normalized(value) { const clean=String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); return aliases.get(clean)||clean; }
function venueKey(value) { const clean=String(value||'').toLowerCase(); return venueKeys.find(([needle])=>clean.includes(needle))?.[1]||normalized(value); }
function localParts(value) { const [date,clock]=value.replace('Z','').split('T'); return {date,time:clock.slice(0,8)}; }
function position(code) { return ['Portero','Defensa','Mediocampista','Delantero'][Number(code)]||'Jugador'; }

async function fifa(path) {
  const response=await fetch(`${API}${path}`,{headers:{Accept:'application/json','User-Agent':'11Leven/1.0'}});
  if(!response.ok) throw new Error(`FIFA respondió ${response.status} en ${path}`);
  return response.json();
}

function findMatch(match, stored, claimed) {
  const {date,time}=localParts(match.LocalDate||match.Date);
  const candidates=stored.filter((item)=>!claimed.has(item.id_partido)&&item.fecha===date&&item.hora===time);
  if(candidates.length===1) return candidates[0];
  const key=venueKey(text(match.Stadium?.Name));
  return candidates.find((item)=>venueKey(item.estadio)===key) || stored.find((item)=>!claimed.has(item.id_partido)&&item.fecha===date&&venueKey(item.estadio)===key);
}

async function upsertTeam(connection, fifaTeam, teams) {
  const name=text(fifaTeam.TeamName,fifaTeam.ShortClubName);
  const team=teams.find((item)=>normalized(item.nombre)===normalized(name));
  if(!team) throw new Error(`No existe la selección "${name}" en la base de datos.`);
  const flag=fifaTeam.PictureUrl?.replace('{format}','sq').replace('{size}','4');
  if(flag&&team.bandera!==flag) await connection.execute('UPDATE seleccion SET bandera=? WHERE id_seleccion=?',[flag,team.id_seleccion]);
  return team;
}

async function upsertPlayer(connection, player, teamId) {
  const number=Number(player.ShirtNumber);
  const name=text(player.PlayerName,text(player.ShortName,`Jugador ${number}`));
  const pos=position(player.Position);
  const [rows]=await connection.execute('SELECT id_jugador FROM jugador WHERE id_seleccion=? AND dorsal=?',[teamId,number]);
  if(rows.length){ await connection.execute('UPDATE jugador SET nombre=?,posicion=? WHERE id_jugador=?',[name,pos,rows[0].id_jugador]); return rows[0].id_jugador; }
  const [result]=await connection.execute('INSERT INTO jugador (nombre,dorsal,posicion,id_seleccion) VALUES (?,?,?,?)',[name,number,pos,teamId]);
  return result.insertId;
}

async function syncLineup(connection, matchId, teamId, fifaTeam, sourceUrl, publishedAt) {
  const [found]=await connection.execute('SELECT id_alineacion FROM alineacion WHERE id_partido=? AND id_seleccion=?',[matchId,teamId]);
  let lineupId=found[0]?.id_alineacion;
  const formation=fifaTeam.Tactics||'Sin especificar';
  if(lineupId){
    await connection.execute('UPDATE alineacion SET formacion_tactica=?,tipo=?,fuente=?,fecha_publicacion=?,estado=? WHERE id_alineacion=?',[formation,'Titular',sourceUrl,publishedAt,'Confirmada',lineupId]);
    await connection.execute('DELETE FROM alineacion_jugador WHERE id_alineacion=?',[lineupId]);
  }else{
    const [result]=await connection.execute('INSERT INTO alineacion (id_partido,id_seleccion,formacion_tactica,tipo,fuente,fecha_publicacion,estado) VALUES (?,?,?,?,?,?,?)',[matchId,teamId,formation,'Titular',sourceUrl,publishedAt,'Confirmada']);
    lineupId=result.insertId;
  }
  for(const player of fifaTeam.Players){
    const playerId=await upsertPlayer(connection,player,teamId);
    const role=Number(player.Status)===1?'Titular':'Suplente';
    await connection.execute('INSERT INTO alineacion_jugador (id_alineacion,id_jugador,rol,posicion_cancha,minuto_cambio) VALUES (?,?,?,?,NULL)',[lineupId,playerId,role,position(player.Position)]);
  }
}

async function main() {
  const calendar=await fifa(`/calendar/matches?idCompetition=${COMPETITION}&idSeason=${SEASON}&count=500`);
  const connection=await db.getConnection();
  let imported=0, unavailable=0;
  const results=[];
  try{
    const [stored]=await connection.execute('SELECT * FROM partido ORDER BY fecha,hora,id_partido');
    const [teams]=await connection.execute('SELECT * FROM seleccion');
    const claimed=new Set();
    for(const match of calendar.Results||[]){
      const target=findMatch(match,stored,claimed);
      if(!target) throw new Error(`No pude relacionar el partido FIFA #${match.MatchNumber} (${match.LocalDate}).`);
      claimed.add(target.id_partido);
      results.push({id_partido:target.id_partido,numero_partido:match.MatchNumber,local:text(match.Home?.TeamName,match.Home?.ShortClubName),visitante:text(match.Away?.TeamName,match.Away?.ShortClubName),bandera_local:match.Home?.PictureUrl?.replace('{format}','sq').replace('{size}','4'),bandera_visitante:match.Away?.PictureUrl?.replace('{format}','sq').replace('{size}','4'),goles_local:match.HomeTeamScore,goles_visitante:match.AwayTeamScore,finalizado:Boolean(match.MatchTime)});
      const sourceUrl=`${API}/live/football/${COMPETITION}/${SEASON}/${match.IdStage}/${match.IdMatch}`;
      let detail;
      try{ detail=await fifa(`/live/football/${COMPETITION}/${SEASON}/${match.IdStage}/${match.IdMatch}`); }catch(_error){ unavailable+=1; continue; }
      if(!detail){ unavailable+=1; continue; }
      const sides=[detail.HomeTeam,detail.AwayTeam];
      if(sides.some((side)=>!side?.Players?.length)){ unavailable+=1; continue; }
      await connection.beginTransaction();
      try{
        const stamp=(match.Date||new Date().toISOString()).replace('T',' ').replace('Z','');
        const matchState=Number(detail.Period)===10?'Finalizado':(detail.MatchTime?'En curso':'Programado');
        await connection.execute('UPDATE partido SET estado_partido=? WHERE id_partido=?',[matchState,target.id_partido]);
        for(const side of sides){ const team=await upsertTeam(connection,side,teams); await syncLineup(connection,target.id_partido,team.id_seleccion,side,sourceUrl,stamp); }
        await connection.commit(); imported+=1;
        console.log(`✓ Partido ${match.MatchNumber}: ${text(detail.HomeTeam.TeamName)} vs ${text(detail.AwayTeam.TeamName)}`);
      }catch(error){ await connection.rollback(); throw error; }
    }
    console.log(`\nSincronización terminada: ${imported} partidos con alineaciones; ${unavailable} aún no disponibles.`);
    console.log('Fuente oficial: FIFA (api.fifa.com)');
    const dataDir=path.join(__dirname,'..','data');
    fs.mkdirSync(dataDir,{recursive:true});
    fs.writeFileSync(path.join(dataDir,'fifaResults.json'),JSON.stringify(results,null,2),'utf8');
  }finally{ connection.release(); await db.end(); }
}

main().catch((error)=>{ console.error(`Error: ${error.message}`); process.exitCode=1; });
