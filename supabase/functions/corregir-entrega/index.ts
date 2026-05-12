import { createClient } from "npm:@supabase/supabase-js@2";
import { jsonrepair } from "npm:jsonrepair";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Paso 1 — visión: transcribir el trabajo del alumno desde las imágenes
const MODELO_VISION_DEFAULT = "google/gemini-2.5-flash";

// Paso 2 — corrección completa: razonamiento + feedback pedagógico
const MODELO_CORRECCION_DEFAULT = "google/gemini-2.5-pro";

// ─── PROMPT PASO 1: transcripción ────────────────────────────────────────────
const VISION_PROMPT = `Sos un asistente que transcribe con precisión el trabajo manuscrito de un alumno de Física.
Tu única tarea es describir y transcribir TODO lo que aparece en las imágenes, sin omitir ni resumir nada.

Incluí:
- Cantidad de problemas/ejercicios y cómo están identificados (numerados, por letra, etc.)
- Para cada problema: todos los datos que el alumno escribió, el sistema de referencia elegido (si lo indicó), el DCL o diagrama (describilo en texto), todas las ecuaciones planteadas con sus variables, cada paso del desarrollo numérico con los valores y unidades tal como los escribió, el resultado final.
- Cualquier tachadura, corrección o anotación al margen relevante.
- Si algo es ilegible, indicalo explícitamente.

No evalúes si está bien o mal. Solo transcribí fielmente lo que ves.`;

// ─── PROMPT PASO 2: corrección completa (Gemini 2.5 Pro) ─────────────────────
const SYSTEM_PROMPT = `Sos un docente corrector de Física I (UTN FRBA). Corregís el trabajo práctico de un alumno con rigor matemático y feedback pedagógico en un solo paso.
Recibirás la transcripción del trabajo del alumno (extraída de sus imágenes) y, si existe, la resolución de referencia del docente.

PRIMER PASO OBLIGATORIO — INVENTARIO:
Antes de corregir, contá cuántos ejercicios hay. Incluí un elemento por CADA uno.
Si un ejercicio no fue resuelto, incluilo con puntajes en 0 e "No presentado" en interpretacion_enunciado.

ANÁLISIS MATEMÁTICO (hacelo con máximo rigor):
- Verificá matemáticamente cada paso.
- Identificá todos los errores: conceptuales, de planteamiento, de cálculo, de unidades, de signos.
- Basate ÚNICAMENTE en lo que dice la transcripción. No supongas pasos no escritos.
- Si hay resolución de referencia, es la verdad absoluta.

FEEDBACK PEDAGÓGICO:
- Tono cercano, constructivo y motivador. Mencioná aciertos antes que errores.
- Nunca uses "lamentablemente", "es una lástima", "desafortunadamente", "te recomiendo rehacer".
- Usá "podrías revisar…", "te sugiero verificar…", "una opción sería…", "notá que…".
- Guiá al alumno hacia la corrección sin dar la solución completa.
- Calibrá el énfasis: error crítico → explicalo en detalle; error formal menor → mencionalo de pasada.
- Extendete lo que sea necesario para que el feedback sea pedagógicamente completo.

REGLAS OBLIGATORIAS DEL CURSO:
1. UNIDADES: cuando el alumno sustituye un valor numérico, debe llevar su unidad. ✅ N = 10 kg · 10 m/s² ❌ N = 10 · 10
2. VECTORES: distinguí magnitud vectorial completa (lleva flecha en papel) de componente escalar sobre eje (NO lleva flecha). Verificá el contexto antes de señalar ausencia de flecha.
3. g = 10 m/s² salvo indicación. Si el alumno usó 9,8 consistentemente: observación breve, no error.
4. TRIG: sen(37°)=0,6 | cos(37°)=0,8 | sen(53°)=0,8 | cos(53°)=0,6. Si el alumno usó valores exactos (ej: cos(37°)≈0,7986) de forma consistente: solo una observación breve al pasar. NUNCA cites el valor exacto en el feedback — solo la aproximación del curso.
5. FLUIDOS: δ = densidad (masa/volumen) | ρ = peso específico (peso/volumen).
6. No pedirle al alumno que escriba en negrita — la notación correcta en papel es la flecha sobre la letra.

FORMATO DE SALIDA — HTML + LaTeX (obligatorio):
- <strong>texto</strong> para negrita. NUNCA **texto**.
- <ul><li>item</li></ul> para listas. NUNCA * item.
- LaTeX inline: \\( ... \\) — OBLIGATORIO el backslash antes del paréntesis.
- LaTeX display: \\[ ... \\]
- TODA expresión matemática va dentro de delimitadores con backslash. NUNCA LaTeX crudo.
  ✅ correcto:  \\(\\sum F_{x} = m \\cdot a\\)
  ❌ incorrecto: ( \\sum F_{x} = m \\cdot a )  ← sin backslash, NO se renderiza
  ❌ incorrecto: \\sum F_{x} = m \\cdot a      ← sin delimitadores, se ve como texto roto
- Subíndices y superíndices siempre con llaves: \\(v_{1}\\), \\(F_{x}\\), \\(E_{p,grav}\\), \\(m^{2}\\)
- Vectores completos en el feedback: <strong>F</strong>, <strong>v</strong>, <strong>a</strong>

Devolvé SOLO el JSON con esta estructura exacta, sin texto adicional:
{
  "problemas": [
    {
      "numero": 1,
      "titulo": "nombre del ejercicio (ej: Dinámica - Segunda Ley, Hidrostática - Arquímedes)",
      "interpretacion_enunciado": "HTML: qué se pide, datos clave, sistema de referencia",
      "planteamiento_puntaje": <entero 0-10>,
      "planteamiento_feedback": "HTML pedagógico sobre el planteamiento",
      "procedimiento_puntaje": <entero 0-10>,
      "procedimiento_feedback": "HTML pedagógico sobre el desarrollo paso a paso",
      "resultado_puntaje": <entero 0-10>,
      "resultado_feedback": "HTML pedagógico sobre el resultado y su razonabilidad",
      "comentario": "HTML con síntesis motivadora del trabajo en este ejercicio"
    }
  ],
  "videos_sugeridos": []
}`;


