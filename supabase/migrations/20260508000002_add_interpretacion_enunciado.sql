-- Agrega campo de interpretación del enunciado a la tabla correcciones
ALTER TABLE correcciones ADD COLUMN IF NOT EXISTS interpretacion_enunciado TEXT;
