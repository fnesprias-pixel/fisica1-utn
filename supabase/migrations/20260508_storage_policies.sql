-- Políticas RLS para el bucket de storage 'entregas'

-- Estudiantes pueden subir archivos a su propia carpeta (usuario_id/...)
CREATE POLICY "entregas_storage_estudiante_sube"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'entregas'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Usuarios autenticados pueden ver sus propios archivos
CREATE POLICY "entregas_storage_estudiante_lee"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'entregas'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Docentes pueden ver todos los archivos del bucket
CREATE POLICY "entregas_storage_docente_lee_todo"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'entregas'
  AND es_docente()
);

-- Lectura pública (el bucket es público, esto permite las URLs públicas)
CREATE POLICY "entregas_storage_publico_lee"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'entregas');
