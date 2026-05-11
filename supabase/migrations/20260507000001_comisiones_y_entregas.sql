-- ============================================================
-- MIGRACIÓN: comisiones y entregas de ejercicios
-- ============================================================

-- 1. Tabla de comisiones
CREATE TABLE IF NOT EXISTS comisiones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text NOT NULL,          -- ej: "K1051"
  turno       text,                   -- ej: "Mañana", "Noche"
  anio        integer DEFAULT EXTRACT(YEAR FROM now()),
  created_at  timestamptz DEFAULT now()
);

-- Insertar la comisión inicial (se agrega el nombre después)
INSERT INTO comisiones (nombre, turno)
VALUES ('Comisión 1', '')
ON CONFLICT DO NOTHING;

-- 2. Agregar comision_id a usuarios
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS comision_id uuid REFERENCES comisiones(id) ON DELETE SET NULL;

-- 3. Tabla de entregas de ejercicios
CREATE TABLE IF NOT EXISTS entregas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo      text NOT NULL,
  descripcion text,
  imagenes    text[] DEFAULT '{}',    -- array de URLs de Supabase Storage
  estado      text NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente', 'procesando', 'corregida')),
  created_at  timestamptz DEFAULT now()
);

-- 4. Tabla de correcciones (resultado de la IA)
CREATE TABLE IF NOT EXISTS correcciones (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrega_id          uuid NOT NULL REFERENCES entregas(id) ON DELETE CASCADE,
  -- Cada dimensión: puntaje 0-10 + comentario
  planteamiento_puntaje   integer CHECK (planteamiento_puntaje BETWEEN 0 AND 10),
  planteamiento_feedback  text,
  procedimiento_puntaje   integer CHECK (procedimiento_puntaje BETWEEN 0 AND 10),
  procedimiento_feedback  text,
  resultado_puntaje       integer CHECK (resultado_puntaje BETWEEN 0 AND 10),
  resultado_feedback      text,
  -- Videos sugeridos: array de objetos {titulo, url}
  videos_sugeridos    jsonb DEFAULT '[]',
  comentario_general  text,
  created_at          timestamptz DEFAULT now()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

-- comisiones: todos los autenticados pueden leer
ALTER TABLE comisiones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comisiones_lectura" ON comisiones
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "comisiones_docente_escribe" ON comisiones
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'docente')
  );

-- entregas: estudiante ve/crea las suyas; docente ve todas
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entregas_estudiante_lee_suyas" ON entregas
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid());
CREATE POLICY "entregas_estudiante_crea" ON entregas
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "entregas_docente_todo" ON entregas
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'docente')
  );

-- correcciones: estudiante lee las de sus entregas; docente escribe
ALTER TABLE correcciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "correcciones_estudiante_lee" ON correcciones
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM entregas WHERE id = entrega_id AND usuario_id = auth.uid())
  );
CREATE POLICY "correcciones_docente_todo" ON correcciones
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'docente')
  );
