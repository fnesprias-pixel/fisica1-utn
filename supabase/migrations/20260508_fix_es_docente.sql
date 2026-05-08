-- Fix: es_docente() causaba loop infinito porque consultaba 'usuarios'
-- que a su vez llamaba a es_docente() para evaluar la RLS.
-- La solución es SECURITY DEFINER: la función corre con privilegios
-- del dueño (postgres) y bypasea el RLS al consultarse a sí misma.

CREATE OR REPLACE FUNCTION es_docente()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'docente'
  );
$$;
