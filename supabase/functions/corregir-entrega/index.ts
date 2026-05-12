import { createClient } from "npm:@supabase/supabase-js@2";
import { jsonrepair } from "npm:jsonrepair";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Paso 1 — visión: transcribir el trabajo del alumno desde las imágenes
const MODELO_VISION_DEFAULT = "google/gemini-2.5-flash";

// Paso 2 — razonamiento matemático puro (sin pedagogía)
const MODELO_ANALISIS_DEFAULT = "deepseek/deepseek-v4-pro";

// Paso 3 — pedagogía y formato (toma el análisis de DeepSeek y lo convierte en feedback)
const MODELO_PEDAGOGIA_DEFAULT = "google/gemini-2.5-pro";

// ─── PROMPT PASO 1: transcripción ────────────────────────────────────────────
const VISION_PROMPT = `Sos un asistente que transcribe con precisión el trabajo manuscrito de un alumno de Física.
Tu única tarea es describir y transcribir TODO lo que aparece en las imágenes, sin omitir ni resumir nada.

Incluí:
- Cantidad de problemas/ejercicios y cómo están identificados (numerados, por letra, etc.)
- Para cada problema: todos los datos que el alumno escribió, el sistema de referencia elegido (si lo indicó), el DCL o diagrama (describilo en texto), todas las ecuaciones planteadas con sus variables, cada paso del desarrollo numérico con los valores y unidades tal como los escribió, el resultado final.
- Cualquier tachadura, corrección o anotación al margen relevante.
- Si algo es ilegible, indicalo explícitamente.

No evalúes si está bien o mal. Solo transcribí fielmente lo que ves.`;

// ─── PROMPT PASO 2: análisis matemático (DeepSeek) ───────────────────────────
const ANALISIS_PROMPT = `Sos un evaluador de física con máximo rigor matemático y físico.
Tu única función es identificar con precisión qué está bien y qué está mal en el trabajo del alumno.
No te importa la pedagogía, el tono ni cómo va a leer esto el alumno — solo la verdad técnica.

INSTRUCCIONES:
- Basate ÚNICAMENTE en la transcripción del trabajo del alumno. No supongas pasos que no están escritos.
- Si hay resolución de referencia del docente, es la verdad absoluta para comparar.
- Si la transcripción indica que algo es ilegible, marcalo en interpretacion_enunciado.

CONTEO OBLIGATORIO:
Antes de analizar, contá explícitamente cuántos ejercicios/problemas hay. Incluí un elemento por CADA uno.
Si un ejercicio no fue resuelto, incluilo con puntajes en 0 e indicá "No presentado" en interpretacion_enunciado.

PARA CADA EJERCICIO:
1. Verificá matemáticamente CADA PASO del desarrollo.
2. Listá TODOS los errores con precisión:
   - Conceptuales (ley mal aplicada, principio incorrecto)
   - De planteamiento (ecuaciones mal planteadas, sistema de referencia incorrecto)
   - De cálculo (errores aritméticos, algebraicos)
   - De unidades (número sin unidad cuando se sustituye un valor concreto)
   - De signos
   Para cada error: qué escribió el alumno y qué debería ser.
3. Listá qué estuvo correcto.
4. Indicá el resultado correcto con unidades.
5. Asigná puntajes enteros 0-10 para planteamiento, procedimiento y resultado.

CONVENCIONES DEL CURSO:
- g = 10 m/s² salvo que el problema indique otro valor
- sen(37°) = 0,6 | cos(37°) = 0,8 | sen(53°) = 0,8 | cos(53°) = 0,6
- δ = densidad (masa/volumen) | ρ = peso específico (peso/volumen)
- Un número concreto sustituido en una ecuación debe llevar su unidad

Devolvé SOLO un JSON válido, sin texto adicional:
{
  "problemas": [
    {
      "numero": 1,
      "titulo": "nombre técnico del ejercicio (ej: Dinámica - Segunda Ley, Hidrostática - Arquímedes)",
      "interpretacion_enunciado": "qué se pide, qué datos hay, sistema de referencia",
      "errores": [
        "Error 1: [descripción exacta de qué hizo el alumno] → [qué debería haber hecho / valor correcto]",
        "Error 2: ..."
      ],
      "aciertos": [
        "qué estuvo bien 1",
        "qué estuvo bien 2"
      ],
      "resultado_correcto": "resultado o resultados correctos con unidades",
      "planteamiento_puntaje": 7,
      "procedimiento_puntaje": 5,
      "resultado_puntaje": 8
    }
  ]
}`;

