-- Habilitar autocorrección iaNes por estudiante (piloto)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS autocorreccion_ia BOOLEAN DEFAULT FALSE;

-- Docentes pueden actualizar datos de alumnos (ej: habilitar autocorrección)
CREATE POLICY "docente_actualiza_alumnos"
ON usuarios FOR UPDATE TO authenticated
USING (es_docente()) WITH CHECK (es_docente());

-- Comentarios de alumnos sobre sus correcciones
CREATE TABLE IF NOT EXISTS comentarios_correccion (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correccion_id UUID NOT NULL REFERENCES correcciones(id) ON DELETE CASCADE,
  usuario_id    UUID NOT NULL REFERENCES usuarios(id),
  rol           TEXT NOT NULL CHECK (rol IN ('estudiante', 'docente')),
  texto         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE comentarios_correccion ENABLE ROW LEVEL SECURITY;

-- Insertar solo comentarios propios
CREATE POLICY "comentarios_insert_propio"
ON comentarios_correccion FOR INSERT TO authenticated
WITH CHECK (usuario_id = auth.uid());

-- Leer: el propio alumno ve los suyos; el docente ve todos
CREATE POLICY "comentarios_select"
ON comentarios_correccion FOR SELECT TO authenticated
USING (usuario_id = auth.uid() OR es_docente());
