import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODELO_DEFAULT = "deepseek/deepseek-v4-pro";

const SYSTEM_PROMPT = `Sos un docente experto en Física I (UTN FRBA) que está revisando y mejorando una resolución de referencia.
Se te dará:
1. El enunciado del ejercicio.
2. La resolución actual (escrita o generada anteriormente).
3. Una instrucción del docente sobre qué cambiar, agregar o mejorar.

Tu tarea es aplicar exactamente los cambios solicitados y devolver la resolución COMPLETA y modificada.

REGLAS:
- Aplicá los cambios pedidos con precisión. No toques lo que no se pidió cambiar.
- Mantené la misma estructura de tres bloques: Análisis inicial, Desarrollo, Verificación de coherencia.
- Si el docente pide agregar algo, integralo en el lugar más lógico de la estructura.
- Si el docente pide corregir algo, corregilo y asegurate de que sea consistente en todo el resto.
- NUNCA uses asteriscos **así** para negrita — usá <strong>texto</strong>.
- NUNCA uses listas markdown (* item) — usá <ul><li>item</li></ul>.
- Unidades en cada línea, subíndices con llaves: \\(v_{1}\\), \\(cm^{3}\\).
- LaTeX inline: \\( ... \\) — LaTeX display: \\[ ... \\]
- Respondé SOLO con la resolución completa y modificada, sin preámbulos.`;

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
    const { enunciado, resolucion_actual, instruccion } = body;
    if (!enunciado || !resolucion_actual || !instruccion) {
      throw new Error("enunciado, resolucion_actual e instruccion son requeridos");
    }

    const modelo = Deno.env.get("MODELO_IA_TEXTO") ?? MODELO_DEFAULT;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")!}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://fisica1-utn-w59y.vercel.app",
        "X-Title": "Fisica I UTN - Iterar Resolucion",
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `ENUNCIADO:\n${enunciado}\n\nRESOLUCIÓN ACTUAL:\n${resolucion_actual}\n\nINSTRUCCIÓN DEL DOCENTE:\n${instruccion}\n\nDevolvé la resolución completa con los cambios aplicados.`,
          },
        ],
        max_tokens: 8192,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const resolucion = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ resolucion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
