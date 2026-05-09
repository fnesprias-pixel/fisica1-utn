// Script para cargar alumnos de la comisión Z1012 en Supabase
// Uso: node scripts/cargar-alumnos-z1012.mjs
// Contraseña por defecto: el legajo del alumno

const SUPABASE_URL = 'https://mtsqqxjefcxiifundphf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10c3FxeGplZmN4aWlmdW5kcGhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA3MTU0NiwiZXhwIjoyMDkyNjQ3NTQ2fQ.O4PHDREd0tfZ-lXZfJN0034UTroOlrdf4K_-T96ZtqM';

const ALUMNOS = [
  { legajo: '2345237', nombre: 'ACUÑA, SELENE',                      email: 'sacuna@frba.utn.edu.ar' },
  { legajo: '2349371', nombre: 'AGUIRRE, AGUSTINA',                  email: 'agaguirre@frba.utn.edu.ar' },
  { legajo: '2210319', nombre: 'AJNOTA CHURA, KEVIN MATIAS',         email: 'kajnotachura@frba.utn.edu.ar' },
  { legajo: '2331457', nombre: 'APANASOWICZ, IVÁN',                  email: 'iapanasowicz@frba.utn.edu.ar' },
  { legajo: '2332656', nombre: 'BAEZ, JUAN IGNACIO',                 email: 'jubaez@frba.utn.edu.ar' },
  { legajo: '2343022', nombre: 'BAGHDASSARIAN, TADEO TOBIAS',        email: 'tbaghdassarian@frba.utn.edu.ar' },
  { legajo: '2345330', nombre: 'BIRBA, LAUTARO',                     email: 'lbirba@frba.utn.edu.ar' },
  { legajo: '2337344', nombre: 'BOSSI, SANTIAGO',                    email: 'sbossi@frba.utn.edu.ar' },
  { legajo: '2348007', nombre: 'BRITEZ, LEANDRO JOAQUIN',            email: 'lebritez@frba.utn.edu.ar' },
  { legajo: '2334069', nombre: 'BUSSI, ADIEL',                       email: 'abussi@frba.utn.edu.ar' },
  { legajo: '2331044', nombre: 'CABALLERO GONZÁLEZ, ALINA ABIGAIL',  email: 'alinacaballero@frba.utn.edu.ar' },
  { legajo: '2221962', nombre: 'CARUSO HUARTE, VITO ALESSANDRO',     email: 'vcaruso@frba.utn.edu.ar' },
  { legajo: '2335670', nombre: 'CASASOLA, FRANCISCO JUAN',           email: 'frcasasola@frba.utn.edu.ar' },
  { legajo: '2345390', nombre: 'CASTILLO CASTELLANOS, ISABELLA MARIE', email: 'icastillocastellanos@frba.utn.edu.ar' },
  { legajo: '2330775', nombre: 'CHIAPPE BAIOCCO, GIANELLA',          email: 'gchiappebaiocco@frba.utn.edu.ar' },
  { legajo: '2114690', nombre: 'CIUCCIO, VALENTINO',                 email: 'vciuccio@frba.utn.edu.ar' },
  { legajo: '2220660', nombre: 'COHEN, BRENDA RAQUEL',               email: 'bcohen@frba.utn.edu.ar' },
  { legajo: '2346588', nombre: 'COLOMBO, EMILIANO GABRIEL',          email: 'ecolombo@frba.utn.edu.ar' },
  { legajo: '2327338', nombre: 'DOMINGUEZ, HERNAN',                  email: 'hdominguez@frba.utn.edu.ar' },
  { legajo: '2611600', nombre: 'DUPOU DUPRAT, ALFONSO MARIA',        email: 'adupouduprat@frba.utn.edu.ar' },
  { legajo: '2350210', nombre: 'FARAONI, VALENTINA',                 email: 'vfaraoni@frba.utn.edu.ar' },
  { legajo: '2349164', nombre: 'FEIERMAN, MARTIN EIAL',              email: 'mfeierman@frba.utn.edu.ar' },
  { legajo: '2349991', nombre: 'FERNANDEZ SEEFRIED, AGUSTIN',        email: 'afernandezseefried@frba.utn.edu.ar' },
  { legajo: '2345493', nombre: 'FÜLÖP, MARÍA BELÉN',                 email: 'mfulop@frba.utn.edu.ar' },
  { legajo: '2331100', nombre: 'GARCIA FLORES, MAURICIO ALEXIS',     email: 'mgarciaflores@frba.utn.edu.ar' },
  { legajo: '2223363', nombre: 'GARCÍA BAZÁN, LAUTARO',              email: 'lgarciabazan@frba.utn.edu.ar' },
  { legajo: '2345500', nombre: 'GARCÍA, MATEO NAHUEL',               email: 'mateogarcia@frba.utn.edu.ar' },
  { legajo: '2335062', nombre: 'GIBESSI, LAUTARO',                   email: 'lgibessi@frba.utn.edu.ar' },
  { legajo: '2129826', nombre: 'GIULKOVICH, IVÁN MATIAS',            email: 'igiulkovich@frba.utn.edu.ar' },
  { legajo: '2345559', nombre: 'GRASSO, LUCÍA ANDREA',               email: 'lugrasso@frba.utn.edu.ar' },
  { legajo: '1745189', nombre: 'GRISAFIO, NICOLAS JULIAN',           email: 'ngrisafio@frba.utn.edu.ar' },
  { legajo: '2209159', nombre: 'GUTIERREZ VELASQUEZ, RENÉ URIEL',    email: 'regutierrez@frba.utn.edu.ar' },
  { legajo: '2143290', nombre: 'GÁSPARI, MATIAS',                    email: 'mgaspari@frba.utn.edu.ar' },
  { legajo: '2209962', nombre: 'HUANG, ALICIA',                      email: 'ahuang@frba.utn.edu.ar' },
  { legajo: '2350245', nombre: 'IRIONDO, PEDRO TOMAS',               email: 'piriondo@frba.utn.edu.ar' },
  { legajo: '2345638', nombre: 'IVALDI, AGUSTINA',                   email: 'aivaldi@frba.utn.edu.ar' },
  { legajo: '2437077', nombre: 'IVALDI, JUAN BAUTISTA',              email: 'jivaldi@frba.utn.edu.ar' },
  { legajo: '2084193', nombre: 'JUÁREZ, CAMILA BELÉN',               email: 'camjuarez@frba.utn.edu.ar' },
  { legajo: '2082317', nombre: 'LACAL DEL CAMPO, MATEO IGNACIO',     email: 'mlacaldelcampo@frba.utn.edu.ar' },
  { legajo: '2218446', nombre: 'LARRANDART, FEDERICO',               email: 'flarrandart@frba.utn.edu.ar' },
  { legajo: '2037634', nombre: 'LASSAQUE, FABRICIO EMANUEL',         email: 'flassaque@frba.utn.edu.ar' },
  { legajo: '2345687', nombre: 'LECHUGA, JUAN FRANCO',               email: 'jlechuga@frba.utn.edu.ar' },
  { legajo: '2087650', nombre: 'LEGUÍA, BAUTISTA',                   email: 'bleguia@frba.utn.edu.ar' },
  { legajo: '2129991', nombre: 'LOBO, LUCIANO NAHUEL',               email: 'llobo@frba.utn.edu.ar' },
  { legajo: '2345717', nombre: 'LOPEZ, LEONEL LIHUEN',               email: 'leolopez@frba.utn.edu.ar' },
  { legajo: '2287845', nombre: 'LORDA, MATIAS',                      email: 'mlorda@frba.utn.edu.ar' },
  { legajo: '2220076', nombre: 'LUNA, TOBIAS VALENTIN',              email: 'toluna@frba.utn.edu.ar' },
  { legajo: '2335165', nombre: 'MANIN SOLIS, VALENTINA',             email: 'vmaninsolis@frba.utn.edu.ar' },
  { legajo: '2042940', nombre: 'MARISCAL VALENZUELA, GUSTAVO GABRIEL', email: 'gmariscalvalenzuela@frba.utn.edu.ar' },
  { legajo: '2340239', nombre: 'MARTINEZ MORALES, INDIRA LISA',      email: 'imartinezmorales@frba.utn.edu.ar' },
  { legajo: '2143677', nombre: 'MARTINEZ, JULIA',                    email: 'julimartinez@frba.utn.edu.ar' },
  { legajo: '2217818', nombre: 'MARTÍNEZ OLIVARES, PALOMA',          email: 'palomamartinez@frba.utn.edu.ar' },
  { legajo: '2092840', nombre: 'MEDINA, ELIANA CAROLINA',            email: 'elmedina@frba.utn.edu.ar' },
  { legajo: '2340331', nombre: 'MEDINA, THOMAS',                     email: 'tmedina@frba.utn.edu.ar' },
  { legajo: '2145030', nombre: 'MENDOZA, JOEL VICENTE',              email: 'joemendoza@frba.utn.edu.ar' },
  { legajo: '2343733', nombre: 'MINVIELLE, FELICITAS ABRIL',         email: 'fminvielle@frba.utn.edu.ar' },
  { legajo: '2340513', nombre: 'MONTENEGRO, LAUTARO ROQUE RAMON',    email: 'lamontenegro@frba.utn.edu.ar' },
  { legajo: '2151510', nombre: 'MUNZON, MIGUEL ANGEL',               email: 'mmunzon@frba.utn.edu.ar' },
  { legajo: '2345791', nombre: 'MUZEVIC, MELINA',                    email: 'mmuzevic@frba.utn.edu.ar' },
  { legajo: '1639020', nombre: 'OLEA POLVERG, RODRIGO EMANUEL',      email: 'rodrigoop@frba.utn.edu.ar' },
  { legajo: '2597895', nombre: 'ORTIZ, IÑAKI',                       email: 'inaortiz@frba.utn.edu.ar' },
  { legajo: '2345821', nombre: 'ORTT, SOFÍA VALENTINA',              email: 'sortt@frba.utn.edu.ar' },
  { legajo: '2139716', nombre: 'PARODI, MARTINA CECILIA',            email: 'maparodi@frba.utn.edu.ar' },
  { legajo: '2345869', nombre: 'PERASSI, SOL MICAELA',               email: 'sperassi@frba.utn.edu.ar' },
  { legajo: '2352448', nombre: 'PRADO CONDO, ALEXANDRA ABIGAIL',     email: 'abiprado@frba.utn.edu.ar' },
  { legajo: '2345948', nombre: 'QUISPE QUISPE, ABIGAIL GRISELDA',    email: 'aquispequispe@frba.utn.edu.ar' },
  { legajo: '2341311', nombre: 'RAJO, GIANELLA SUSANA',              email: 'grajo@frba.utn.edu.ar' },
  { legajo: '2033010', nombre: 'RECHUSKY, DYLAN ORIEL',              email: 'drechusky@frba.utn.edu.ar' },
  { legajo: '2229924', nombre: 'RETAMOSO, ROMÁN DIONISIO',           email: 'rretamoso@frba.utn.edu.ar' },
  { legajo: '2140585', nombre: 'REY, AGUSTÍN',                       email: 'agurey@frba.utn.edu.ar' },
  { legajo: '2218069', nombre: 'REYNAGA VILAR, NICOLÁS MARTÍN',      email: 'nreynaga@frba.utn.edu.ar' },
  { legajo: '2220349', nombre: 'RODRIGUEZ LOZA, TOMÁS LEONEL',       email: 'tomrodriguez@frba.utn.edu.ar' },
  { legajo: '2349541', nombre: 'ROMERO ACUÑA, BENJAMÍN',             email: 'bromeroacuna@frba.utn.edu.ar' },
  { legajo: '2350300', nombre: 'SANTILLAN, BERNARDO JESUS',          email: 'bsantillan@frba.utn.edu.ar' },
  { legajo: '2230811', nombre: 'SARRO URSINI, MARCOS FABRIZIO',      email: 'msarroursini@frba.utn.edu.ar' },
  { legajo: '2287973', nombre: 'SILVESTRE MATIAS, MAILY SHARLOT',    email: 'msilvestrematias@frba.utn.edu.ar' },
  { legajo: '2345092', nombre: 'VAIRO, NAHUEL ROBERTO',              email: 'nvairo@frba.utn.edu.ar' },
  { legajo: '2330994', nombre: 'VARGAS TRAYNOR, JUAN CRUZ',          email: 'jvargastraynor@frba.utn.edu.ar' },
  { legajo: '2342595', nombre: 'VERA VELIZ, CELESTE RUTH',           email: 'cveraveliz@frba.utn.edu.ar' },
];

