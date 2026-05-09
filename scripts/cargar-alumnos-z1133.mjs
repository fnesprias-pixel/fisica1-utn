// Script para cargar alumnos de la comisión Z1133 en Supabase
// Uso: node scripts/cargar-alumnos-z1133.mjs
// Contraseña por defecto: el legajo del alumno

const SUPABASE_URL = 'https://mtsqqxjefcxiifundphf.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10c3FxeGplZmN4aWlmdW5kcGhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA3MTU0NiwiZXhwIjoyMDkyNjQ3NTQ2fQ.O4PHDREd0tfZ-lXZfJN0034UTroOlrdf4K_-T96ZtqM';

const ALUMNOS = [
  { legajo: '2331032', nombre: 'ALEJANDRO CHOQUE, WILMER',              email: 'walejandrochoque@frba.utn.edu.ar' },
  { legajo: '2342960', nombre: 'ALVES, RAMIRO AGUSTIN',                 email: 'ralves@frba.utn.edu.ar' },
  { legajo: '2342972', nombre: 'ALVORNOZ, LUCAS TOMAS',                 email: 'lalvornoz@frba.utn.edu.ar' },
  { legajo: '2219682', nombre: 'ANDRADE, TOBÍAS',                       email: 'tandrade@frba.utn.edu.ar' },
  { legajo: '2336881', nombre: 'APONTE, FEDERICO AGUSTÍN',              email: 'faponte@frba.utn.edu.ar' },
  { legajo: '2328707', nombre: 'BARCO, BRUNO EZEQUIEL',                 email: 'bbarco@frba.utn.edu.ar' },
  { legajo: '2355346', nombre: 'BAZOALTO CORDOBA, TICIANO JAVIER',      email: 'tbazoaltocordoba@frba.utn.edu.ar' },
  { legajo: '2595412', nombre: 'BELTRAN, BENJAMIN SANTIAGO',            email: 'benjasbeltran@gmail.com' },
  { legajo: '2216218', nombre: 'BISSO, LAUTARO',                        email: 'lbisso@frba.utn.edu.ar' },
  { legajo: '2084077', nombre: 'CABRERA, FRANCO DANIEL',                email: 'francocabrera@frba.utn.edu.ar' },
  { legajo: '2350749', nombre: 'CAIG, AGUSTIN',                         email: 'acaig@frba.utn.edu.ar' },
  { legajo: '2337575', nombre: 'CAMPOS, VICTORIA BELEN',                email: 'vcampos@frba.utn.edu.ar' },
  { legajo: '2228257', nombre: 'CARDOSO, LUCIA AYELEN',                 email: 'lucardoso@frba.utn.edu.ar' },
  { legajo: '2079513', nombre: 'CEBALLOS, CRISTIAN ANDRÉS',             email: 'cceballos@frba.utn.edu.ar' },
  { legajo: '2287298', nombre: 'CHAVEZ MEJIA, JOSE ENRIQUE',            email: 'jchavezmejia@frba.utn.edu.ar' },
  { legajo: '2326346', nombre: 'CIGNACCO PECORARI, WANDA AYLEN',        email: 'wcignacco@frba.utn.edu.ar' },
  { legajo: '2136004', nombre: 'CIGNONI, FACUNDO EZEQUIEL',             email: 'fcignoni@frba.utn.edu.ar' },
  { legajo: '2035169', nombre: 'COHEN, GAEL SALOMON',                   email: 'gacohen@frba.utn.edu.ar' },
  { legajo: '2287304', nombre: 'COTRONE, MARIANELLA',                   email: 'macotrone@frba.utn.edu.ar' },
  { legajo: '2338051', nombre: 'CUSSI, MATIAS LAUTARO EZEQUIEL',        email: 'macussi@frba.utn.edu.ar' },
  { legajo: '2355050', nombre: 'DIAZ ROJAS, ABRIL CAROLINA',            email: 'adiazrojas@frba.utn.edu.ar' },
  { legajo: '2338385', nombre: 'DOMINGUEZ, IGNACIO AGUSTIN',            email: 'idominguez@frba.utn.edu.ar' },
  { legajo: '2338518', nombre: 'ESCALADA, GONZALO',                     email: 'goescalada@frba.utn.edu.ar' },
  { legajo: '2334215', nombre: 'FARIÑA TORRES, KARINA ISABEL',          email: 'kfarina@frba.utn.edu.ar' },
  { legajo: '2330490', nombre: 'FERNANDES, EZEQUIEL OMAR',              email: 'efernandes@frba.utn.edu.ar' },
  { legajo: '2597354', nombre: 'FORCONI, JUAN',                         email: 'jforconi@frba.utn.edu.ar' },
  { legajo: '2347611', nombre: 'GAUVRON, SANTIAGO',                     email: 'sgauvron@frba.utn.edu.ar' },
  { legajo: '2335839', nombre: 'GAVILÁN, JUAN IGNACIO',                 email: 'jgavilan@frba.utn.edu.ar' },
  { legajo: '2137513', nombre: 'GOMEZ, FEDERICO RODRIGO',               email: 'fedegomez@frba.utn.edu.ar' },
  { legajo: '2335876', nombre: 'GOMEZ, KEVIN AGUSTIN',                  email: 'kegomez@frba.utn.edu.ar' },
  { legajo: '2350919', nombre: 'GOMEZ, TOMAS RODRIGO',                  email: 'tomasgomez@frba.utn.edu.ar' },
  { legajo: '2611946', nombre: 'GRAFFI MOLTRASIO, LUCAS VICTORIO',      email: 'lgraffimoltrasio@frba.utn.edu.ar' },
  { legajo: '2349851', nombre: 'GROSS, MARIA LAURA',                    email: 'mgross@frba.utn.edu.ar' },
  { legajo: '2329062', nombre: 'GUIMPELEVICH NÚÑEZ, IGNACIO',           email: 'iguimpelevich@frba.utn.edu.ar' },
  { legajo: '2216670', nombre: 'HUAMANI, SALE DE LOS ANGELES',          email: 'sahuamani@frba.utn.edu.ar' },
  { legajo: '2608261', nombre: 'LARREA, JUAN CRUZ',                     email: 'jularrea@frba.utn.edu.ar' },
  { legajo: '2346904', nombre: 'LARROSA GONZÁLEZ, JONATHAN',            email: 'jlarrosagonzalez@frba.utn.edu.ar' },
  { legajo: '2216760', nombre: 'LAZCANO, ABRIL ALEJANDRA',              email: 'alazcano@frba.utn.edu.ar' },
  { legajo: '2287821', nombre: 'LEDESMA, IGNACIO MANUEL',               email: 'igledesma@frba.utn.edu.ar' },
  { legajo: '2339870', nombre: 'LESZCZUK SAAD, MATÍAS',                 email: 'mleszczuksaad@frba.utn.edu.ar' },
  { legajo: '2339900', nombre: 'LINARES FLORES, LEONARDO',              email: 'llinaresflores@frba.utn.edu.ar' },
  { legajo: '2334460', nombre: 'MARTINEZ OSORIO, JOAQUIN',              email: 'jmartinezosorio@frba.utn.edu.ar' },
  { legajo: '2331962', nombre: 'MARTINEZ, TAMIR EINAR',                 email: 'tammartinez@frba.utn.edu.ar' },
  { legajo: '1725956', nombre: 'MAX JIMENEZ, MANUEL ALEXANDER',         email: 'mmaxjimenez@frba.utn.edu.ar' },
  { legajo: '2346989', nombre: 'MAZZA CAMPERO, ANTONELLA GIOVANNA',     email: 'amazzacampero@frba.utn.edu.ar' },
  { legajo: '2611193', nombre: 'MOYA VEGA, GABRIELA FERNANDA',          email: 'gmoyavega@frba.utn.edu.ar' },
  { legajo: '2154158', nombre: 'NUMBELA, ALEJANDRO GASTON',             email: 'anumbela@frba.utn.edu.ar' },
  { legajo: '2334537', nombre: 'ONTIVEROS, LEILA JEMIMA',               email: 'lontiveros@frba.utn.edu.ar' },
  { legajo: '2208593', nombre: 'OTERO, MARIANO FELIPE',                 email: 'mariotero@frba.utn.edu.ar' },
  { legajo: '2354949', nombre: 'PACHERRES VILLA, SERGIO EMANUEL',       email: 'spacherresvilla@frba.utn.edu.ar' },
  { legajo: '2345894', nombre: 'PEREZ SILVA, MATHIAS MAURICIO',         email: 'mperezsilva@frba.utn.edu.ar' },
  { legajo: '2287912', nombre: 'PEREZ, TOMAS NICOLAS CESAR',            email: 'tomaperez@frba.utn.edu.ar' },
  { legajo: '2212560', nombre: 'PIÑOL, MATÍAS AYRTON',                  email: 'mpinol@frba.utn.edu.ar' },
  { legajo: '2341130', nombre: 'PONCE BONACI, ARIANNYS ANDREÍNA',       email: 'arponce@frba.utn.edu.ar' },
  { legajo: '2355061', nombre: 'PROVITINA, SANTIAGO',                   email: 'sprovitina@frba.utn.edu.ar' },
  { legajo: '2347544', nombre: 'RAPALINI OLIVELLA, JOAQUIN',            email: 'jrapalini@frba.utn.edu.ar' },
  { legajo: '2349619', nombre: 'RIOS VILLALBA, FACUNDO EZEQUIEL',       email: 'facundorios@frba.utn.edu.ar' },
  { legajo: '2347209', nombre: 'SALAS, BRUNO EDUARDO',                  email: 'bsalas@frba.utn.edu.ar' },
  { legajo: '2342017', nombre: 'SCIARRILLO GUIDALI, SANTINO LUCA',      email: 'ssciarrilloguidali@frba.utn.edu.ar' },
  { legajo: '2330258', nombre: 'SEMENOV, NIKITA',                       email: 'nsemenov@frba.utn.edu.ar' },
  { legajo: '2604814', nombre: 'SENDROWICZ, IAIR',                      email: 'isendrowicz@frba.utn.edu.ar' },
  { legajo: '2212468', nombre: 'SILVA PEDRAZA, IAN LEONEL',             email: 'isilvapedraza@frba.utn.edu.ar' },
  { legajo: '2214532', nombre: 'SILVA, GONZALO JOEL',                   email: 'gosilva@frba.utn.edu.ar' },
  { legajo: '2334781', nombre: 'SOLANO BANDO, NICOLAS BENJAMIN',        email: 'nsolanobando@frba.utn.edu.ar' },
  { legajo: '2342182', nombre: 'SOSA, ISAIAS DANIEL',                   email: 'issosa@frba.utn.edu.ar' },
  { legajo: '1631421', nombre: 'TAPIA JARAMILLO, ISMAEL',               email: 'itapiaj@frba.utn.edu.ar' },
  { legajo: '2591110', nombre: 'TARAVINI, VALENTINO',                   email: 'vtaravini@frba.utn.edu.ar' },
  { legajo: '2336388', nombre: 'TOLA CHOQUEVILLCA, LIONEL MATIAS',      email: 'ltola@frba.utn.edu.ar' },
  { legajo: '2227599', nombre: 'TSANGOULAS, TOMÁS',                     email: 'ttsangoulas@frba.utn.edu.ar' },
  { legajo: '2352199', nombre: 'VOLPE, VALENTÍN TOBÍAS',                email: 'vvolpe@frba.utn.edu.ar' },
  { legajo: '2227964', nombre: 'YANARICO MACUCHAPI, PABLO',             email: 'pyanarico@frba.utn.edu.ar' },
  { legajo: '2342832', nombre: 'ZAPATA, FRANCO MARTIN',                 email: 'fzapata@frba.utn.edu.ar' },
  { legajo: '2347556', nombre: 'ZEBALLOS DOMÍNGUEZ, ERIKA GÉNESIS',     email: 'erikazeballos@frba.utn.edu.ar' },
  { legajo: '2342868', nombre: 'ZÁRATE, LUCAS DAVID',                   email: 'lucazarate@frba.utn.edu.ar' },
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
    body: JSON.stringify({ nombre: 'Z1133', turno: 'Mañana', anio: 2026 }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Error creando comisión: ${res.status} ${txt}`);
  }
  const [comision] = await res.json();
  console.log(`✓ Comisión Z1133 creada: ${comision.id}`);
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
  console.log(`Cargando ${ALUMNOS.length} alumnos en comisión Z1133...\n`);

  const comisionId = await crearComision();

  let ok = 0;
  const errores = [];

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