// ─── Helper: llamada a OpenRouter ────────────────────────────────────────────
async function llamarOpenRouter(
  apiKey: string,
  model: string,
  messages: object[],
  maxTokens: number,
  temperature: number,
  title: string,
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://fisica1-utn-w59y.vercel.app",
      "X-Title": title,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter error ${response.status} (${model}): ${err}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Helper: escapar backslashes LaTeX antes de parsear JSON ─────────────────
// DeepSeek emite \sum, \text{N}, \circ, etc. con un solo backslash dentro del JSON.
// JSON.parse interpreta \t como TAB, descarta \s, \c, etc. arruinando el LaTeX.
// Este paso dobla solo los backslashes SUELTOS (\X → \\X), sin tocar los ya doblados (\\X).
// Usa lookbehind Y lookahead para no procesar el segundo \ de un par \\X.
function escaparLatexEnJSON(raw: string): string {
  return raw.replace(/(?<!\\)\\(?!\\)([a-zA-Z\(\)\[\]\{\}|])/g, "\\\\$1");
}

// ─── Helper: extraer y reparar JSON ──────────────────────────────────────────
function extraerJSON(texto: string): unknown {
  const firstBrace = texto.indexOf("{");
  const lastBrace  = texto.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1)
    throw new Error(`JSON no encontrado. Respuesta: ${texto.slice(0, 300)}`);
  const raw = escaparLatexEnJSON(texto.slice(firstBrace, lastBrace + 1));
  return JSON.parse(jsonrepair(raw));
}