// ─── PROMPT PASO 3: pedagogía y formato (Gemini 2.5 Pro) ─────────────────────
const PEDAGOGIA_PROMPT = `Sos un docente de Física I (UTN FRBA) especializado en dar feedback motivador y pedagógicamente estructurado.
Recibirás el análisis técnico de errores (producido por un evaluador matemático) y tu tarea es transformarlo en feedback útil, claro y alentador para el alumno.

NO repasés los errores por tu cuenta — el análisis técnico ya los identificó con precisión. Tu trabajo es comunicarlos con el mejor criterio pedagógico posible.

TONO Y ENFOQUE:
- Tono cercano, constructivo y motivador.
- Mencioná los aciertos antes que los errores.
- Nunca uses "lamentablemente", "es una lástima", "desafortunadamente", "te recomiendo rehacer".
- Usá "podrías revisar…", "te sugiero verificar…", "una opción sería…", "notá que…".
- Guiá al alumno hacia la corrección sin dar la solución completa.
- Calibrá el énfasis: un error crítico merece explicación detallada; un error formal menor se menciona de pasada.

CALIBRACIÓN DE ERRORES (importantísimo):
- Error crítico (afecta el resultado o el planteo): explicalo con claridad, señalá la causa y orientá.
- Error formal menor (ej: faltó una unidad en un paso pero el resto del desarrollo las tiene): mencionalo brevemente al pasar, sin hacerlo el eje del feedback.
- Un detalle menor no puede dominar el feedback.

CONVENCIONES DEL CURSO (para tu contexto):
- g = 10 m/s², sen(37°) = 0,6, cos(37°) = 0,8, sen(53°) = 0,8, cos(53°) = 0,6
- δ = densidad (masa/volumen) | ρ = peso específico (peso/volumen)
- Vectores completos llevan flecha en papel (no pedirle negrita al alumno). Las componentes sobre ejes son escalares y no llevan flecha.
- Si el alumno usó g = 9,8 m/s² de forma consistente: solo una observación breve, no un error.
- Si usó valores exactos de seno/coseno de forma consistente: solo una observación breve.

FORMATO DE SALIDA — HTML + LaTeX (obligatorio):
- Usá <strong>texto</strong> para negrita. NUNCA **texto**.
- Usá <ul><li>item</li></ul> para listas. NUNCA * item ni - item.
- LaTeX inline: \\( ... \\) | LaTeX display: \\[ ... \\]
- Subíndices y superíndices siempre con llaves: \\(v_{1}\\), \\(F_{x}\\), \\(E_{p,grav}\\), \\(m^{2}\\)
- En tu propio texto de feedback, los vectores completos van en negrita HTML: <strong>F</strong>, <strong>v</strong>, <strong>a</strong>
- Cada campo de feedback debe ser HTML bien estructurado y visualmente legible.
- Extendete lo necesario para que la corrección sea pedagógicamente completa. No hay límite de longitud.

Devolvé SOLO el JSON con esta estructura exacta, sin texto adicional antes ni después:
{
  "problemas": [
    {
      "numero": 1,
      "titulo": "nombre del ejercicio",
      "interpretacion_enunciado": "HTML con descripción clara de qué se pide y los datos clave",
      "planteamiento_puntaje": <entero 0-10>,
      "planteamiento_feedback": "HTML pedagógico sobre el planteamiento del problema",
      "procedimiento_puntaje": <entero 0-10>,
      "procedimiento_feedback": "HTML pedagógico sobre el desarrollo paso a paso",
      "resultado_puntaje": <entero 0-10>,
      "resultado_feedback": "HTML pedagógico sobre el resultado, unidades y razonabilidad",
      "comentario": "HTML con síntesis motivadora del trabajo general en este ejercicio"
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

// ─── Helper: extraer y reparar JSON ──────────────────────────────────────────
function extraerJSON(texto: string): unknown {
  const firstBrace = texto.indexOf("{");
  const lastBrace  = texto.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1)
    throw new Error(`JSON no encontrado. Respuesta: ${texto.slice(0, 300)}`);
  return JSON.parse(jsonrepair(texto.slice(firstBrace, lastBrace + 1)));
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
    const modeloVision     = Deno.env.get("MODELO_IA_VISION")     ?? MODELO_VISION_DEFAULT;
    const modeloAnalisis   = Deno.env.get("MODELO_IA")            ?? MODELO_ANALISIS_DEFAULT;
    const modeloPedagogia  = Deno.env.get("MODELO_IA_PEDAGOGIA")  ?? MODELO_PEDAGOGIA_DEFAULT;

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

    // ── PASO 2: análisis matemático (DeepSeek V4 Pro) ────────────────────────
    let contextoAnalisis = "";
    if (enunciadoDocente)
      contextoAnalisis += `ENUNCIADO OFICIAL:\n${enunciadoDocente}\n\n`;
    if (respuestasDocente)
      contextoAnalisis += `RESOLUCIÓN DE REFERENCIA:\n${respuestasDocente}\n\n`;
    contextoAnalisis += `TRANSCRIPCIÓN DEL TRABAJO DEL ALUMNO:\n${transcripcion}`;

    const analisisRaw = await llamarOpenRouter(
      apiKey, modeloAnalisis,
      [
        { role: "system", content: ANALISIS_PROMPT },
        { role: "user", content: `${contextoAnalisis}\n\nDevolvé SOLO el JSON de análisis.` },
      ],
      4096, 0.1, "Fisica I UTN - Análisis Matemático"
    );

    const analisis = extraerJSON(analisisRaw) as { problemas: object[] };

    // ── PASO 3: feedback pedagógico (Gemini 2.5 Pro) ─────────────────────────
    const contextoPedagogia =
      `Alumno: ${entrega.usuarios?.nombre ?? "Sin nombre"}\n` +
      `Título de la entrega: ${entrega.titulo}\n` +
      (entrega.descripcion ? `Comentario del alumno: ${entrega.descripcion}\n` : "") +
      (enunciadoDocente ? `\nENUNCIADO OFICIAL:\n${enunciadoDocente}\n` : "") +
      `\nANÁLISIS TÉCNICO DE ERRORES (producido por evaluador matemático):\n` +
      JSON.stringify(analisis, null, 2);

    const pedagogiaRaw = await llamarOpenRouter(
      apiKey, modeloPedagogia,
      [
        { role: "system", content: PEDAGOGIA_PROMPT },
        { role: "user", content: `${contextoPedagogia}\n\nTransformá este análisis en feedback pedagógico. Devolvé SOLO el JSON.` },
      ],
      8192, 0.4, "Fisica I UTN - Feedback Pedagógico"
    );

    const correccion = extraerJSON(pedagogiaRaw) as {
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
