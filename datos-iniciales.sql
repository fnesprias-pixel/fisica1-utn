-- =============================================
-- DATOS INICIALES — Física I UTN
-- Ejecutar en: Supabase → SQL Editor
-- =============================================

-- =============================================
-- UNIDAD: Cinemática 1D
-- =============================================

INSERT INTO unidades (nombre, descripcion, orden, activa)
VALUES (
  'Cinemática 1D',
  'Movimiento rectilíneo uniforme y uniformemente variado',
  1,
  true
)
ON CONFLICT DO NOTHING;

-- Guardar el id de la unidad recién creada en una variable
DO $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM unidades WHERE nombre = 'Cinemática 1D' LIMIT 1;

  -- =============================================
  -- TEORÍA 1 — Movimiento Rectilíneo Uniforme (MRU)
  -- =============================================
  INSERT INTO contenido (unidad_id, tipo, titulo, cuerpo, orden)
  VALUES (
    uid,
    'teoria',
    'Movimiento Rectilíneo Uniforme (MRU)',
    '<p>En el <strong>Movimiento Rectilíneo Uniforme</strong> la velocidad es constante y la aceleración es nula.</p>
<p>La posición en función del tiempo se describe con:</p>
\[x(t) = x_0 + v \cdot t\]
<p>donde:</p>
<ul>
  <li>\(x_0\): posición inicial (m)</li>
  <li>\(v\): velocidad constante (m/s)</li>
  <li>\(t\): tiempo (s)</li>
</ul>
<p>La distancia recorrida en un intervalo \(\Delta t\) es:</p>
\[\Delta x = v \cdot \Delta t\]
<p>El gráfico \(x\text{-}t\) es una <strong>recta</strong> con pendiente igual a \(v\). El gráfico \(v\text{-}t\) es una recta horizontal.</p>',
    10
  );

  -- =============================================
  -- TEORÍA 2 — Movimiento Rectilíneo Uniformemente Variado (MRUV)
  -- =============================================
  INSERT INTO contenido (unidad_id, tipo, titulo, cuerpo, orden)
  VALUES (
    uid,
    'teoria',
    'Movimiento Rectilíneo Uniformemente Variado (MRUV)',
    '<p>En el <strong>MRUV</strong> la aceleración \(a\) es constante y no nula. Las ecuaciones cinemáticas son:</p>
\[v(t) = v_0 + a \cdot t\]
\[x(t) = x_0 + v_0 \cdot t + \frac{1}{2} a \cdot t^2\]
\[v^2 = v_0^2 + 2a \cdot \Delta x\]
<p>donde:</p>
<ul>
  <li>\(v_0\): velocidad inicial (m/s)</li>
  <li>\(a\): aceleración constante (m/s²)</li>
  <li>\(\Delta x = x - x_0\): desplazamiento (m)</li>
</ul>
<p>El gráfico \(v\text{-}t\) es una <strong>recta</strong> con pendiente \(a\). El gráfico \(x\text{-}t\) es una <strong>parábola</strong>.</p>',
    20
  );

  -- =============================================
  -- TEORÍA 3 — Velocidad Instantánea
  -- =============================================
  INSERT INTO contenido (unidad_id, tipo, titulo, cuerpo, orden)
  VALUES (
    uid,
    'teoria',
    'Velocidad media y velocidad instantánea',
    '<p>La <strong>velocidad media</strong> en un intervalo \([t_1, t_2]\) es:</p>
\[\bar{v} = \frac{\Delta x}{\Delta t} = \frac{x(t_2) - x(t_1)}{t_2 - t_1}\]
<p>La <strong>velocidad instantánea</strong> es el límite de la velocidad media cuando \(\Delta t \to 0\):</p>
\[v(t) = \lim_{\Delta t \to 0} \frac{\Delta x}{\Delta t} = \frac{dx}{dt}\]
<p>Geométricamente, la velocidad instantánea es la <strong>pendiente de la tangente</strong> a la curva \(x(t)\) en el punto \(t\).</p>
<p>La <strong>aceleración media</strong> se define de forma análoga:</p>
\[\bar{a} = \frac{\Delta v}{\Delta t}\]',
    30
  );

  -- =============================================
  -- EJERCICIO 1 — Problema de MRU
  -- =============================================
  INSERT INTO contenido (unidad_id, tipo, titulo, cuerpo, orden)
  VALUES (
    uid,
    'ejercicio',
    'Problema: encuentro de dos móviles en MRU',
    '<p><strong>Enunciado:</strong> El móvil A parte del origen con velocidad \(v_A = 20\) m/s. El móvil B parte de \(x_0 = 300\) m en sentido contrario con \(v_B = -10\) m/s. ¿En qué instante y posición se encuentran?</p>
<hr style="margin:1rem 0;border-color:var(--borde)"/>
<p><strong>Resolución:</strong></p>
<p>Ecuaciones de posición de cada móvil:</p>
\[x_A(t) = 0 + 20t = 20t\]
\[x_B(t) = 300 + (-10)t = 300 - 10t\]
<p>En el encuentro \(x_A = x_B\):</p>
\[20t = 300 - 10t\]
\[30t = 300\]
\[t = 10 \text{ s}\]
<p>Posición de encuentro:</p>
\[x = 20 \times 10 = 200 \text{ m}\]
<p><strong>Resultado:</strong> se encuentran a los \(t = 10\) s en la posición \(x = 200\) m.</p>',
    40
  );

  -- =============================================
  -- EJERCICIO 2 — Problema de MRUV (frenado)
  -- =============================================
  INSERT INTO contenido (unidad_id, tipo, titulo, cuerpo, orden)
  VALUES (
    uid,
    'ejercicio',
    'Problema: distancia de frenado en MRUV',
    '<p><strong>Enunciado:</strong> Un auto viaja a \(v_0 = 72\) km/h y frena con \(a = -5\) m/s². ¿Cuánto tarda en detenerse y qué distancia recorre?</p>
<hr style="margin:1rem 0;border-color:var(--borde)"/>
<p><strong>Resolución:</strong></p>
<p>Convertir la velocidad inicial:</p>
\[v_0 = 72 \text{ km/h} = 72 \times \frac{1000}{3600} = 20 \text{ m/s}\]
<p>Tiempo hasta \(v = 0\):</p>
\[v(t) = v_0 + at \Rightarrow 0 = 20 + (-5)t \Rightarrow t = 4 \text{ s}\]
<p>Distancia recorrida (usando \(v^2 = v_0^2 + 2a\Delta x\)):</p>
\[0 = 20^2 + 2(-5)\Delta x\]
\[\Delta x = \frac{400}{10} = 40 \text{ m}\]
<p><strong>Resultado:</strong> el auto tarda \(4\) s en detenerse y recorre \(40\) m.</p>',
    50
  );

  -- =============================================
  -- QUIZZES — 8 preguntas mixtas
  -- =============================================

  -- Pregunta 1: opción múltiple
  INSERT INTO quizzes (unidad_id, pregunta, tipo, opciones, respuesta_correcta, explicacion)
  VALUES (
    uid,
    'En un MRU, el gráfico de posición en función del tiempo es:',
    'multiple',
    '["Una parábola", "Una recta con pendiente igual a la velocidad", "Una recta horizontal", "Una curva exponencial"]',
    'Una recta con pendiente igual a la velocidad',
    'En el MRU la velocidad es constante, por lo que x(t) = x₀ + v·t es una función lineal. La pendiente de esa recta es exactamente v.'
  );

  -- Pregunta 2: verdadero / falso
  INSERT INTO quizzes (unidad_id, pregunta, tipo, opciones, respuesta_correcta, explicacion)
  VALUES (
    uid,
    'En el MRUV, la aceleración es constante e igual a cero.',
    'verdadero_falso',
    NULL,
    'Falso',
    'En el MRUV la aceleración es constante pero distinta de cero. Si fuera cero, el movimiento sería MRU.'
  );

  -- Pregunta 3: numérico
  INSERT INTO quizzes (unidad_id, pregunta, tipo, opciones, respuesta_correcta, explicacion)
  VALUES (
    uid,
    'Un objeto parte del reposo con aceleración constante \(a = 4\) m/s². ¿Cuál es su velocidad (en m/s) a los \(t = 3\) s?',
    'numerico',
    NULL,
    '12',
    'Usando v = v₀ + a·t = 0 + 4·3 = 12 m/s.'
  );

  -- Pregunta 4: opción múltiple
  INSERT INTO quizzes (unidad_id, pregunta, tipo, opciones, respuesta_correcta, explicacion)
  VALUES (
    uid,
    'La velocidad instantánea se define como:',
    'multiple',
    '[
      "El cociente entre el desplazamiento total y el tiempo total",
      "La derivada de la posición respecto del tiempo",
      "La integral de la aceleración respecto del tiempo",
      "La pendiente de la recta que une dos puntos del gráfico x-t"
    ]',
    'La derivada de la posición respecto del tiempo',
    'v(t) = dx/dt es la definición formal de velocidad instantánea. La pendiente de la recta que une dos puntos es la velocidad media.'
  );

  -- Pregunta 5: numérico
  INSERT INTO quizzes (unidad_id, pregunta, tipo, opciones, respuesta_correcta, explicacion)
  VALUES (
    uid,
    'Un móvil en MRU recorre \(150\) m en \(10\) s. ¿Cuál es su velocidad en m/s?',
    'numerico',
    NULL,
    '15',
    'v = Δx / Δt = 150 / 10 = 15 m/s.'
  );

  -- Pregunta 6: verdadero / falso
  INSERT INTO quizzes (unidad_id, pregunta, tipo, opciones, respuesta_correcta, explicacion)
  VALUES (
    uid,
    'Si la velocidad de un móvil aumenta con el tiempo, su aceleración es positiva.',
    'verdadero_falso',
    NULL,
    'Verdadero',
    'a = dv/dt. Si v crece, dv/dt > 0, por lo tanto a > 0.'
  );

  -- Pregunta 7: opción múltiple
  INSERT INTO quizzes (unidad_id, pregunta, tipo, opciones, respuesta_correcta, explicacion)
  VALUES (
    uid,
    '¿Cuál de las siguientes ecuaciones corresponde al MRUV?',
    'multiple',
    '[
      "\\(x = x_0 + v \\cdot t\\)",
      "\\(x = x_0 + v_0 t + \\frac{1}{2} a t^2\\)",
      "\\(v = \\frac{x}{t}\\)",
      "\\(a = \\frac{x}{t^2}\\)"
    ]',
    '\\(x = x_0 + v_0 t + \\frac{1}{2} a t^2\\)',
    'Esta es la ecuación horaria del MRUV. La primera opción corresponde al MRU.'
  );

  -- Pregunta 8: numérico
  INSERT INTO quizzes (unidad_id, pregunta, tipo, opciones, respuesta_correcta, explicacion)
  VALUES (
    uid,
    'Un auto frena desde \(v_0 = 30\) m/s con \(a = -3\) m/s². ¿Cuántos segundos tarda en detenerse?',
    'numerico',
    NULL,
    '10',
    'v = v₀ + a·t → 0 = 30 − 3t → t = 10 s.'
  );

END $$;
