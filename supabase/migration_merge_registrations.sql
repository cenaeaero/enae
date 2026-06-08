-- =============================================================================
-- Función: merge_registrations(source, keeper)
-- =============================================================================
-- Fusiona DOS inscripciones del mismo alumno/curso en una sola, SIN perder
-- datos académicos. Mueve todos los registros hijos de `source` a `keeper`
-- (ignorando colisiones: en caso de choque gana lo que ya tiene `keeper`),
-- copia los campos resumen al keeper si están vacíos, y finalmente borra la
-- inscripción `source`. Es atómica (todo o nada).
--
-- Uso desde el panel /admin/duplicados (botón "Fusionar → conservar") vía RPC.
-- =============================================================================

CREATE OR REPLACE FUNCTION merge_registrations(p_source uuid, p_keeper uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_source IS NULL OR p_keeper IS NULL OR p_source = p_keeper THEN
    RAISE EXCEPTION 'source/keeper inválidos';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM registrations WHERE id = p_keeper) THEN
    RAISE EXCEPTION 'La inscripción a conservar no existe';
  END IF;

  -- ---- avance de módulos/actividades (unique: registration_id, activity_id)
  UPDATE activity_progress a SET registration_id = p_keeper
   WHERE a.registration_id = p_source
     AND NOT EXISTS (SELECT 1 FROM activity_progress k
                     WHERE k.registration_id = p_keeper AND k.activity_id = a.activity_id);
  DELETE FROM activity_progress WHERE registration_id = p_source;

  -- ---- notas por ítem (unique: registration_id, grade_item_id)
  UPDATE student_grades a SET registration_id = p_keeper
   WHERE a.registration_id = p_source
     AND NOT EXISTS (SELECT 1 FROM student_grades k
                     WHERE k.registration_id = p_keeper AND k.grade_item_id = a.grade_item_id);
  DELETE FROM student_grades WHERE registration_id = p_source;

  -- ---- intentos de examen (unique: exam_id, registration_id, attempt_number)
  UPDATE exam_attempts a SET registration_id = p_keeper
   WHERE a.registration_id = p_source
     AND NOT EXISTS (SELECT 1 FROM exam_attempts k
                     WHERE k.registration_id = p_keeper AND k.exam_id = a.exam_id
                       AND k.attempt_number = a.attempt_number);
  DELETE FROM exam_attempts WHERE registration_id = p_source;

  -- ---- entregas de tareas (unique: activity_id, registration_id)
  UPDATE task_submissions a SET registration_id = p_keeper
   WHERE a.registration_id = p_source
     AND NOT EXISTS (SELECT 1 FROM task_submissions k
                     WHERE k.registration_id = p_keeper AND k.activity_id = a.activity_id);
  DELETE FROM task_submissions WHERE registration_id = p_source;

  -- ---- encuestas (unique: registration_id, questionnaire_type, module_name)
  UPDATE survey_responses a SET registration_id = p_keeper
   WHERE a.registration_id = p_source
     AND NOT EXISTS (SELECT 1 FROM survey_responses k
                     WHERE k.registration_id = p_keeper
                       AND k.questionnaire_type = a.questionnaire_type
                       AND COALESCE(k.module_name,'') = COALESCE(a.module_name,''));
  DELETE FROM survey_responses WHERE registration_id = p_source;

  -- ---- asistencia a clases síncronas (unique: synchronous_class_id, registration_id)
  UPDATE class_attendance a SET registration_id = p_keeper
   WHERE a.registration_id = p_source
     AND NOT EXISTS (SELECT 1 FROM class_attendance k
                     WHERE k.registration_id = p_keeper
                       AND k.synchronous_class_id = a.synchronous_class_id);
  DELETE FROM class_attendance WHERE registration_id = p_source;

  -- ---- vínculo a casos de facturación (pk: billing_case_id, registration_id)
  UPDATE billing_case_registrations a SET registration_id = p_keeper
   WHERE a.registration_id = p_source
     AND NOT EXISTS (SELECT 1 FROM billing_case_registrations k
                     WHERE k.registration_id = p_keeper
                       AND k.billing_case_id = a.billing_case_id);
  DELETE FROM billing_case_registrations WHERE registration_id = p_source;

  -- ---- tablas sin colisión problemática: mover todo
  UPDATE discussion_posts SET registration_id = p_keeper WHERE registration_id = p_source;
  UPDATE payments         SET registration_id = p_keeper WHERE registration_id = p_source;
  UPDATE diplomas         SET registration_id = p_keeper WHERE registration_id = p_source;
  UPDATE dgac_procedures  SET registration_id = p_keeper WHERE registration_id = p_source;
  UPDATE student_notes    SET registration_id = p_keeper WHERE registration_id = p_source;

  -- ---- copiar campos resumen al keeper si están vacíos / pendientes
  UPDATE registrations k SET
     final_score       = COALESCE(k.final_score, s.final_score),
     grade_status      = CASE WHEN k.grade_status IS NULL OR k.grade_status = 'pending'
                              THEN s.grade_status ELSE k.grade_status END,
     folio_enae        = COALESCE(k.folio_enae, s.folio_enae),
     theoretical_start = COALESCE(k.theoretical_start, s.theoretical_start),
     practical_end     = COALESCE(k.practical_end, s.practical_end),
     status            = CASE WHEN s.status = 'completed' THEN 'completed' ELSE k.status END
  FROM registrations s
  WHERE k.id = p_keeper AND s.id = p_source;

  -- ---- finalmente, borrar la inscripción source (ya sin hijos)
  DELETE FROM registrations WHERE id = p_source;
END;
$$;