// ─── Handler principal ────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let entregaId: string | null = null;

  try {
    const body = await req.json();
    entregaId = body.entrega_id;
    if (!entregaId) throw new Error("entrega_id requerido");
    let enunciadoDocente: string | null = body.enunciado ?? null;
    let respuestasDocente: string | null = body.respuestas ?? null;

    // Verificar autorización
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        const { data: perfil } = await supabase
          .from("usuarios").select("rol, autocorreccion_ia").eq("id", user.id).single();
        if (perfil?.rol !== "docente") {
          const { data: ent } = await supabase
            .from("entregas")
            .select("usuario_id, actividad_id")
            .eq("id", entregaId).single();
          const esPropia = ent?.usuario_id === user.id;
          const tieneIa = perfil?.autocorreccion_ia;

          let esActividadAprobada = false;
          if (ent?.actividad_id) {
            const { data: act } = await supabase
              .from("actividades").select("aprobada").eq("id", ent.actividad_id).single();
            esActividadAprobada = act?.aprobada === true;
          }

          if (!esPropia || (!tieneIa && !esActividadAprobada)) {
            return new Response(JSON.stringify({ error: "No autorizado" }), {
              status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    const { data: entrega, error: entregaErr } = await supabase
      .from("entregas")
      .select("*, usuarios(nombre), actividades(titulo, enunciado, resolucion_correcta)")
      .eq("id", entregaId)
      .single();

    if (entregaErr || !entrega) throw new Error("Entrega no encontrada");

    if (entrega.actividades) {
      if (!enunciadoDocente && entrega.actividades.enunciado)
        enunciadoDocente = entrega.actividades.enunciado;
      if (!respuestasDocente && entrega.actividades.resolucion_correcta)
        respuestasDocente = entrega.actividades.resolucion_correcta;
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY")!;
    const modeloVision     = Deno.env.get("MODELO_IA_VISION")  ?? MODELO_VISION_DEFAULT;
    const modeloCorreccion = Deno.env.get("MODELO_IA")         ?? MODELO_CORRECCION_DEFAULT;

    // ── PASO 1: transcribir imágenes ─────────────────────────────────────────
    // Pasamos las URLs públicas directamente — Gemini las descarga por su cuenta,
    // lo que elimina por completo el consumo de memoria de la edge function.
    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } };

    const visionContent: ContentPart[] = (entrega.imagenes as string[] ?? [])
      .map((url): ContentPart => ({ type: "image_url", image_url: { url } }));

    visionContent.push({
      type: "text",
      text: "Transcribí fielmente todo el contenido de estas imágenes según las instrucciones.",
    });

    const transcripcion = await llamarOpenRouter(
      apiKey, modeloVision,
      [{ role: "system", content: VISION_PROMPT }, { role: "user", content: visionContent }],
      4096, 0.1, "Fisica I UTN - Transcripción"
    );

    // ── PASO 2: corrección completa (Gemini 2.5 Pro) ─────────────────────────
    let contextoCorreccion = "";
    if (enunciadoDocente)
      contextoCorreccion += `ENUNCIADO OFICIAL:\n${enunciadoDocente}\n\n`;
    if (respuestasDocente)
      contextoCorreccion += `RESOLUCIÓN DE REFERENCIA:\n${respuestasDocente}\n\n`;
    contextoCorreccion += `Alumno: ${entrega.usuarios?.nombre ?? "Sin nombre"}\n`;
    contextoCorreccion += `Título: ${entrega.titulo}\n`;
    if (entrega.descripcion)
      contextoCorreccion += `Comentario del alumno: ${entrega.descripcion}\n`;
    contextoCorreccion += `\nTRANSCRIPCIÓN DEL TRABAJO DEL ALUMNO:\n${transcripcion}`;

    const correccionRaw = await llamarOpenRouter(
      apiKey, modeloCorreccion,
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `${contextoCorreccion}\n\nDevolvé SOLO el JSON de corrección.` },
      ],
      8192, 0.3, "Fisica I UTN - Corrección"
    );

    const correccion = extraerJSON(correccionRaw) as {
      problemas: {
        numero: number;
        titulo: string;
        interpretacion_enunciado: string;
        planteamiento_puntaje: number;
        planteamiento_feedback: string;
        procedimiento_puntaje: number;
        procedimiento_feedback: string;
        resultado_puntaje: number;
        resultado_feedback: string;
        comentario: string;
      }[];
      videos_sugeridos: string[];
    };

    // ── Persistir en BD ───────────────────────────────────────────────────────
    const primerProblema = correccion.problemas?.[0] ?? null;
    await supabase.from("correcciones").insert({
      entrega_id: entregaId,
      problemas: correccion.problemas ?? null,
      interpretacion_enunciado: primerProblema?.interpretacion_enunciado ?? null,
      planteamiento_puntaje: primerProblema?.planteamiento_puntaje ?? null,
      planteamiento_feedback: primerProblema?.planteamiento_feedback ?? null,
      procedimiento_puntaje: primerProblema?.procedimiento_puntaje ?? null,
      procedimiento_feedback: primerProblema?.procedimiento_feedback ?? null,
      resultado_puntaje: primerProblema?.resultado_puntaje ?? null,
      resultado_feedback: primerProblema?.resultado_feedback ?? null,
      videos_sugeridos: correccion.videos_sugeridos ?? [],
    });

    await supabase.from("entregas").update({ estado: "corregida" }).eq("id", entregaId);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    if (entregaId)
      await supabase.from("entregas").update({ estado: "pendiente" }).eq("id", entregaId);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
