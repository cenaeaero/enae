-- Reparación retroactiva: marcar como "completed" la actividad de examen para
-- alumnos que rindieron su examen (exam_attempts.status='completed') pero cuya
-- actividad quedó sin registro en activity_progress. Ese hueco bloqueaba la
-- descarga del Certificado DGAC con "no ha finalizado todos los módulos".
--
-- Causa raíz corregida en src/app/api/examenes/route.ts (se marca la actividad
-- al finalizar el examen). Este script arregla los ~156 casos ya existentes.
-- Ejecutar UNA vez en el SQL Editor de Supabase. Idempotente.

INSERT INTO activity_progress (registration_id, activity_id, status, completed_at)
SELECT DISTINCT ON (ea.registration_id, e.activity_id)
       ea.registration_id, e.activity_id, 'completed', COALESCE(ea.completed_at, now())
FROM exam_attempts ea
JOIN exams e ON e.id = ea.exam_id
WHERE ea.status = 'completed'
  AND e.activity_id IS NOT NULL
ORDER BY ea.registration_id, e.activity_id, ea.completed_at DESC NULLS LAST
ON CONFLICT (registration_id, activity_id)
DO UPDATE SET status = 'completed',
              completed_at = COALESCE(activity_progress.completed_at, EXCLUDED.completed_at);
