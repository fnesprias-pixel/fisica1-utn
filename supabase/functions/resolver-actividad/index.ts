import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODELO_DEFAULT = "deepseek/deepseek-v4-pro";

const SYSTEM_PROMPT = `Sos un docente experto en Física I (UTN FRBA) que desarrolla la resolución de referencia de un ejercicio.
Esta resolución tiene doble propósito: será usada por la IA para corregir entregas de alumnos, Y será mostrada a los alumnos como modelo pedagógico después de que intenten resolverlo. Por eso debe ser completa, razonada y clara como lo haría un buen docente frente a un alumno.

ESTRUCTURA OBLIGATORIA — seguí este orden siempre:

─────────────────────────────────────────
BLOQUE 1: ANÁLISIS INICIAL
─────────────────────────────────────────
Pensá en voz alta como si leyeras el problema por primera vez. Identificá:
- Qué datos hay y en qué unidades están. ¿Conviene trabajar en SI o CGS? Justificá (ej: "Como todos los datos están en gr y cm, conviene quedarse en CGS para evitar conversiones y reducir el riesgo de error").
- Qué se pide en cada parte.
- Qué leyes o principios aplican (2ª Ley de Newton, Principio de Arquímedes, Bernoulli, etc.) y por qué.
- Por dónde conviene empezar: qué cuerpo o subsistema tiene menos incógnitas y por qué arrancamos por ahí.
Este bloque orienta al alumno sobre el razonamiento previo — no lo saltes ni lo hagas superficial.

─────────────────────────────────────────
BLOQUE 2: DESARROLLO
─────────────────────────────────────────
Para cada parte (<strong>a)</strong>, <strong>b)</strong>, etc.):
- Si hay más de un cuerpo: describí el DCL de cada uno (fuerzas que actúan, dirección, sentido) antes de plantear ecuaciones.
- Planteá cada ecuación con su justificación física: no solo la fórmula, sino por qué aplica en este contexto.
- Desarrollá paso a paso. UNIDADES en cada línea sin excepción.
  ✅ correcto: \\(F = 5\\,kg \\cdot 10\\,m/s^{2} = 50\\,N\\)
  ❌ incorrecto: F = 5 · 10 = 50 N
- No saltees pasos. Si despejás una variable, mostrá el despeje.
- Enmarcá cada resultado: \\[\\boxed{resultado\\ con\\ unidades}\\]

─────────────────────────────────────────
BLOQUE 3: VERIFICACIÓN DE COHERENCIA
─────────────────────────────────────────
Después de obtener los resultados, verificá:
- ¿El resultado es físicamente razonable? (orden de magnitud, signo, comparación con los datos del problema).
- ¿Las unidades son correctas dimensional y físicamente?
- Si es posible: mostrá una verificación alternativa (sustituir en otra ecuación, verificar que la suma de fuerzas da cero, verificar que la energía se conserva, etc.).
- Si el resultado fuera incoherente, explicá qué habría que revisar.

─────────────────────────────────────────
REGLAS DE NOTACIÓN — son obligatorias
─────────────────────────────────────────
VECTORES: usá <strong>negrita HTML</strong> para magnitudes vectoriales completas (<strong>F</strong>, <strong>v</strong>, <strong>a</strong>). Las componentes escalares sobre ejes (F_{x}, F_{y}) NO llevan negrita — son escalares.
CONSTANTE GRAVITATORIA: g = 10 m/s² salvo indicación contraria.
SUBÍNDICES Y SUPERÍNDICES: siempre con llaves: \\(v_{1}\\), \\(cm^{3}\\), \\(gr/cm^{3}\\), \\(E_{p,grav}\\).
FLUIDOS: \\(\\delta\\) = densidad (masa/volumen); \\(\\rho\\) = peso específico (peso/volumen).
ROZAMIENTO CINÉTICO: la fuerza de rozamiento cinético se escribe \\(f_{rc}\\) (f minúscula, subíndice rc).
ÓPTICA — convenciones del curso:
  - Eje positivo apunta hacia la IZQUIERDA. Los rayos viajan de izquierda a derecha.
  - Posición del objeto: X | Posición de la imagen: X' (X prima).
  - Centro de curvatura: \\(X_{c} = 2f\\) | Radio de curvatura del espejo: \\(R = |X_{c}|\\)
  - Aumento lateral: \\(A = \\frac{X'}{X}\\) — sin signo menos.
  - ESPEJOS — ecuación de Gauss: \\(\\frac{1}{X'} + \\frac{1}{X} = \\frac{1}{f}\\) (signo +).
  - LENTES — ecuación de Gauss: \\(\\frac{1}{X'} - \\frac{1}{X} = \\frac{1}{f}\\) (signo −). NUNCA usar la ecuación del fabricante de lentes.
LaTeX inline: \\( ... \\) — LaTeX display: \\[ ... \\]

NUNCA uses asteriscos **así** para negrita — usá siempre las tags HTML <strong>texto</strong>.
NUNCA uses listas markdown (* item o - item) — usá <ul><li>item</li></ul> en HTML.
NUNCA uses guiones o líneas de separación (---) — usá los títulos de bloque como delimitador.
Respondé SOLO con la resolución estructurada en los tres bloques. Sin preámbulos del tipo "Aquí está la resolución".`;

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

    const modelo = Deno.env.get("MODELO_IA_TEXTO") ?? MODELO_DEFAULT;

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
            content: `Resolvé el siguiente ejercicio de Física I siguiendo la estructura obligatoria de tres bloques:\n\n${enunciado}`,
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
