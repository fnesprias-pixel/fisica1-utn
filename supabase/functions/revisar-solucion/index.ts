import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODELO_DEFAULT = "google/gemini-2.5-pro-preview";

const SYSTEM_PROMPT = `Sos un asistente que ayuda a docentes de Física I (UTN FRBA) a revisar la resolución de referencia de un ejercicio antes de publicarlo.

Tu tarea es revisar que la resolución sea:
1. Correcta conceptual y matemáticamente (verificá cada paso).
2. Completa (que no falten pasos, justificaciones o unidades importantes).
3. Pedagógicamente clara (que un estudiante pueda seguirla paso a paso).

Si encontrás errores, señalalos con precisión y sugerí la corrección concreta.
Si la resolución está bien, decilo claramente.
Usá un tono directo, profesional y constructivo.
Respondé en español. Máximo 500 palabras.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: perfil } = await supabase.from("usuarios").select("rol").eq("id", user.id).single();
    if (perfil?.rol !== "docente") {
      return new Response(JSON.stringify({ error: "Solo disponible para docentes" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { enunciado, resolucion } = body;
    if (!enunciado || !resolucion) throw new Error("enunciado y resolucion son requeridos");

    const modelo = Deno.env.get("MODELO_IA") ?? MODELO_DEFAULT;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")!}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://fisica1-utn-w59y.vercel.app",
        "X-Title": "Fisica I UTN - Revisor Docente",
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `ENUNCIADO:\n${enunciado}\n\nRESOLUCIÓN DE REFERENCIA (del docente):\n${resolucion}\n\n¿La resolución es correcta y completa? ¿Qué mejoras sugerís?`,
          },
        ],
        max_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ feedback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
