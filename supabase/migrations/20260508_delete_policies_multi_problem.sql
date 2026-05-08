-- Soporte para múltiples problemas por corrección
ALTER TABLE correcciones ADD COLUMN IF NOT EXISTS problemas JSONB;

-- Políticas de eliminación para entregas
CREATE POLICY "entregas_estudiante_elimina"
ON entregas FOR DELETE TO authenticated
USING (usuario_id = auth.uid());

CREATE POLICY "entregas_docente_elimina"
ON entregas FOR DELETE TO authenticated
USING (es_docente());

-- Políticas de eliminación para correcciones
CREATE POLICY "correcciones_estudiante_elimina"
ON correcciones FOR DELETE TO authenticated
USING (entrega_id IN (SELECT id FROM entregas WHERE usuario_id = auth.uid()));

CREATE POLICY "correcciones_docente_elimina"
ON correcciones FOR DELETE TO authenticated
USING (es_docente());
