-- Actividades: ejercicios con enunciado y resolución de referencia aprobada por el docente
CREATE TABLE IF NOT EXISTS actividades (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo              TEXT NOT NULL,
  enunciado           TEXT NOT NULL,
  resolucion_borrador TEXT,
  resolucion_correcta TEXT,
  aprobada            BOOLEAN DEFAULT FALSE,
  estado              TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'publicada', 'cerrada')),
  unidad_id           INTEGER REFERENCES unidades(id) ON DELETE SET NULL,
  comision_id         UUID REFERENCES comisiones(id) ON DELETE SET NULL,
  created_by          UUID NOT NULL REFERENCES usuarios(id),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE actividades ENABLE ROW LEVEL SECURITY;

-- Docentes gestionan todas las actividades
CREATE POLICY "actividades_docente_all"
ON actividades FOR ALL TO authenticated
USING (es_docente())
WITH CHECK (es_docente());

-- Alumnos ven solo las publicadas (de su comisión o sin filtro de comisión)
CREATE POLICY "actividades_alumno_select"
ON actividades FOR SELECT TO authenticated
USING (
  estado = 'publicada'
  AND NOT es_docente()
  AND (
    comision_id IS NULL
    OR comision_id = (SELECT comision_id FROM usuarios WHERE id = auth.uid())
  )
);

-- Vincular entregas a actividades
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS actividad_id UUID REFERENCES actividades(id) ON DELETE SET NULL;
