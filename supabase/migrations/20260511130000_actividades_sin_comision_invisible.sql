-- Cambia comportamiento: actividad sin comisiones asignadas → invisible para todos los alumnos
-- Antes: sin asignaciones = visible para todos. Ahora: debe tener al menos una comisión asignada.
DROP POLICY IF EXISTS "actividades_alumno_select" ON actividades;
CREATE POLICY "actividades_alumno_select"
ON actividades FOR SELECT TO authenticated
USING (
  estado = 'publicada'
  AND NOT es_docente()
  AND EXISTS (
    SELECT 1 FROM actividades_comisiones
    WHERE actividad_id = actividades.id
      AND comision_id = (SELECT comision_id FROM usuarios WHERE id = auth.uid())
  )
);
