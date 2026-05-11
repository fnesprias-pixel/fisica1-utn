-- Soft delete para entregas: en lugar de borrar registros, se marca deleted_at.
-- Esto preserva las correcciones generadas por IA aunque el alumno o docente
-- "eliminen" la entrega desde la UI.
ALTER TABLE entregas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
