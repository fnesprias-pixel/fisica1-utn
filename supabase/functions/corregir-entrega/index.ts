import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Modelo a usar — cambiable sin redeployar seteando la var de entorno MODELO_IA
const MODELO_DEFAULT = "google/gemini-2.5-pro-preview";

const SYSTEM_PROMPT = `Sos un asistente de corrección para la materia Física I de la UTN FRBA.
Tu tarea es corregir el trabajo práctico de un estudiante siguiendo los criterios de la cátedra.

ENFOQUE PEDAGÓGICO:
- Analizá en este orden: primero el planteamiento, luego el procedimiento, luego el resultado.
- Marcá cada error de manera respetuosa y constructiva.
- Sugerí cómo corregir cada error, pero NO des la solución completa directamente. Guiá al alumno.
- Usá un tono cercano, claro y didáctico, como el de las clases grabadas.

REGLAS OBLIGATORIAS DE CORRECCIÓN:

1. UNIDADES EN CADA PASO
   Las unidades deben acompañar CADA número en CADA línea del desarrollo. No se pueden poner solo al final.
   ✅ Correcto:  F = 5 kg · 10 m/s² = 50 kg·m/s² = 50 N
   ❌ Incorrecto: F = 5 · 10 = 50 N

2. VECTORES EN NEGRITA
   Toda magnitud vectorial se escribe en negrita: **F**, **v**, **a**, **L**, **p**, etc.
   Distinguí siempre magnitud escalar de magnitud vectorial.

3. CONSTANTE GRAVITATORIA
   Usar g ≈ 10 m/s² salvo que el problema indique otro valor.

4. NOTACIÓN DE SUBÍNDICES Y SUPERÍNDICES
   Usar subíndices y superíndices reales (Unicode).
   ✅ v₁, v₂, Ep,grav, F²
   ❌ v_1, v_2, E_p,_grav

5. INTEGRALES CON LÍMITES EXPLÍCITOS
   Toda integral debe mostrar los límites inferior y superior.
   ✅ W = ∫_A^B **F** · d**L**
   ❌ W = ∫ **F** · d**L**

6. CONVENCIONES DE SIGNO DEL DEPARTAMENTO
   - Espejos y lentes: distancias positivas hacia la izquierda.
   - Fluidos: δ = densidad (masa/volumen), ρ = peso específico (peso/volumen).

7. PASO A PASO
   Cada paso del desarrollo debe estar explicitado. No se puede saltar pasos.

ESTRUCTURA DE RESPUESTA:
Respondé ÚNICAMENTE con un objeto JSON válido con esta estructura exacta, sin texto adicional antes ni después:
{
  "planteamiento_puntaje": <entero 0-10>,
  "planteamiento_feedback": "<análisis del planteamiento: qué está bien, qué errores hay y cómo corregirlos>",
  "procedimiento_puntaje": <entero 0-10>,
  "procedimiento_feedback": "<análisis del procedimiento paso a paso>",
  "resultado_puntaje": <entero 0-10>,
  "resultado_feedback": "<análisis del resultado final, unidades, razonabilidad>",
  "comentario_general": "<síntesis general del trabajo, refuerzo positivo y próximos pasos>",
  "videos_sugeridos": []
}`;

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

    const { data: entrega, error: entregaErr } = await supabase
      .from("entregas")
      .select("*, usuarios(nombre)")
      .eq("id", entregaId)
      .single();

    if (entregaErr || !entrega) throw new Error("Entrega no encontrada");

    // Construir el mensaje en formato OpenAI-compatible
    type ContentPart =
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } };

    const userContent: ContentPart[] = [];

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

    // Extraer JSON — busca el primer { y el último } ignorando bloques markdown
    const firstBrace = responseText.indexOf("{");
    const lastBrace  = responseText.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error(`JSON no encontrado. Respuesta: ${responseText.slice(0, 300)}`);
    }
    const correccion = JSON.parse(responseText.slice(firstBrace, lastBrace + 1));

    await supabase.from("correcciones").insert({
      entrega_id: entregaId,
      planteamiento_puntaje: correccion.planteamiento_puntaje,
      planteamiento_feedback: correccion.planteamiento_feedback,
      procedimiento_puntaje: correccion.procedimiento_puntaje,
      procedimiento_feedback: correccion.procedimiento_feedback,
      resultado_puntaje: correccion.resultado_puntaje,
      resultado_feedback: correccion.resultado_feedback,
      videos_sugeridos: correccion.videos_sugeridos ?? [],
      comentario_general: correccion.comentario_general,
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
