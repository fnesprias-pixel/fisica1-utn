import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODELO_DEFAULT = "google/gemini-2.5-pro-preview";

const SYSTEM_PROMPT = `Sos un docente experto en Física I (UTN FRBA) que va a desarrollar la resolución completa de un ejercicio.
Tu resolución será la "solución de referencia" que la IA usará para corregir los trabajos de los alumnos, así que debe ser impecable.

REGLAS OBLIGATORIAS — las mismas que en la corrección:

1. UNIDADES EN CADA PASO
   Las unidades deben acompañar CADA número en CADA línea del desarrollo.
   ✅ F = 5 kg · 10 m/s² = 50 kg·m/s² = 50 N
   ❌ F = 5 · 10 = 50 N

2. VECTORES Y COMPONENTES
   - Magnitud vectorial completa: **F**, **v**, **a** (usá negrita en tu texto)
   - Componente escalar sobre un eje (en DCL): Fx, Fy, ax — sin negrita, es un escalar.

3. CONSTANTE GRAVITATORIA
   Usar g = 10 m/s² salvo que el problema indique otro valor.

4. NOTACIÓN DE SUBÍNDICES Y SUPERÍNDICES
   Usá siempre _{x} para subíndices y ^{x} para superíndices, con llaves obligatorias.
   ✅ \\(v_{1}\\), \\(E_{p,grav}\\), \\(cm^{3}\\), \\(gr/cm^{3}\\)

5. INTEGRALES CON LÍMITES EXPLÍCITOS
   ✅ \\(W = \\int_{A}^{B} \\mathbf{F} \\cdot d\\mathbf{L}\\)

6. CONVENCIONES DEL DEPARTAMENTO
   - Fluidos: δ = densidad (masa/volumen), ρ = peso específico (peso/volumen).

7. PASO A PASO COMPLETO. No saltear ningún paso. Cada ecuación explicitada.

8. AL FINAL DE CADA PARTE: enmarcá el resultado con \\[\\boxed{resultado}\\]

FORMATO DE RESPUESTA:
- LaTeX inline: \\( ... \\)
- LaTeX display (ecuaciones centradas): \\[ ... \\]
- Partes del ejercicio: <strong>a)</strong>, <strong>b)</strong>
- DCL (si aplica): describilo en texto
- Respondé SOLO con la resolución, sin preámbulos ni explicaciones fuera del desarrollo.`;

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
    const { enunciado } = body;
    if (!enunciado) throw new Error("enunciado es requerido");

    const modelo = Deno.env.get("MODELO_IA") ?? MODELO_DEFAULT;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("OPENROUTER_API_KEY")!}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://fisica1-utn-w59y.vercel.app",
        "X-Title": "Fisica I UTN - Resolver Actividad",
      },
      body: JSON.stringify({
        model: modelo,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Resolvé completamente el siguiente ejercicio de Física I:\n\n${enunciado}`,
          },
        ],
        max_tokens: 4096,
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
