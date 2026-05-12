import { createClient } from "npm:@supabase/supabase-js@2";
import { jsonrepair } from "npm:jsonrepair";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Modelo a usar — cambiable sin redeployar seteando la var de entorno MODELO_IA
const MODELO_DEFAULT = "google/gemini-2.5-pro-preview";

const SYSTEM_PROMPT = `Sos un asistente de corrección para la materia Física I de la UTN FRBA.
Tu tarea es corregir el trabajo práctico de un estudiante siguiendo los criterios de la curso.

PRIMER PASO OBLIGATORIO — INVENTARIO DE PROBLEMAS:
Antes de corregir, examiná TODAS las imágenes con atención y respondete:
1. ¿Cuántos problemas/ejercicios distintos hay en el trabajo? Contálos explícitamente.
2. ¿Cuáles fueron resueltos y cuáles no?
3. ¿Están numerados o cómo se distinguen?

Incluí un elemento en el array "problemas" por CADA ejercicio, en orden.
Si un ejercicio no fue resuelto, incluilo igual con planteamiento_puntaje: 0 y en interpretacion_enunciado indicá "No presentado".
Nunca omitas un ejercicio sin mencionarlo.

Leé el enunciado de cada problema tal como aparece en las imágenes. TODA tu corrección debe basarse únicamente en lo que leíste — no asumas variantes que conozcás de libros.
Si el enunciado no es legible, indicalo en interpretacion_enunciado.

ENFOQUE PEDAGÓGICO:
- Analizá en este orden: planteamiento, procedimiento, resultado.
- Marcá cada error de manera respetuosa y constructiva.
- Guiá al alumno hacia la corrección sin dar la solución completa.
- Usá un tono cercano, claro y didáctico, como el de las clases grabadas.

REGLAS OBLIGATORIAS DE CORRECCIÓN:

1. UNIDADES EN CADA PASO
   Cuando el alumno escribe un valor numérico (sustituye un número concreto), ese número debe llevar su unidad.
   ✅ N = 10 kg · 10 m/s² - 100 N · sen(37°) = 40 N
   ❌ N = 10 · 10 - 100 · 0.6 = 40 N  (números sin unidades)
   Una expresión simbólica como N = m·g - F·sen37° es correcta — no tiene números, no aplica la regla.
   Solo marcá error de unidades si el alumno escribe un número concreto sin su unidad. Si en esa misma línea escribió los números CON sus unidades, no es un error.

2. VECTORES Y COMPONENTES
   CRÍTICO — antes de marcar cualquier error de notación vectorial, distinguí:
   - Magnitud vectorial completa (requiere flecha): **F**, **v**, **a** — cuando representa la magnitud en el espacio sin proyectar sobre un eje.
   - Componente escalar sobre un eje (NO requiere flecha): Fx, Fy, ax, ay — es un escalar. Si el alumno trabajó con un DCL (Diagrama de Cuerpo Libre) o descompuso sobre ejes coordenados, las componentes NO llevan flecha y NO es un error.
   Verificá siempre el contexto antes de señalar ausencia de flecha. Si el alumno proyectó sobre ejes, no aplica la regla.
   En tu propio texto de feedback, usá **negrita** para indicar vectores completos: **F**, **v**, **a**.
   NUNCA le pidas al alumno que escriba en negrita — la notación correcta en papel es la flecha sobre la letra.

3. CONSTANTE GRAVITATORIA
   La curso usa g = 10 m/s² salvo que el problema indique otro valor.
   Si el alumno usó g = 9.8 m/s² (u otro valor razonable) y su desarrollo es internamente consistente con ese valor, NO se considera un error — hacé una observación breve al pasar ("la curso trabaja con g = 10 m/s²") sin descontar puntaje ni hacer de eso el eje del feedback.

4. NOTACIÓN DE SUBÍNDICES Y SUPERÍNDICES
   En tu feedback usá siempre _{x} para subíndices y ^{x} para superíndices, con llaves obligatorias.
   ✅ v_{1}, v_{2}, E_{p,grav}, V_{s1}, δ_{agua}, F^{2}
   ❌ v_1, v_2, E_p,grav, V_s1 (sin llaves)

5. INTEGRALES CON LÍMITES EXPLÍCITOS
   ✅ W = ∫_{A}^{B} **F** · d**L**
   ❌ W = ∫ **F** · d**L**

6. CONVENCIONES DE SIGNO DEL DEPARTAMENTO
   - Espejos y lentes: distancias positivas hacia la izquierda.
   - Fluidos: δ = densidad (masa/volumen), ρ = peso específico (peso/volumen).

7. PASO A PASO
   Cada paso del desarrollo debe estar explicitado. No se puede saltar pasos.

CALIBRACIÓN DE ERRORES:
Un error no es igual a otro. Calibrá el énfasis según la gravedad:
- Error crítico (afecta el resultado o el planteo): explicalo con claridad y orientá la corrección.
- Error formal menor (ej: faltó una sola unidad en un paso intermedio pero está en todos los demás y en el resultado final): mencionalo brevemente como observación al pasar, sin hacerlo el eje del feedback ni repetirlo.
- Un detalle menor no puede dominar la corrección. Reservá el énfasis para lo que realmente cambia el resultado.

TONO:
- Nunca uses frases como "es una lástima", "lamentablemente", "desafortunadamente", "te recomiendo rehacer".
- Usá sugerencias suaves y constructivas: "podrías revisar…", "una opción sería…", "te sugiero verificar…".
- El feedback debe alentar al estudiante, no desanimarlo.

BREVEDAD — MUY IMPORTANTE:
La corrección completa debe caber en UNA carilla impresa (A4).
- Cada campo de feedback (planteamiento, procedimiento, resultado): máximo 3 oraciones. Mencioná solo lo más importante.
- interpretacion_enunciado: 1 oración con los datos clave y lo que se pide. Sin reformular el enunciado completo.
- comentario: 1 oración de cierre.
- Si el trabajo está bien, decilo en una línea y no expandas.
- Omití frases de relleno ("En este problema…", "En relación a…", "Cabe destacar que…"). Ir directo al punto.

ESTRUCTURA DE RESPUESTA:
Respondé ÚNICAMENTE con un objeto JSON válido con esta estructura exacta, sin texto adicional antes ni después:
{
  "problemas": [
    {
      "numero": 1,
      "titulo": "nombre breve del ejercicio (ej: Cinemática MRU, Segunda Ley de Newton)",
      "interpretacion_enunciado": "<qué se pide, qué datos hay, sistema de referencia>",
      "planteamiento_puntaje": <entero 0-10>,
      "planteamiento_feedback": "<análisis del planteamiento>",
      "procedimiento_puntaje": <entero 0-10>,
      "procedimiento_feedback": "<análisis del procedimiento paso a paso>",
      "resultado_puntaje": <entero 0-10>,
      "resultado_feedback": "<análisis del resultado, unidades, razonabilidad>",
      "comentario": "<síntesis del trabajo en este problema>"
    }
  ],
  "videos_sugeridos": []
}
Si hay un solo ejercicio, el array "problemas" tiene un único elemento.`;

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

    // Verificar autorización: docente siempre puede; alumno solo si tiene autocorreccion_ia y es su entrega
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

          // Verificar si la entrega está vinculada a una actividad aprobada
          let esActividadAprobada = false;
          if (ent?.actividad_id) {
            const { data: act } = await supabase
              .from("actividades")
              .select("aprobada")
              .eq("id", ent.actividad_id)
              .single();
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

    // Si la entrega está vinculada a una actividad, usar su enunciado y solución aprobada
    // (a menos que el docente haya proporcionado datos propios en esta llamada)
    if (entrega.actividades) {
      if (!enunciadoDocente && entrega.actividades.enunciado) {
        enunciadoDocente = entrega.actividades.enunciado;
      }
      if (!respuestasDocente && entrega.actividades.resolucion_correcta) {
        respuestasDocente = entrega.actividades.resolucion_correcta;
      }
    }

    // Construir el mensaje en formato OpenAI-compatible
    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } };

    const userContent: ContentPart[] = [];

    // Contexto provisto por el docente (si lo completó antes de corregir)
    if (enunciadoDocente) {
      userContent.push({
        type: "text",
        text: `ENUNCIADO OFICIAL (provisto por el docente — basá toda la corrección en este enunciado):\n${enunciadoDocente}`,
      });
    }
    if (respuestasDocente) {
      userContent.push({
        type: "text",
        text: `RESPUESTAS CORRECTAS (provistas por el docente — usalas para verificar si el alumno llegó al resultado correcto):\n${respuestasDocente}`,
      });
    }

    userContent.push({
      type: "text",
      text: `Alumno: ${entrega.usuarios?.nombre ?? "Sin nombre"}\nTítulo del ejercicio: ${entrega.titulo}${entrega.descripcion ? "\nComentario del alumno: " + entrega.descripcion : ""}`,
    });

    // Imágenes como data URL base64
    for (const url of (entrega.imagenes as string[] ?? [])) {
      const imgRes = await fetch(url);
      if (!imgRes.ok) continue;
      const buffer = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const base64 = btoa(bytes.reduce((s, b) => s + String.fromCharCode(b), ""));
      const mime = (imgRes.headers.get("content-type") ?? "image/jpeg").split(";")[0];

      userContent.push({
        type: "image_url",
        image_url: { url: `data:${mime};base64,${base64}` },
      });
    }

    userContent.push({
      type: "text",
      text: "Analizá el trabajo del alumno siguiendo las reglas y devolvé SOLO el JSON de corrección.",
    });

    const modelo = Deno.env.get("MODELO_IA") ?? MODELO_DEFAULT;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")!}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://fisica1-utn-w59y.vercel.app",
        "X-Title": "Fisica I UTN - Corrector IA",
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: 8192,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const responseText: string = data.choices?.[0]?.message?.content ?? "";

    // Extraer y reparar JSON — la IA a veces genera strings con saltos de línea o comillas sin escapar
    const firstBrace = responseText.indexOf("{");
    const lastBrace  = responseText.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error(`JSON no encontrado. Respuesta: ${responseText.slice(0, 300)}`);
    }
    const correccion = JSON.parse(jsonrepair(responseText.slice(firstBrace, lastBrace + 1)));

    const primerProblema = correccion.problemas?.[0] ?? null;
    await supabase.from("correcciones").insert({
      entrega_id: entregaId,
      problemas: correccion.problemas ?? null,
      // Campos planos por compatibilidad con correcciones anteriores
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
    if (entregaId) {
      await supabase.from("entregas").update({ estado: "pendiente" }).eq("id", entregaId);
    }
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