const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

async function crearComision() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/comisiones`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body: JSON.stringify({ nombre: 'Z1012', turno: 'Mañana', anio: 2026 }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Error creando comisión: ${res.status} ${txt}`);
  }
  const [comision] = await res.json();
  console.log(`✓ Comisión Z1012 creada: ${comision.id}`);
  return comision.id;
}

async function crearAuthUser(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.msg || JSON.stringify(data));
  }
  return data.id;
}

async function insertarUsuario(id, alumno, comisionId) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=minimal' },
    body: JSON.stringify({
      id,
      nombre: alumno.nombre,
      email: alumno.email,
      legajo: alumno.legajo,
      rol: 'estudiante',
      comision_id: comisionId,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`DB error: ${res.status} ${txt}`);
  }
}

async function main() {
  console.log(`Cargando ${ALUMNOS.length} alumnos en comisión Z1012...\n`);

  const comisionId = await crearComision();

  let ok = 0;
  let errores = [];

  for (const alumno of ALUMNOS) {
    try {
      const authId = await crearAuthUser(alumno.email, alumno.legajo);
      await insertarUsuario(authId, alumno, comisionId);
      console.log(`  ✓ ${alumno.nombre}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${alumno.nombre}: ${err.message}`);
      errores.push({ alumno: alumno.nombre, error: err.message });
    }
  }

  console.log(`\n─────────────────────────────`);
  console.log(`Cargados: ${ok}/${ALUMNOS.length}`);
  if (errores.length > 0) {
    console.log(`\nErrores:`);
    errores.forEach(e => console.log(`  • ${e.alumno}: ${e.error}`));
  }
}

main().catch(err => { console.error(err); process.exit(1); });
