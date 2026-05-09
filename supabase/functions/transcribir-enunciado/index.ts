import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODELO_DEFAULT = "qwen/qwen2.5-vl-72b-instruct";

const SYSTEM_PROMPT = `Sos un asistente que convierte imágenes de enunciados de física a texto HTML con fórmulas LaTeX.

REGLAS:
1. Transcribí el enunciado EXACTAMENTE como aparece: texto, datos, preguntas, todo.
2. Convertí las fórmulas matemáticas a LaTeX:
   - Inline: \\( ... \\)
   - Display (ecuaciones centradas): \\[ ... \\]
3. Para subíndices usá _{x} con llaves. Para superíndices ^{x} con llaves.
   Ejemplos: \\(\\delta_{1}\\), \\(V_{1}\\), \\(cm^{3}\\), \\(gr/cm^{3}\\)
4. Letras griegas: \\delta, \\rho, \\mu, etc.
5. Usá <strong>a)</strong>, <strong>b)</strong> para las partes del ejercicio.
6. Usá <br> para saltos de línea dentro de párrafos.
7. Agrupá los datos en una línea: \\( dato_1 \\), \\( dato_2 \\), ...
8. Respondé SOLO con el HTML+LaTeX del enunciado, sin explicaciones ni texto adicional antes o después.`;

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
    const { imagen_base64, mime_type } = body;
    if (!imagen_base64 || !mime_type) throw new Error("imagen_base64 y mime_type son requeridos");

    const modelo = Deno.env.get("MODELO_IA_VISION") ?? MODELO_DEFAULT;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")!}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://fisica1-utn-w59y.vercel.app",
        "X-Title": "Fisica I UTN - Transcriptor Enunciado",
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mime_type};base64,${imagen_base64}` },
              },
              {
                type: "text",
                text: "Transcribí este enunciado a HTML + LaTeX siguiendo las reglas.",
              },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const enunciado = data.choices?.[0]?.message?.content ?? "";

    return new Response(JSON.stringify({ enunciado }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
