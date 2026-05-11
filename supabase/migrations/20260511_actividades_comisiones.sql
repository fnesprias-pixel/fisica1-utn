-- Tabla pivot para relación N:M entre actividades y comisiones
CREATE TABLE IF NOT EXISTS actividades_comisiones (
  actividad_id UUID NOT NULL REFERENCES actividades(id) ON DELETE CASCADE,
  comision_id  UUID NOT NULL REFERENCES comisiones(id) ON DELETE CASCADE,
  PRIMARY KEY (actividad_id, comision_id)
);

ALTER TABLE actividades_comisiones ENABLE ROW LEVEL SECURITY;

-- Docentes gestionan todas las asignaciones
CREATE POLICY "act_com_docente_all"
ON actividades_comisiones FOR ALL TO authenticated
USING (es_docente())
WITH CHECK (es_docente());

-- Alumnos ven solo asignaciones de su comisión
CREATE POLICY "act_com_alumno_select"
ON actividades_comisiones FOR SELECT TO authenticated
USING (
  NOT es_docente()
  AND comision_id = (SELECT comision_id FROM usuarios WHERE id = auth.uid())
);

-- Migrar asignaciones existentes (actividades con comision_id específico)
INSERT INTO actividades_comisiones (actividad_id, comision_id)
SELECT id, comision_id FROM actividades WHERE comision_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Quitar columna legacy (ya no se necesita)
ALTER TABLE actividades DROP COLUMN IF EXISTS comision_id;

-- Actualizar RLS de actividades para alumnos: usa la tabla pivot
DROP POLICY IF EXISTS "actividades_alumno_select" ON actividades;
CREATE POLICY "actividades_alumno_select"
ON actividades FOR SELECT TO authenticated
USING (
  estado = 'publicada'
  AND NOT es_docente()
  AND (
    -- Sin asignaciones específicas → visible para todos
    NOT EXISTS (SELECT 1 FROM actividades_comisiones WHERE actividad_id = actividades.id)
    -- O asignada a la comisión del alumno
    OR EXISTS (
      SELECT 1 FROM actividades_comisiones
      WHERE actividad_id = actividades.id
        AND comision_id = (SELECT comision_id FROM usuarios WHERE id = auth.uid())
    )
  )
);
