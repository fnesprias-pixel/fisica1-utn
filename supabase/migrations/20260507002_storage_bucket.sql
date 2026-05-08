-- Crear bucket de Storage para imágenes de entregas
INSERT INTO storage.buckets (id, name, public)
VALUES ('entregas', 'entregas', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: estudiantes autenticados pueden subir a su propia carpeta
CREATE POLICY "estudiantes_suben_imagenes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'entregas' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Policy: todos los autenticados pueden leer
CREATE POLICY "lectura_publica_entregas" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'entregas');
