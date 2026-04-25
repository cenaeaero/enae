-- =====================================================
-- Seed: Curso Operador Profesional DJI Matrice 4 Series
-- =====================================================
-- Idempotent: re-running this script replaces the course.
-- 1. Ensure module_activities accepts type=html (admin UI uses it)
DO $check$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'module_activities_type_check'
      AND pg_get_constraintdef(oid) LIKE '%html%'
  ) THEN
    ALTER TABLE module_activities DROP CONSTRAINT IF EXISTS module_activities_type_check;
    ALTER TABLE module_activities ADD CONSTRAINT module_activities_type_check
      CHECK (type IN ('task', 'exam', 'discussion', 'zoom', 'reading', 'html'));
  END IF;
END
$check$;

-- 2. Skip if course already exists (idempotency without DELETE)
DO $exists$
BEGIN
  IF EXISTS (SELECT 1 FROM courses WHERE code = 'ENAE/UAS/M4') THEN
    RAISE EXCEPTION 'Course ENAE/UAS/M4 already exists. Run update_matrice4_modules.sql instead, or DELETE the course first.';
  END IF;
END
$exists$;

-- 3. Insert course
WITH new_course AS (
  INSERT INTO courses (
    code, title, description, area, area_slug, subarea, level, duration,
    modality, language, goal, objectives, modules, target_audience,
    prerequisites, is_active
  ) VALUES (
    'ENAE/UAS/M4',
    'Operador Profesional DJI Matrice 4 Series',
    'Programa integral técnico-operacional para Matrice 4T y Matrice 4E. Cubre arquitectura del sistema, operaciones especializadas (SAR, mapeo RTK, térmica), seguridad operacional y normativa DAN 151 Ed. 4 (DGAC Chile).',
    'UAS/RPAS',
    'uas-rpas',
    'Operaciones RPAS',
    'Avanzado',
    '25 horas',
    'Online',
    'Español',
    'Habilitar al participante para operar con seguridad y eficacia las plataformas DJI Matrice 4T y Matrice 4E en operaciones profesionales (búsqueda y rescate, inspección de infraestructura crítica, mapeo y topografía RTK, operaciones térmicas), conforme a la normativa DAN 151 Ed. 4 de la DGAC Chile.',
    ARRAY['Identificar y describir todos los subsistemas físicos y lógicos de la aeronave Matrice 4 Series.','Operar el control remoto DJI RC Plus 2 y la aplicación DJI Pilot 2 con dominio funcional.','Ejecutar procedimientos pre-vuelo, en-vuelo y post-vuelo conforme a checklist estandarizado.','Aplicar protocolos de seguridad operacional y gestionar zonas GEO, restricciones de altitud y RPO.','Diseñar y ejecutar misiones especializadas (térmica, mapeo RTK, telémetro láser, vuelo nocturno).','Realizar mantenimiento preventivo y diagnosticar fallos comunes con metodología profesional.','Cumplir con la normativa DAN 151 vigente en Chile y regulaciones aplicables al país de operación.']::TEXT[],
    ARRAY['Módulo 1: Introducción a la Serie Matrice 4 y marco normativo','Módulo 2: Arquitectura física de la aeronave','Módulo 3: Sistema de energía y posicionamiento RTK','Módulo 4: Control remoto RC Plus 2 y aplicación DJI Pilot 2','Módulo 5: Operaciones de vuelo y seguridad operacional','Módulo 6: Operaciones especializadas y misiones avanzadas','Módulo 7: Mantenimiento, diagnóstico y certificación','Examen final integrador']::TEXT[],
    ARRAY['Operadores RPAS profesionales que migran a la plataforma Matrice 4 Series.','Pilotos certificados que requieren habilitación específica en M4T / M4E.','Profesionales de seguridad pública, energía, forestal y mapeo topográfico.']::TEXT[],
    ARRAY['Mayor de 18 años.','Certificación previa como Operador RPAS Nivel 1 (ENAE/UAS/001) o equivalente DGAC.','Conocimientos básicos de DAN 151 y operación VLOS.']::TEXT[],
    true
  ) RETURNING id
)
INSERT INTO sessions (course_id, dates, location, modality, fee, is_active)
SELECT id, 'Disponible online', 'Online (autoinstrucción)', 'Online', 'Por confirmar', true FROM new_course;

-- 4. Insert modules + html lessons
DO $$
DECLARE
  v_course_id UUID;
  v_module_id UUID;
  v_activity_id UUID;
  v_exam_id UUID;
  v_grade_item_id UUID;
BEGIN
  SELECT id INTO v_course_id FROM courses WHERE code = 'ENAE/UAS/M4';

  -- Module 1
  INSERT INTO course_modules (course_id, sort_order, title, description)
  VALUES (v_course_id, 1, 'Módulo 1: Introducción a la Serie Matrice 4 y marco normativo', 'Visión general del sistema, diferenciación M4T vs M4E, aplicaciones aeronáuticas, marco regulatorio DAN 151 y certificación C2.')
  RETURNING id INTO v_module_id;
  INSERT INTO module_activities (module_id, sort_order, type, title, description)
  VALUES (v_module_id, 0, 'html', 'Contenido del módulo 1', '<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Módulo 1 — Fundamentos · Matrice 4 Series · ENAE</title>
<link rel="stylesheet" href="https://enae.cl/cursos/matrice4/assets/curso.css">
</head>
<body>

<header class="header-curso">
  <div class="marca">ENAE — Curso Matrice 4 Series</div>
  <h1>Módulo 1 · Introducción a la Serie Matrice 4 y marco normativo</h1>
  <div class="subtitulo">Fundamentos del sistema · 4 lecciones · Caso práctico · 3 horas</div>
</header>



<main class="contenedor">

  <section class="bloque">
    <h2>Presentación del módulo</h2>
    <p>Este módulo inaugural establece el marco conceptual del curso. El participante conocerá el contexto histórico y técnico de la familia Matrice de DJI Enterprise, las diferencias estratégicas entre el Matrice 4T y el Matrice 4E, las aplicaciones profesionales reales en los ámbitos aeronáutico, energético, ambiental y de seguridad pública, así como el marco normativo chileno (DAN 151) e internacional aplicable a la operación de aeronaves remotamente pilotadas (RPA) de hasta 9 kg.</p>

    <div class="objetivos">
      <h3>Objetivos de aprendizaje</h3>
      <ul>
        <li>Reconocer las características generales y la propuesta de valor de la Serie Matrice 4.</li>
        <li>Diferenciar las dos variantes M4T y M4E identificando criterios de selección por misión.</li>
        <li>Identificar al menos cinco aplicaciones profesionales documentadas para la plataforma.</li>
        <li>Describir los requisitos normativos DAN 151 Ed. 4 y la certificación europea Clase C2.</li>
      </ul>
    </div>

    <div class="indice-leccion">
      <h4>Índice del módulo</h4>
      <ol>
        <li><a href="#video-intro">Video de presentación · DJI Enterprise</a></li>
        <li><a href="#l11">Lección 1.1 · Presentación de la Serie Matrice 4</a></li>
        <li><a href="#l12">Lección 1.2 · Diferenciación M4T vs M4E</a></li>
        <li><a href="#l13">Lección 1.3 · Aplicaciones profesionales</a></li>
        <li><a href="#l14">Lección 1.4 · Marco normativo y certificación</a></li>
        <li><a href="#caso">Caso práctico aplicado</a></li>
      </ol>
    </div>
  </section>

  <!-- ============ VIDEO DE PRESENTACIÓN ============ -->
  <section class="bloque" id="video-intro">
    <div class="leccion" style="border:none; padding-bottom:0;">
      <span class="etiqueta">Video introductorio</span>
      <h2>Presentación oficial · DJI Enterprise</h2>

      <p>Antes de iniciar el desarrollo teórico del módulo, observe el siguiente video de presentación de las plataformas DJI Enterprise. Le permitirá contextualizar visualmente la propuesta tecnológica y el ecosistema en el que se inserta la Serie Matrice 4.</p>

      <!-- Contenedor responsivo 16:9 -->
      <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 8px; box-shadow: 0 4px 16px rgba(10, 61, 98, 0.12); background: #000; margin: 18px 0;">
        <!-- CÓDIGO KALTURA INCRUSTADO Y ADAPTADO -->
        <script src="https://cdnapisec.kaltura.com/p/4530803/sp/453080300/embedIframeJs/uiconf_id/49725323/partner_id/4530803"></script>
        <div id="kaltura_player_1776737637" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;"></div>
        <script>
        kWidget.embed({
          "targetId": "kaltura_player_1776737637",
          "wid": "_4530803",
          "uiconf_id": 49725323,
          "flashvars": {},
          "cache_st": 1776737637,
          "entry_id": "1_of7sx68k"
        });
        </script>
      </div>
      <p style="text-align:center; color: var(--gris-suave); font-size: 13px; font-style: italic; margin-top: 6px;">
        Video de presentación oficial de las plataformas DJI Enterprise.
      </p>
    </div>
  </section>

  <!-- ============ LECCIÓN 1.1 ============ -->
  <section class="bloque" id="l11">
    <div class="leccion">
      <span class="etiqueta">Lección 1.1</span>
      <h2>Presentación de la Serie Matrice 4</h2>

      <p>La <strong>Serie DJI Matrice 4</strong>, anunciada formalmente en enero de 2025, constituye la nueva generación de aeronaves remotamente pilotadas de clase ligera-profesional dentro del portafolio DJI Enterprise. La serie reemplaza progresivamente al exitoso Matrice 30 como plataforma compacta de uso operacional intensivo, conservando la propuesta de "drone profesional plegable que cabe en una mochila táctica" e incorporando saltos sustantivos en sensórica, inteligencia a bordo y conectividad.</p>

      <figure class="fig">
        <img src="https://enae.cl/cursos/matrice4/assets/img/matrice4_marketing_01.jpg" alt="DJI Matrice 4 Series en operación">
        <figcaption>DJI Matrice 4 Series — plataforma profesional compacta de operación intensiva.</figcaption>
      </figure>

      <h3>Identidad y posicionamiento</h3>
      <p>La Serie Matrice 4 se posiciona como la plataforma "AI-first" de DJI Enterprise: cada subsistema crítico —sensores, vuelo, percepción y misión— integra capacidades de inteligencia artificial a bordo. El sistema cuenta con detección omnidireccional binocular reforzada con un sensor 3D infrarrojo inferior, seis lentes de bajo nivel de luz que habilitan operación nocturna confiable, y un módulo RTK integrado de fábrica con precisión centimétrica.</p>

      <p>La aeronave aplica el concepto <em>"intelligent flight"</em> propuesto por DJI: el piloto define la intención (qué objetivo cumplir) y el sistema gestiona la ejecución técnica (cómo evitar obstáculos, cómo optimizar la ruta, cómo mantener la geo-referenciación), liberando al operador para concentrarse en la misión.</p>

      <h3>Datos generales del sistema</h3>
      <div class="spec-grid">
        <div class="spec-card"><strong>Peso máximo de despegue</strong><span class="valor">1 420 g (hélices estándar)</span></div>
        <div class="spec-card"><strong>Temperatura operativa</strong><span class="valor">−10 °C a 40 °C</span></div>
        <div class="spec-card"><strong>Frecuencia transmisión</strong><span class="valor">2.4 / 5.1 / 5.8 GHz</span></div>
        <div class="spec-card"><strong>Velocidad máx (Sport)</strong><span class="valor">21 m/s adelante</span></div>
        <div class="spec-card"><strong>Tiempo de vuelo nominal</strong><span class="valor">Hasta 49 min sin carga útil</span></div>
        <div class="spec-card"><strong>Resistencia al viento</strong><span class="valor">12 m/s sostenido</span></div>
        <div class="spec-card"><strong>Sistema GNSS</strong><span class="valor">GPS + Galileo + BeiDou + QZSS</span></div>
        <div class="spec-card"><strong>Posicionamiento RTK</strong><span class="valor">1 cm + 1 ppm horizontal</span></div>
      </div>

      <h3>Composición típica del kit</h3>
      <p>El paquete operativo estándar de la Serie Matrice 4 incluye: la aeronave plegable con cámara y estabilizador integrado, control remoto DJI <strong>RC Plus 2 Enterprise</strong> (o RC Plus 2 Enterprise Enhanced para aplicaciones avanzadas), tres baterías inteligentes TB100, un hub de carga de 100 W, hélices estándar y de bajo ruido (UE), una bolsa de transporte rígida y los cables y tarjetas microSD de almacenamiento.</p>

      <div class="callout">
        <strong>Referencia documental</strong>
        Todo el contenido técnico de este curso se fundamenta en el <em>Manual de Usuario oficial DJI Matrice 4 Series</em>, versión 1.0, publicado por SZ DJI Technology Co., Ltd. en enero de 2025. Es responsabilidad del operador consultar siempre la versión más reciente del manual y las directrices de seguridad antes de cada operación.
      </div>
    </div>
  </section>

  <!-- ============ LECCIÓN 1.2 ============ -->
  <section class="bloque" id="l12">
    <div class="leccion">
      <span class="etiqueta">Lección 1.2</span>
      <h2>Diferenciación M4T vs M4E</h2>

      <p>La Serie Matrice 4 se comercializa en dos variantes funcionalmente especializadas. Aunque ambos modelos comparten la misma plataforma de vuelo, sistema de detección, batería y control remoto, difieren significativamente en su <strong>arquitectura óptica</strong>, lo que las orienta a perfiles operacionales distintos.</p>

      <h3>Comparativa funcional</h3>
      <table class="tabla-curso tabla-comparativa">
        <thead>
          <tr>
            <th>Característica</th>
            <th class="col-m4t">Matrice 4T</th>
            <th class="col-m4e">Matrice 4E</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cámara gran angular</td>
            <td class="col-m4t">CMOS 1/1.3" · 48 MP · f/1.7 fija · 24 mm</td>
            <td class="col-m4e">CMOS 4/3" · 20 MP · f/2.8–f/11 · 24 mm</td>
          </tr>
          <tr>
            <td>Cámara tele media</td>
            <td class="col-m4t">CMOS 1/1.3" · 48 MP · f/2.8 · 70 mm</td>
            <td class="col-m4e">CMOS 1/1.3" · 48 MP · f/2.8 · 70 mm</td>
          </tr>
          <tr>
            <td>Telecámara</td>
            <td class="col-m4t">CMOS 1/1.5" · 48 MP · f/2.8 · 168 mm</td>
            <td class="col-m4e">CMOS 1/1.5" · 48 MP · f/2.8 · 168 mm</td>
          </tr>
          <tr>
            <td>Cámara térmica infrarroja</td>
            <td class="col-m4t"><strong>Sí</strong> · 640 × 512 px (UHR 1280 × 1024)</td>
            <td class="col-m4e">No incluida</td>
          </tr>
          <tr>
            <td>Luz auxiliar NIR</td>
            <td class="col-m4t"><strong>Sí</strong> · alcance 100 m</td>
            <td class="col-m4e">No incluida</td>
          </tr>
          <tr>
            <td>Telémetro láser</td>
            <td class="col-m4t">Sí · alcance 1 800 m</td>
            <td class="col-m4e">Sí · alcance 1 800 m</td>
          </tr>
          <tr>
            <td>Aplicación primaria</td>
            <td class="col-m4t">Seguridad pública · SAR · inspección térmica · operación nocturna</td>
            <td class="col-m4e">Mapeo · topografía · fotogrametría · construcción</td>
          </tr>
        </tbody>
      </table>

      <h3>Criterios de decisión operacional</h3>
      <p>El criterio fundamental para escoger entre M4T y M4E es la <strong>naturaleza espectral</strong> de la información que se necesita levantar. Si la operación requiere detectar diferencias térmicas (búsqueda de personas, focos de incendio, fugas de calor, fallas en transformadores), la única opción válida es el <strong>M4T</strong>. Si la operación requiere imágenes en alta resolución para procesamiento fotogramétrico con apertura ajustable, sensores grandes para baja distorsión y dinámica de exposición controlada, la elección óptima es el <strong>M4E</strong>.</p>

      <div class="callout aviso">
        <strong>Decisión M4T vs M4E</strong>
        Cuando una unidad operativa requiere ambas capacidades (térmica + mapeo de precisión), DJI recomienda contar con ambos modelos en la flota o incorporar adicionalmente el Matrice 4D, que combina ambos perfiles en una versión específica para Dock 3.
      </div>

      <h3>Plataforma común</h3>
      <p>Ambos modelos comparten el mismo bastidor plegable, idéntica configuración de motores, hélices estándar/silenciosas, sistema de detección omnidireccional, módulo RTK, batería TB100 y control remoto. Esto permite que la formación operacional, los procedimientos de checklist y los protocolos de seguridad sean transferibles entre operadores de cualquiera de los modelos.</p>
    </div>
  </section>

  <!-- ============ LECCIÓN 1.3 ============ -->
  <section class="bloque" id="l13">
    <div class="leccion">
      <span class="etiqueta">Lección 1.3</span>
      <h2>Aplicaciones profesionales</h2>

      <p>La Serie Matrice 4 está diseñada explícitamente para misiones donde el fallo no es una opción. Su robustez ambiental (IP55 efectivo en condiciones operativas), su sistema redundante de detección de obstáculos y su radio operativa la han convertido en plataforma estándar para diversos sectores.</p>

      <h3>Sectores y casos de uso</h3>

      <h4 style="color:var(--azul-aeronautico);margin-top:14px;">1. Seguridad pública y respuesta de emergencia</h4>
      <p>Operaciones de búsqueda y rescate (SAR) terrestres, marítimas y de montaña; gestión táctica de incidentes (TTI); reconstrucción aérea de escenas; vigilancia perimetral y apoyo a equipos SWAT/GOPE. La cámara térmica del M4T permite localizar firmas térmicas humanas hasta 200–300 m según condiciones, y la luz NIR amplía el alcance del sensor en oscuridad total.</p>

      <h4 style="color:var(--azul-aeronautico);margin-top:14px;">2. Defensa civil y combate de incendios</h4>
      <p>Monitoreo de propagación de incendios forestales, identificación de focos calientes residuales (post-control), guía de cuadrillas terrestres con vista aérea en tiempo real, evaluación de daños estructurales tras eventos sísmicos, aluviones o erupciones.</p>

      <h4 style="color:var(--azul-aeronautico);margin-top:14px;">3. Energía y servicios públicos</h4>
      <p>Inspección de líneas de transmisión y distribución eléctrica, identificación termográfica de conexiones defectuosas en transformadores, inspección de subestaciones, evaluación del estado de aisladores y aerogeneradores, monitoreo de oleoductos y gasoductos.</p>

      <h4 style="color:var(--azul-aeronautico);margin-top:14px;">4. Construcción y topografía (M4E)</h4>
      <p>Levantamientos topográficos con precisión RTK centimétrica, generación de modelos digitales de superficie (DSM), control de avance de obras, fotogrametría de yacimientos mineros, cubicación de acopios.</p>

      <h4 style="color:var(--azul-aeronautico);margin-top:14px;">5. Inspección de infraestructura crítica</h4>
      <p>Inspección de puentes y viaductos, evaluación de estado de torres de telecomunicaciones, examen no destructivo de fachadas de edificios altos, monitoreo de presas y obras hidráulicas.</p>

      <h4 style="color:var(--azul-aeronautico);margin-top:14px;">6. Conservación y vigilancia ambiental</h4>
      <p>Monitoreo nocturno de fauna silvestre con cámara térmica, detección de tala ilegal, vigilancia de áreas protegidas, monitoreo de glaciares y de salud forestal.</p>

      <h4 style="color:var(--azul-aeronautico);margin-top:14px;">7. Aeronáutica y aviación</h4>
      <p>Inspección de pistas de aterrizaje, evaluación de balizamiento perimetral nocturno, apoyo a investigación de incidentes/accidentes, levantamientos del entorno aeroportuario para obstaculización (siempre con coordinación previa con la TWR/APP correspondiente).</p>

      <div class="callout exito">
        <strong>Buenas prácticas operacionales</strong>
        Independientemente de la aplicación, la primera fase de cualquier operación profesional con Matrice 4 debe ser un <em>"site survey"</em>: reconocimiento del área, identificación de obstáculos, verificación de zonas GEO, coordinación con autoridades aeronáuticas y validación de condiciones meteorológicas. Esta fase no es opcional.
      </div>
    </div>
  </section>

  <!-- ============ LECCIÓN 1.4 ============ -->
  <section class="bloque" id="l14">
    <div class="leccion">
      <span class="etiqueta">Lección 1.4</span>
      <h2>Marco normativo y certificación</h2>

      <p>Operar profesionalmente la Serie Matrice 4 implica cumplir un marco normativo en tres niveles: (1) la regulación nacional del país de operación, (2) las directrices del fabricante (DJI Safety Guidelines y manual de usuario) y (3) las certificaciones internacionales aplicables al producto (Clase C2 europea, FAA Remote ID estadounidense, etc.).</p>

      <h3>Normativa chilena: DAN 151 Ed. 4</h3>
      <p>La <strong>Norma Aeronáutica DAN 151</strong> "Operaciones de Aeronaves Pilotadas a Distancia (RPAS)", emitida por la Dirección General de Aeronáutica Civil (DGAC), regula todas las operaciones civiles de RPAS en territorio chileno. Su edición vigente es la <strong>Edición 4</strong> de mayo de 2024. Aspectos clave para el operador del Matrice 4 Series:</p>

      <table class="tabla-curso">
        <thead>
          <tr><th>Aspecto</th><th>Requerimiento DAN 151</th></tr>
        </thead>
        <tbody>
          <tr><td>Edad mínima del operador</td><td>18 años cumplidos</td></tr>
          <tr><td>Credencial</td><td>Credencial de Piloto a Distancia de RPAS DGAC</td></tr>
          <tr><td>Registro de la aeronave</td><td>Tarjeta de Registro DGAC obligatoria</td></tr>
          <tr><td>Autorización de operación</td><td>AOC para operación comercial / habilitación para uso institucional</td></tr>
          <tr><td>Peso máximo categorización</td><td>Aeronaves &lt; 9 kg (Matrice 4 está dentro: 1.42 kg MTOW)</td></tr>
          <tr><td>Altura máxima</td><td>120 m AGL en condición estándar</td></tr>
          <tr><td>Distancia máxima al operador</td><td>500 m (operación VLOS)</td></tr>
          <tr><td>Operación BVLOS</td><td>Solo con autorización específica DGAC</td></tr>
          <tr><td>Requisitos sobre áreas pobladas</td><td>Procedimiento específico de evaluación de riesgo</td></tr>
          <tr><td>Coordinación TWR/APP</td><td>Obligatoria para operación cercana a aeropuertos/aeródromos</td></tr>
        </tbody>
      </table>

      <div class="callout alerta">
        <strong>Atención — Operación cerca de aeródromos</strong>
        En la actividad de un Controlador de Tránsito Aéreo, la coordinación entre operaciones de RPAS y tráfico tripulado es crítica. La Serie Matrice 4 incluye <strong>DJI AirSense</strong>, sistema receptor ADS-B que alerta al operador sobre tráfico tripulado en proximidad. Sin embargo, AirSense <em>no</em> emite señal hacia los aviones tripulados ni reemplaza la coordinación formal con la dependencia ATC competente.
      </div>

      <h3>Certificación europea Clase C2</h3>
      <p>El Matrice 4 cumple los requisitos del Reglamento Delegado (UE) 2019/945 para la <strong>Clase C2</strong>, lo que habilita su operación en la "categoría abierta — subcategoría A2" del marco europeo: vuelo cerca de personas no involucradas con distancia mínima de 30 m (o 5 m con modo Baja Velocidad activado a 2.8 m/s), MTOW &lt; 4 kg, y operación VLOS.</p>

      <p>La certificación C2 implica también requisitos técnicos de identificación remota directa, geo-consciencia (geoawareness) y notificación al operador del estado de la aeronave. La aplicación DJI Pilot 2 expone estas funciones en su menú de configuración avanzada.</p>

      <h3>Identificación remota directa</h3>
      <p>El Matrice 4 cumple con identificación remota directa, transmitiendo en tiempo real, sin necesidad de conexión a internet, los datos del operador y la aeronave conforme a normativa europea ASD-STAN prEN 4709-002:2021. Estos datos pueden ser captados por receptores autorizados de las autoridades.</p>

      <h3>Cumplimiento del operador</h3>
      <p>La responsabilidad última de la legalidad de cada operación recae siempre en el operador. Antes de cada misión, se debe verificar:</p>
      <ul>
        <li>Vigencia de la credencial del piloto a distancia.</li>
        <li>Vigencia de la tarjeta de registro de la aeronave.</li>
        <li>Estado de la autorización de operación (AOC, si aplica).</li>
        <li>No superposición con zonas restringidas o prohibidas activas.</li>
        <li>Coordinación documentada con autoridades aeronáuticas, si la operación lo requiere.</li>
        <li>Cobertura de seguro de responsabilidad civil aeronáutica vigente.</li>
      </ul>
    </div>
  </section>

  <!-- ============ CASO PRÁCTICO ============ -->
  <section id="caso">
    <div class="caso-practico">
      <div class="header-caso">
        <div class="icono">CP</div>
        <h2 style="margin:0;border:none;">Caso práctico — Selección de plataforma para operación dual</h2>
      </div>

      <div class="escenario">
        <strong>Escenario operacional</strong>
        <p>Una empresa de servicios eléctricos del centro-sur de Chile contrata a su consultora aeronáutica para desarrollar un programa anual de inspección con drones de su red de transmisión de 220 kV. El cliente requiere dos productos diferenciados: <strong>(a)</strong> un informe termográfico de las 380 conexiones de empalme de su línea (detección de puntos calientes y conexiones defectuosas) que debe ejecutarse entre las 22:00 y 04:00 horas para evitar la radiación solar directa, y <strong>(b)</strong> un modelo digital de elevación (DEM) georreferenciado de la franja de servidumbre de 15 km lineales para evaluación de avance de vegetación en la línea. El presupuesto permite adquirir <em>una sola aeronave</em>. La operación requiere autorización DGAC dado que parte de la línea cruza zonas semi-pobladas.</p>
      </div>

      <strong>Preguntas guía para el participante</strong>
      <ul class="preguntas-caso">
        <li>¿Qué modelo de la Serie Matrice 4 recomienda? Justifique la decisión técnica.</li>
        <li>¿Cómo cumpliría con ambos entregables del cliente con una sola aeronave?</li>
        <li>¿Qué consideraciones de la DAN 151 Ed. 4 deben quedar formalmente documentadas en el plan operacional?</li>
        <li>¿Qué función específica del sistema (cámara, telémetro, RTK) explotaría para cada uno de los dos entregables?</li>
        <li>¿Qué riesgos operacionales nocturnos identifica y cómo los mitiga?</li>
      </ul>

      <details class="respuestas-modelo">
        <summary>Respuesta modelo (haga clic para expandir tras resolver)</summary>
        <div style="padding:14px 6px;">
          <p><strong>Recomendación:</strong> el <strong>Matrice 4T</strong> es la elección correcta. Es el único de la serie que cuenta con cámara térmica radiométrica (640 × 512 px), capacidad imprescindible para el entregable (a) de termografía. Para el entregable (b) — el DEM —, el M4T también dispone del telémetro láser de 1 800 m y de la cámara gran angular 48 MP combinada con módulo RTK integrado, lo que permite ejecutar misiones fotogramétricas con precisión adecuada para servidumbre eléctrica (no se requiere precisión topográfica catastral). Si el cliente exigiera precisión cartográfica catastral, se recomendaría el M4E o complementar con punto de control terrestre (GCP).</p>
          <p><strong>Plan operacional dual:</strong> dividir la campaña en dos fases. <em>Fase nocturna</em>: ejecutar la termografía con M4T entre 22:00 y 04:00, configurando misiones waypoint con espaciado de 80 m sobre las conexiones, vuelo a 25 m sobre los conductores, hover de 6 segundos por punto y captura simultánea RGB+IR. <em>Fase diurna</em>: ejecutar misiones de mapeo en franja de 100 m con solapamiento 80/70 % y altitud 80 m AGL.</p>
          <p><strong>Documentación DAN 151 Ed. 4:</strong> AOC vigente; credenciales del piloto a distancia y observador; tarjeta de registro de la aeronave; análisis específico de operación nocturna; coordinación con la dependencia ATC si la traza cruza áreas controladas; evaluación de riesgo sobre áreas semi-pobladas; cobertura de seguro RC aeronáutica; bitácora de mantenimiento; planes de contingencia ante pérdida de enlace y batería baja.</p>
          <p><strong>Funciones a explotar:</strong> entregable (a) — cámara térmica, función PinPoint con telémetro láser para georreferenciar puntos calientes con error &lt; 1 m, luz NIR para iluminación auxiliar de las cámaras visibles. Entregable (b) — cámara gran angular 48 MP con módulo RTK fijado a Network RTK; misión de mapeo en DJI Pilot 2 con orientación oblicua a 70°.</p>
          <p><strong>Riesgos nocturnos y mitigación:</strong> reducción de campo visual del piloto (mitigar con observador adicional y baliza encendida), pérdida de referencias de obstáculos (mitigar con planeación previa de waypoints sobre cartografía existente y uso del sistema de visión de baja luminosidad), bajada de temperatura que reduce capacidad de batería (mitigar precalentando baterías y reduciendo tiempo de vuelo planificado por sortie), interferencia con avifauna nocturna (mitigar con vuelo a velocidad reducida y suspensión inmediata si se detecta).</p>
        </div>
      </details>
    </div>
  </section>

  

</main>



</body>
</html>
');

  -- Module 2
  INSERT INTO course_modules (course_id, sort_order, title, description)
  VALUES (v_course_id, 2, 'Módulo 2: Arquitectura física de la aeronave', 'Anatomía estructural, hélices y propulsión, estabilizador, sistema de cámaras (M4T y M4E), sistema de detección omnidireccional.')
  RETURNING id INTO v_module_id;
  INSERT INTO module_activities (module_id, sort_order, type, title, description)
  VALUES (v_module_id, 0, 'html', 'Contenido del módulo 2', '<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Módulo 2 — Aeronave · Matrice 4 Series · ENAE</title>
<link rel="stylesheet" href="https://enae.cl/cursos/matrice4/assets/curso.css">
</head>
<body>

<header class="header-curso">
  <div class="marca">ENAE — Curso Matrice 4 Series</div>
  <h1>Módulo 2 · Arquitectura física de la aeronave</h1>
  <div class="subtitulo">Hardware del UAV · 5 lecciones · Caso práctico · 4 horas</div>
</header>



<main class="contenedor">

  <section class="bloque">
    <h2>Presentación del módulo</h2>
    <p>En este módulo el participante recorre en detalle la <strong>anatomía física</strong> de la aeronave Matrice 4: estructura, motorización, sistema óptico, estabilizador y sensórica de detección. Conocer cada componente, su función operacional y sus limitaciones es la base para la operación segura, el mantenimiento preventivo eficaz y el diagnóstico de fallos.</p>

    <div class="objetivos">
      <h3>Objetivos de aprendizaje</h3>
      <ul>
        <li>Identificar visualmente cada componente externo de la aeronave Matrice 4 y nombrarlo correctamente.</li>
        <li>Describir el funcionamiento del estabilizador de tres ejes y sus restricciones operacionales.</li>
        <li>Diferenciar la arquitectura óptica del M4T y del M4E, explicando el papel de cada cámara.</li>
        <li>Comprender el sistema de detección omnidireccional y sus limitaciones físicas.</li>
        <li>Aplicar correctamente la nomenclatura técnica DJI en checklists y reportes operacionales.</li>
      </ul>
    </div>

    <div class="indice-leccion">
      <h4>Índice del módulo</h4>
      <ol>
        <li><a href="#l21">Lección 2.1 · Anatomía estructural de la aeronave</a></li>
        <li><a href="#l22">Lección 2.2 · Hélices y propulsión</a></li>
        <li><a href="#l23">Lección 2.3 · Estabilizador y carga útil</a></li>
        <li><a href="#l24">Lección 2.4 · Sistema de cámaras</a></li>
        <li><a href="#l25">Lección 2.5 · Sistema de detección omnidireccional</a></li>
        <li><a href="#caso">Caso práctico aplicado</a></li>
      </ol>
    </div>
  </section>

  <!-- ============ LECCIÓN 2.1 ============ -->
  <section class="bloque" id="l21">
    <div class="leccion">
      <span class="etiqueta">Lección 2.1</span>
      <h2>Anatomía estructural de la aeronave</h2>

      <p>La aeronave Matrice 4 utiliza una arquitectura cuadrirrotora plegable de configuración tipo "X" con dos pares de motores en disposición CW/CCW. El bastidor es de fibra de carbono reforzada con polímero, optimizado para una relación rigidez/peso elevada y mantenibilidad en campo.</p>

      <figure class="fig">
        <img src="https://enae.cl/cursos/matrice4/assets/img/aeronave_vista_general.jpg" alt="Vista general de la aeronave Matrice 4 Series">
        <figcaption>Aeronave Matrice 4 Series — vista general con brazos desplegados. El protector del estabilizador debe retirarse antes del encendido.</figcaption>
      </figure>

      <h3>Componentes externos clave (numeración DJI)</h3>

      <table class="tabla-curso">
        <thead><tr><th>#</th><th>Componente</th><th>Función operacional</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Estabilizador y cámara</td><td>Plataforma giroscópica de 3 ejes con sensores ópticos</td></tr>
          <tr><td>2</td><td>Sistema de visión omnidireccional</td><td>Seis cámaras fisheye de baja luminosidad para detección 360°</td></tr>
          <tr><td>3</td><td>Puerto de extensión (E-Port)</td><td>Conexión para accesorios DJI (altavoz, foco, soltador)</td></tr>
          <tr><td>4</td><td>Sistema de visión inferior</td><td>Cámaras estéreo para posicionamiento sin GNSS y aterrizaje preciso</td></tr>
          <tr><td>5</td><td>Sensor 3D infrarrojo</td><td>Asistencia al aterrizaje en superficies irregulares y baja luminosidad</td></tr>
          <tr><td>6</td><td>Luz auxiliar</td><td>Iluminación inferior para apoyo a sistemas de visión</td></tr>
          <tr><td>7</td><td>Ledes frontales</td><td>Indican orientación de la aeronave (rojo fijo)</td></tr>
          <tr><td>8</td><td>Motores</td><td>Cuatro motores brushless con sus respectivos ESC</td></tr>
          <tr><td>9</td><td>Hélices</td><td>Hélices plegables de paso fijo (estándar / bajo ruido)</td></tr>
          <tr><td>10</td><td>Indicadores de estado</td><td>Comunican el estado del sistema mediante código de color</td></tr>
          <tr><td>11</td><td>Trenes de aterrizaje</td><td>Patines plegables que integran las antenas GNSS</td></tr>
          <tr><td>12</td><td>Antena GNSS</td><td>Multibanda L1/L2 GPS+Galileo+BeiDou+QZSS</td></tr>
          <tr><td>13</td><td>Baliza</td><td>Indicador anticolisión de visualización lejana</td></tr>
          <tr><td>14</td><td>Batería de vuelo inteligente</td><td>TB100 — Li-ion 13S de 977 Wh</td></tr>
          <tr><td>15</td><td>Botón de encendido</td><td>Encendido / apagado / chequeo de batería</td></tr>
          <tr><td>16</td><td>Ledes de nivel de batería</td><td>Indican carga restante en gradilla de cuatro leds</td></tr>
          <tr><td>17</td><td>Bandas de sujeción de batería</td><td>Mecanismo de bloqueo seguro de la batería</td></tr>
          <tr><td>18</td><td>Puerto USB-C auxiliar (E-Port Lite)</td><td>Conexión para accesorios y diagnóstico</td></tr>
          <tr><td>19</td><td>Ranura microSD</td><td>Almacenamiento principal de medios</td></tr>
          <tr><td>20</td><td>Compartimento adaptador celular</td><td>Aloja el adaptador 4G para transmisión mejorada</td></tr>
          <tr><td>21</td><td>E-Port</td><td>Bus de comunicaciones para cargas útiles oficiales</td></tr>
        </tbody>
      </table>

      <figure class="fig">
        <img src="https://enae.cl/cursos/matrice4/assets/img/aeronave_inferior_sensores.jpg" alt="Vista inferior de la aeronave">
        <figcaption>Vista inferior — sistema de visión inferior, sensor 3D infrarrojo y luz auxiliar.</figcaption>
      </figure>

      <div class="callout">
        <strong>Conocer la nomenclatura</strong>
        El uso correcto de la nomenclatura DJI es esencial para comunicarse con soporte técnico y para redactar reportes de incidente. En todo reporte oficial debe usarse el término del manual ("estabilizador", no "gimbal"; "sistema de visión", no "cámaras de obstáculos"; "RPO", no "RTH"), aunque algunos sean coloquialmente conocidos por su versión inglesa.
      </div>
    </div>
  </section>

  <!-- ============ LECCIÓN 2.2 ============ -->
  <section class="bloque" id="l22">
    <div class="leccion">
      <span class="etiqueta">Lección 2.2</span>
      <h2>Hélices y propulsión</h2>

      <p>El sistema propulsivo está compuesto por <strong>cuatro motores brushless</strong> de bajo cogging acoplados a hélices plegables de paso fijo. Cada motor cuenta con su propio controlador electrónico de velocidad (ESC) integrado, con telemetría individual hacia el controlador de vuelo y supervisión continua de temperatura y consumo.</p>

      <h3>Tipos de hélices</h3>
      <p>La Serie Matrice 4 admite dos modelos de hélice:</p>
      <ul>
        <li><strong>Hélices estándar</strong>: máximo rendimiento aerodinámico, son las que vienen montadas por defecto en regiones fuera de la UE.</li>
        <li><strong>Hélices de bajo ruido</strong>: optimizadas para reducción de huella acústica. Son obligatorias por defecto para aeronaves comercializadas en la Unión Europea, conforme al cumplimiento del Reglamento Delegado (UE) 2019/945. Reducen el ruido percibido sin pérdida significativa de rendimiento.</li>
      </ul>

      <div class="callout aviso">
        <strong>Reglas críticas — hélices</strong>
        <ul style="margin-top:6px;">
          <li>NUNCA mezcle hélices estándar y de bajo ruido en una misma aeronave.</li>
          <li>Use solo hélices oficiales DJI. Las hélices genéricas pueden causar inestabilidad de vuelo y son causal de pérdida de garantía.</li>
          <li>Las hélices son consumibles. Inspeccione el borde de ataque y borde de fuga antes de cada vuelo.</li>
          <li>Una hélice astillada, rajada o deformada se reemplaza siempre, nunca se repara.</li>
          <li>Las hélices están afiladas. Use guantes durante el desmontaje y manténgase alejado durante el arranque.</li>
        </ul>
      </div>

      <h3>Procedimiento de montaje/desmontaje</h3>
      <ol>
        <li>Asegurar que la aeronave esté <strong>apagada</strong> y la batería removida.</li>
        <li>Identificar la marca CW/CCW grabada en el motor (anillo plateado vs. negro).</li>
        <li>Posicionar la hélice respetando el sentido del motor.</li>
        <li>Presionar firmemente hacia abajo y rotar en el sentido indicado por la flecha hasta escuchar un "clic".</li>
        <li>Verificar tirando suavemente que la hélice no se libere por sí misma.</li>
      </ol>

      <h3>Inspección pre-vuelo de propulsión</h3>
      <p>Antes de cada vuelo se debe verificar:</p>
      <ul>
        <li>Las cuatro hélices están del mismo modelo y en buen estado.</li>
        <li>Los motores giran libremente cuando se rotan a mano (sin batería).</li>
        <li>Al encender la aeronave, el sonido de los ESC es uniforme y sin chirridos.</li>
        <li>No hay objetos extraños en los conductos de ventilación de los motores.</li>
        <li>Los brazos están totalmente desplegados (escuchar el "clic" del bloqueo).</li>
      </ul>

      <div class="callout alerta">
        <strong>Detención de motores en vuelo</strong>
        El comando de combinación de palancas (CSC) permite detener los motores en caso de error crítico durante el vuelo. <strong>Esto causará el estrellamiento de la aeronave.</strong> Solo debe ejecutarse cuando exista riesgo a la vida humana en tierra y la aeronave esté fuera de control. La decisión la toma exclusivamente el piloto al mando con la mejor información disponible en el momento.
      </div>
    </div>
  </section>

  <!-- ============ LECCIÓN 2.3 ============ -->
  <section class="bloque" id="l23">
    <div class="leccion">
      <span class="etiqueta">Lección 2.3</span>
      <h2>Estabilizador y carga útil</h2>

      <p>El <strong>estabilizador</strong> (gimbal) de la Serie Matrice 4 es una plataforma giroscópica de tres ejes (pitch, roll, yaw) que aísla la cámara de los movimientos de la aeronave, garantizando captura visual estable incluso en condiciones de turbulencia moderada.</p>

      <h3>Especificaciones del estabilizador</h3>
      <div class="spec-grid">
        <div class="spec-card"><strong>Configuración</strong><span class="valor">3 ejes (pitch, roll, yaw)</span></div>
        <div class="spec-card"><strong>Rango pitch</strong><span class="valor">−120° a +45°</span></div>
        <div class="spec-card"><strong>Rango yaw</strong><span class="valor">−27° a +27°</span></div>
        <div class="spec-card"><strong>Velocidad angular</strong><span class="valor">Hasta 100°/s</span></div>
        <div class="spec-card"><strong>Estabilización vibracional</strong><span class="valor">±0.005°</span></div>
        <div class="spec-card"><strong>Control</strong><span class="valor">Dial dedicado RC + táctil DJI Pilot 2</span></div>
      </div>

      <h3>Operación del estabilizador</h3>
      <p>La inclinación de la cámara se controla por dos vías. La principal es el <strong>dial de estabilizador</strong> en el control remoto (rueda izquierda en RC Plus 2): rotación lenta produce ajustes finos, rotación rápida ajustes gruesos. La segunda vía es la pantalla táctil de DJI Pilot 2: al mantener pulsado un punto de la imagen aparece un círculo de control deslizante.</p>

      <h3>Buenas prácticas operacionales</h3>
      <ul>
        <li>Retirar siempre el <strong>protector de estabilizador</strong> antes del encendido. El sistema de auto-diagnóstico detectará un error si lo encuentra montado.</li>
        <li>Mantener los brazos completamente desplegados antes de encender. Un brazo plegado puede bloquear el estabilizador y dañar el motor permanentemente.</li>
        <li>No tocar ni golpear el estabilizador con la aeronave encendida.</li>
        <li>No agregar carga útil no oficial. El estabilizador está calibrado para el peso exacto del módulo óptico de fábrica.</li>
        <li>Tras volar en niebla densa o con humedad alta, dejar secar el estabilizador antes de almacenar.</li>
      </ul>

      <div class="callout alerta">
        <strong>Modo protección del estabilizador</strong>
        Si el estabilizador queda mecánicamente bloqueado (terreno irregular, hierba alta, pasto largo), el motor puede entrar en modo protección y aparecer una alerta. La solución es apagar la aeronave, posicionarla sobre superficie firme y plana, y reencender. Si el error persiste, la unidad requiere mantenimiento.
      </div>

      <h3>Almacenamiento de medios</h3>
      <p>Las fotografías y videos capturados por las cámaras se almacenan en una <strong>tarjeta microSD</strong> alojada en la aeronave. DJI recomienda tarjetas con clasificación V30 o superior y capacidad de hasta 512 GB. Para extraer los medios, se debe apagar la aeronave, retirar la tarjeta y leerla en un lector de tarjetas externo. <strong>No</strong> es posible transferir contenido directamente desde la aeronave apagada.</p>
    </div>
  </section>

  <!-- ============ LECCIÓN 2.4 ============ -->
  <section class="bloque" id="l24">
    <div class="leccion">
      <span class="etiqueta">Lección 2.4</span>
      <h2>Sistema de cámaras</h2>

      <p>El módulo óptico es la principal diferencia funcional entre el Matrice 4T y el Matrice 4E. Ambos modelos comparten una arquitectura tri-ocular con telémetro láser, pero el M4T añade una cuarta unidad térmica y una luz NIR, mientras que el M4E reemplaza la cámara gran angular por una unidad con sensor 4/3" de mayor calidad fotométrica y apertura ajustable.</p>

      <figure class="fig">
        <img src="https://enae.cl/cursos/matrice4/assets/img/sistema_camaras.jpg" alt="Sistema de cámaras Matrice 4">
        <figcaption>Detalle del módulo óptico. M4T (izquierda): cámara térmica + luz NIR + tres cámaras visibles + telémetro láser. M4E (derecha): cámara gran angular 4/3" + dos cámaras tele + telémetro láser.</figcaption>
      </figure>

      <h3>Cámaras visibles del Matrice 4T</h3>
      <table class="tabla-curso">
        <thead><tr><th>Cámara</th><th>Sensor</th><th>FOV</th><th>FOC equivalente</th><th>Apertura</th><th>Foco</th></tr></thead>
        <tbody>
          <tr><td>Gran angular</td><td>CMOS 1/1.3" 48 MP</td><td>82°</td><td>24 mm</td><td>f/1.7 fija</td><td>1 m a ∞</td></tr>
          <tr><td>Tele media</td><td>CMOS 1/1.3" 48 MP</td><td>35°</td><td>70 mm</td><td>f/2.8 fija</td><td>3 m a ∞</td></tr>
          <tr><td>Tele</td><td>CMOS 1/1.5" 48 MP</td><td>15°</td><td>168 mm</td><td>f/2.8 fija</td><td>3 m a ∞</td></tr>
        </tbody>
      </table>

      <h3>Cámara térmica (solo M4T)</h3>
      <p>La cámara térmica utiliza un sensor microbolométrico no refrigerado de óxido de vanadio (VOx) de <strong>640 × 512 px</strong>, con función de super-resolución UHR que interpola la imagen a 1 280 × 1 024. Los datos son <em>radiométricos</em>, lo que permite leer la temperatura puntual o promedio de cualquier zona del fotograma con buena precisión (±2 °C o ±2 % entre 0–100 °C).</p>

      <div class="spec-grid">
        <div class="spec-card"><strong>Sensor</strong><span class="valor">Microbolómetro VOx no refrigerado</span></div>
        <div class="spec-card"><strong>Resolución nativa</strong><span class="valor">640 × 512 px</span></div>
        <div class="spec-card"><strong>Resolución UHR</strong><span class="valor">1 280 × 1 024 px</span></div>
        <div class="spec-card"><strong>FOV diagonal</strong><span class="valor">45° ± 0.3°</span></div>
        <div class="spec-card"><strong>FOC equivalente</strong><span class="valor">53 mm</span></div>
        <div class="spec-card"><strong>Apertura</strong><span class="valor">f/1.0</span></div>
        <div class="spec-card"><strong>Distancia mínima</strong><span class="valor">5 m a ∞</span></div>
        <div class="spec-card"><strong>Banda espectral</strong><span class="valor">8–14 μm (LWIR)</span></div>
      </div>

      <h3>Luz auxiliar NIR (solo M4T)</h3>
      <p>La luz auxiliar de infrarrojo cercano (NIR) emite radiación invisible al ojo humano pero detectable por los sensores de las cámaras visibles, permitiendo grabación clandestina nocturna sin alertar al objetivo. Su alcance útil es de <strong>100 metros</strong>.</p>

      <h3>Telémetro láser (M4T y M4E)</h3>
      <p>El telémetro láser permite medir distancia exacta a un objetivo con precisión decimétrica, datos clave para georreferenciar incidentes o mediciones (función PinPoint).</p>

      <div class="spec-grid">
        <div class="spec-card"><strong>Alcance máximo (1 Hz)</strong><span class="valor">1 800 m a 20 % reflectividad</span></div>
        <div class="spec-card"><strong>Alcance oblicuo 1:5</strong><span class="valor">600 m</span></div>
        <div class="spec-card"><strong>Zona ciega</strong><span class="valor">1 m</span></div>
        <div class="spec-card"><strong>Error sistemático</strong><span class="valor">&lt; 0.3 m</span></div>
        <div class="spec-card"><strong>Error aleatorio</strong><span class="valor">&lt; 0.1 m @ 1σ</span></div>
        <div class="spec-card"><strong>Clase láser</strong><span class="valor">Clase 1 (segura para vista)</span></div>
      </div>

      <h3>Cámara gran angular del M4E</h3>
      <p>El Matrice 4E reemplaza la cámara gran angular CMOS 1/1.3" del M4T por una unidad con sensor <strong>CMOS 4/3" de 20 MP</strong> y apertura mecánica ajustable f/2.8 a f/11, similar al sensor del Mavic 3E. Esta arquitectura entrega:</p>
      <ul>
        <li>Mayor rango dinámico — fundamental para trabajo fotogramétrico con cielo despejado.</li>
        <li>Apertura ajustable para control de profundidad de campo y tiempo de exposición.</li>
        <li>Menor distorsión geométrica — minimiza el trabajo de calibración fotogramétrica.</li>
        <li>Mejor desempeño en baja luz para mapeos en condiciones de iluminación variable.</li>
      </ul>

      <div class="callout alerta">
        <strong>Protección térmica del sensor IR</strong>
        El sensor infrarrojo del M4T es muy sensible. NUNCA dirija la cámara térmica directamente al sol, fuentes láser, ni superficies extremadamente calientes (lava, hornos industriales). El sensor puede sufrir <strong>daño permanente</strong> antes de que se active la protección automática. Esta es una causal explícita de no cobertura por garantía.
      </div>
    </div>
  </section>

  <!-- ============ LECCIÓN 2.5 ============ -->
  <section class="bloque" id="l25">
    <div class="leccion">
      <span class="etiqueta">Lección 2.5</span>
      <h2>Sistema de detección omnidireccional</h2>

      <p>El sistema de detección de obstáculos de la Serie Matrice 4 combina dos tecnologías complementarias: <strong>visión binocular</strong> en seis direcciones y <strong>sensado infrarrojo 3D</strong> inferior. La integración de ambos sistemas, gestionada por algoritmos de fusión sensorial, entrega percepción ambiental robusta tanto de día como de noche.</p>

      <h3>Visión binocular omnidireccional</h3>
      <p>Seis pares de cámaras estéreo de baja luminosidad cubren los ejes de movimiento de la aeronave: frente, atrás, izquierda, derecha, arriba y abajo. Las cámaras tienen un FOV de 160° por par y trabajan en pareja para construir mapas de profundidad mediante triangulación. La cobertura efectiva permite detección a 360°.</p>

      <table class="tabla-curso">
        <thead><tr><th>Dirección</th><th>Rango medición</th><th>Rango total</th><th>Velocidad operativa</th></tr></thead>
        <tbody>
          <tr><td>Frontal binocular</td><td>0.4 – 22.5 m</td><td>0.4 – 200 m</td><td>≤ 21 m/s</td></tr>
          <tr><td>Trasera</td><td>0.4 – 22.5 m</td><td>0.4 – 200 m</td><td>≤ 21 m/s</td></tr>
          <tr><td>Lateral (izq./der.)</td><td>0.5 – 32 m</td><td>0.5 – 200 m</td><td>≤ 21 m/s</td></tr>
          <tr><td>Superior</td><td>0.5 – 25 m</td><td>0.5 – 100 m</td><td>≤ 15 m/s</td></tr>
          <tr><td>Inferior</td><td>0.5 – 30 m</td><td>0.5 – 50 m</td><td>≤ 15 m/s</td></tr>
        </tbody>
      </table>

      <h3>Detección de obstáculos finos</h3>
      <p>Una capacidad distintiva del sistema es la detección de <strong>cables eléctricos de hasta 12 mm de diámetro</strong> a velocidades de hasta 15 m/s, gracias a la combinación de las cámaras de alta resolución y los algoritmos de detección entrenados específicamente para infraestructura de transmisión y distribución eléctrica.</p>

      <h3>Sensor 3D infrarrojo inferior</h3>
      <p>Adicional a las cámaras estéreo, la aeronave incorpora un sensor infrarrojo 3D apuntando hacia abajo. Este sensor proyecta un patrón estructurado de luz infrarroja y mide su deformación al rebotar en el suelo, generando un mapa de altura preciso. Es esencial para <strong>aterrizaje en superficie irregular, en oscuridad total y en condiciones de iluminación deficiente.</strong></p>

      <h3>Limitaciones del sistema</h3>
      <p>Aunque el sistema es muy robusto, tiene limitaciones físicas que el operador debe conocer y respetar:</p>
      <div class="callout aviso">
        <strong>Condiciones que degradan o desactivan la detección</strong>
        <ul style="margin-top:6px;">
          <li>Iluminación excesiva (sol directo en lente) — saturación.</li>
          <li>Iluminación insuficiente (oscuridad total sin luz auxiliar) — falta de textura.</li>
          <li>Superficies sin textura visual — pared blanca lisa, agua espejada.</li>
          <li>Superficies con reflectividad muy baja — material altamente absorbente.</li>
          <li>Lentes de las cámaras sucias, mojadas o con condensación.</li>
          <li>Modo Sport activo — la detección se DESACTIVA automáticamente.</li>
          <li>Velocidad superior a la velocidad operativa indicada en la tabla.</li>
          <li>Vegetación densa o ramaje fino — penetración deficiente del sistema visual.</li>
        </ul>
      </div>

      <h3>Comportamiento ante detección de obstáculo</h3>
      <p>Cuando el sistema detecta un obstáculo dentro del rango de frenado, opera según el modo de vuelo activo:</p>
      <ul>
        <li><strong>Modo N (Normal):</strong> la aeronave frena y entra en vuelo estacionario, alertando al piloto.</li>
        <li><strong>APAS activado:</strong> la aeronave intenta replanificar la ruta para sortear el obstáculo manteniendo la dirección general.</li>
        <li><strong>Modo S (Sport):</strong> sin acción automática. El piloto es el único responsable de evadir.</li>
      </ul>
    </div>
  </section>

  <!-- ============ CASO PRÁCTICO ============ -->
  <section id="caso">
    <div class="caso-practico">
      <div class="header-caso">
        <div class="icono">CP</div>
        <h2 style="margin:0;border:none;">Caso práctico — Inspección termográfica de un parque eólico</h2>
      </div>

      <div class="escenario">
        <strong>Escenario operacional</strong>
        <p>Un operador de un parque eólico de 24 aerogeneradores Vestas V117 (altura del buje 91 m, diámetro de rotor 117 m) en la Región del Biobío contrata su servicio para una inspección termográfica de palas y góndolas tras detectar pérdida de eficiencia. La operación se programa para ejecutarse durante las horas crepusculares (delta térmico óptimo), con tres turbinas a auditar en una jornada. Las palas no pueden ser detenidas todas simultáneamente: deben revisarse de a una con su rotor frenado, mientras las otras 23 siguen operativas a 14 RPM. La infraestructura cuenta con líneas de evacuación de 33 kV cruzando perpendicularmente la traza de inspección.</p>
      </div>

      <strong>Preguntas guía</strong>
      <ul class="preguntas-caso">
        <li>¿Qué cámara del M4T se utiliza para la inspección de palas y por qué? ¿Qué cámara para la góndola?</li>
        <li>¿Cómo afecta el sistema de detección de obstáculos cuando hay rotores en operación cercanos a la zona de vuelo?</li>
        <li>¿Qué medidas de seguridad operacional adopta respecto a las líneas de 33 kV cruzando la traza?</li>
        <li>¿Qué función del telémetro láser explotaría para georreferenciar puntos calientes detectados?</li>
        <li>¿Por qué es relevante la apertura f/1.7 de la cámara gran angular en este escenario?</li>
      </ul>

      <details class="respuestas-modelo">
        <summary>Respuesta modelo</summary>
        <div style="padding:14px 6px;">
          <p><strong>Cámaras a utilizar:</strong> para la inspección de palas, la <em>cámara térmica</em> es la herramienta primaria — los defectos estructurales (delaminaciones, ingreso de humedad, daño por rayo) generan firmas térmicas distintivas. Como apoyo se usa la <em>cámara tele 168 mm</em> para registro RGB de alta resolución de cada zona inspeccionada. Para la góndola, la inspección térmica del generador, multiplicadora y cojinetes principales se hace también con cámara térmica, complementada con la <em>cámara tele media 70 mm</em> para registro RGB.</p>
          <p><strong>Detección de obstáculos con rotores activos:</strong> el sistema visual del Matrice 4 detecta obstáculos estáticos o de movimiento lento. Las palas en rotación a 14 RPM tienen velocidad punta superior a 80 m/s, lo que excede la capacidad de detección efectiva. La regla operacional es <strong>nunca volar a barlovento de un aerogenerador en operación</strong>; se mantiene una zona de seguridad mínima de 2 diámetros de rotor (≈ 240 m) cuando la turbina está girando. Para inspección, se solicita parada y bloqueo (LOTO) del rotor inspeccionado, manteniendo distancia de 25–30 m a la pala.</p>
          <p><strong>Líneas de 33 kV:</strong> el M4 detecta cables hasta 12 mm a 15 m/s, pero la operación se planifica para no aproximarse a menos de 30 m horizontales y 15 m verticales de las líneas. Se identifica visualmente la traza antes de iniciar y se incluye en la cartografía de la misión waypoint. Se mantiene siempre el modo Normal (NO Sport).</p>
          <p><strong>Telémetro láser y PinPoint:</strong> al identificar un punto caliente en pala se activa el telémetro láser para medir distancia exacta (precisión decimétrica). DJI Pilot 2 calcula entonces las coordenadas geodésicas del defecto y deja un PinPoint georreferenciado disponible para incorporar al informe.</p>
          <p><strong>Apertura f/1.7:</strong> en condiciones crepusculares, la mayor entrada de luz permite mantener tiempos de obturación cortos (≤ 1/200 s) y baja sensibilidad ISO, evitando arrastre de movimiento y ruido. El sistema mantiene calidad fotográfica útil incluso al límite del horario civil crepuscular.</p>
        </div>
      </details>
    </div>
  </section>

  

</main>



</body>
</html>
');

  -- Module 3
  INSERT INTO course_modules (course_id, sort_order, title, description)
  VALUES (v_course_id, 3, 'Módulo 3: Sistema de energía y posicionamiento RTK', 'Batería de vuelo inteligente TB100, hub de carga, módulo RTK integrado, redes RTK personalizadas y mecanismos de protección.')
  RETURNING id INTO v_module_id;
  INSERT INTO module_activities (module_id, sort_order, type, title, description)
  VALUES (v_module_id, 0, 'html', 'Contenido del módulo 3', '<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Módulo 3 — Energía y RTK · Matrice 4 Series · ENAE</title>
<link rel="stylesheet" href="https://enae.cl/cursos/matrice4/assets/curso.css">
</head>
<body>

<header class="header-curso">
  <div class="marca">ENAE — Curso Matrice 4 Series</div>
  <h1>Módulo 3 · Sistema de energía y posicionamiento RTK</h1>
  <div class="subtitulo">Batería TB100 · Hub de carga · Módulo RTK · 4 lecciones · 3 horas</div>
</header>



<main class="contenedor">

  <section class="bloque">
    <h2>Presentación del módulo</h2>
    <p>El sistema de energía es el principal limitador operacional de cualquier RPA: la energía a bordo determina el tiempo útil de vuelo, los márgenes de seguridad y la posibilidad de completar misiones complejas. Este módulo aborda en profundidad la <strong>batería de vuelo inteligente TB100</strong>, el <strong>hub de carga</strong>, los mecanismos de protección eléctrica y, por otra parte, el <strong>módulo RTK integrado</strong> que dota a la aeronave de posicionamiento centimétrico, requisito indispensable para operaciones fotogramétricas de precisión y para vuelo confiable en entornos urbanos.</p>

    <div class="objetivos">
      <h3>Objetivos de aprendizaje</h3>
      <ul>
        <li>Operar correctamente la batería TB100, incluyendo carga, almacenamiento y transporte seguro.</li>
        <li>Interpretar los códigos LED del hub de carga y de la batería en condiciones normales y de fallo.</li>
        <li>Comprender los mecanismos de protección eléctrica y química y su comportamiento esperado.</li>
        <li>Configurar el módulo RTK con redes públicas, redes personalizadas y estaciones D-RTK.</li>
        <li>Diagnosticar problemas comunes de degradación de capacidad y de posicionamiento RTK.</li>
      </ul>
    </div>

    <div class="indice-leccion">
      <h4>Índice del módulo</h4>
      <ol>
        <li><a href="#l31">Lección 3.1 · Batería de vuelo inteligente TB100</a></li>
        <li><a href="#l32">Lección 3.2 · Hub de carga y operación</a></li>
        <li><a href="#l33">Lección 3.3 · Módulo RTK y servicios de corrección</a></li>
        <li><a href="#l34">Lección 3.4 · Mecanismos de protección eléctrica</a></li>
        <li><a href="#caso">Caso práctico aplicado</a></li>
      </ol>
    </div>
  </section>

  <!-- ============ LECCIÓN 3.1 ============ -->
  <section class="bloque" id="l31">
    <div class="leccion">
      <span class="etiqueta">Lección 3.1</span>
      <h2>Batería de vuelo inteligente TB100</h2>

      <p>La <strong>TB100</strong> es la batería oficial de la Serie Matrice 4 (compartida con el Matrice 400). Es una unidad <em>"intelligent"</em>, es decir, integra una placa de gestión (BMS) que monitorea continuamente voltaje por celda, temperatura, ciclos y estado de salud, comunicando estos datos al controlador de vuelo a través del bus interno.</p>

      <h3>Especificaciones técnicas</h3>
      <div class="spec-grid">
        <div class="spec-card"><strong>Química</strong><span class="valor">Litio-ion</span></div>
        <div class="spec-card"><strong>Configuración</strong><span class="valor">13S — 13 celdas en serie</span></div>
        <div class="spec-card"><strong>Capacidad nominal</strong><span class="valor">20 254 mAh</span></div>
        <div class="spec-card"><strong>Energía total</strong><span class="valor">977 Wh</span></div>
        <div class="spec-card"><strong>Voltaje nominal</strong><span class="valor">48.1 V</span></div>
        <div class="spec-card"><strong>Tiempo de vuelo</strong><span class="valor">Hasta 49 min (M4) / 59 min (M400)</span></div>
        <div class="spec-card"><strong>Hot-swap</strong><span class="valor">Soportado</span></div>
        <div class="spec-card"><strong>Auto-calefacción</strong><span class="valor">Integrada</span></div>
        <div class="spec-card"><strong>Rango operación</strong><span class="valor">−20 °C a 50 °C</span></div>
        <div class="spec-card"><strong>Rango carga</strong><span class="valor">5 °C a 40 °C (ideal 22–28 °C)</span></div>
        <div class="spec-card"><strong>Ciclos de vida</strong><span class="valor">≥ 400 ciclos al 80 % de capacidad</span></div>
        <div class="spec-card"><strong>Peso</strong><span class="valor">2 060 g</span></div>
      </div>

      <h3>Procedimiento de instalación/extracción</h3>
      <ol>
        <li>Verificar que la aeronave esté <strong>apagada</strong>.</li>
        <li>Alinear la batería con el compartimento, verificando que las bandas de sujeción estén replegadas.</li>
        <li>Empujar firmemente hasta escuchar el "clic" de bloqueo. Si no se escucha, la batería NO está correctamente instalada.</li>
        <li>Para extraer: presionar simultáneamente las dos bandas laterales y tirar hacia afuera.</li>
      </ol>

      <div class="callout alerta">
        <strong>Reglas críticas — manipulación de baterías</strong>
        <ul style="margin-top:6px;">
          <li>NUNCA inserte ni retire la batería con la aeronave encendida.</li>
          <li>NUNCA cargue una batería que esté caliente al tacto post-vuelo. Espere 15–20 minutos.</li>
          <li>NUNCA opere por debajo de −10 °C ambiente o por encima de 40 °C.</li>
          <li>Cargue al 100% al menos una vez cada 3 meses para evitar degradación química.</li>
          <li>Si la batería no se ha cargado o descargado por más de 3 meses, pierde garantía.</li>
          <li>Para transporte aéreo (regla IATA), descargue al ≤ 30%.</li>
        </ul>
      </div>

      <h3>Niveles de batería y patrones LED</h3>
      <p>La aeronave dispone de cuatro LEDs en la batería. Una pulsación al botón de encendido muestra el nivel actual:</p>

      <table class="tabla-curso">
        <thead><tr><th>Patrón LED</th><th>Nivel batería</th></tr></thead>
        <tbody>
          <tr><td>● ● ● ●</td><td>92–100 %</td></tr>
          <tr><td>● ● ● ◐</td><td>76–91 %</td></tr>
          <tr><td>● ● ● ○</td><td>63–75 %</td></tr>
          <tr><td>● ● ◐ ○</td><td>51–62 %</td></tr>
          <tr><td>● ● ○ ○</td><td>38–50 %</td></tr>
          <tr><td>● ◐ ○ ○</td><td>26–37 %</td></tr>
          <tr><td>● ○ ○ ○</td><td>13–25 %</td></tr>
          <tr><td>◐ ○ ○ ○</td><td>0–12 %</td></tr>
        </tbody>
      </table>

      <h3>Aviso por baja temperatura</h3>
      <p>A temperaturas inferiores a 0 °C, la batería opera con capacidad reducida y la resistencia interna aumenta. Recomendaciones operacionales:</p>
      <ul>
        <li>Precaliente la batería a temperatura ambiente antes de despegar (use bolsas térmicas o auto-calentado vía DJI Pilot 2).</li>
        <li>Realice un <em>"hover"</em> de 60 segundos a baja altitud tras el despegue para que la batería alcance temperatura operativa.</li>
        <li>Reduzca el tiempo total de vuelo planificado en al menos 30 % bajo 0 °C.</li>
        <li>Manténgase atento a la advertencia de batería muy baja: bajo 5 °C la caída final es abrupta.</li>
        <li>Para vuelos a alta altitud (sobre 3 000 m), aplique los descuentos de baja temperatura más reducción adicional por densidad atmosférica.</li>
      </ul>
    </div>
  </section>

  <!-- ============ LECCIÓN 3.2 ============ -->
  <section class="bloque" id="l32">
    <div class="leccion">
      <span class="etiqueta">Lección 3.2</span>
      <h2>Hub de carga y operación</h2>

      <p>El <strong>hub de carga (Charging Hub) Matrice 4 Series</strong> es el accesorio oficial para cargar hasta cuatro baterías TB100 en secuencia. Trabaja con un adaptador de corriente USB-C DJI de 100 W incluido. El hub aplica priorización inteligente y soporta dos modos de carga.</p>

      <h3>Modos de carga</h3>

      <table class="tabla-curso">
        <thead><tr><th>Modo</th><th>Comportamiento</th><th>Caso de uso</th></tr></thead>
        <tbody>
          <tr>
            <td><strong>Estándar</strong></td>
            <td>Cada batería se carga al 100 % en secuencia desde la de menor a mayor nivel.</td>
            <td>Uso normal, almacenamiento entre operaciones, jornadas planificadas.</td>
          </tr>
          <tr>
            <td><strong>Listo para volar</strong></td>
            <td>Cada batería se carga al 90 % y se mantiene ahí. La de mayor nivel carga primero.</td>
            <td>Operaciones de turnos cortos donde se quiere disponibilidad rápida sin esperar el plateau final.</td>
          </tr>
        </tbody>
      </table>

      <h3>Códigos LED del hub</h3>
      <table class="tabla-curso">
        <thead><tr><th>Patrón</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td>Amarillo fijo</td><td>No hay batería insertada</td></tr>
          <tr><td>Verde parpadeante</td><td>Cargando batería</td></tr>
          <tr><td>Verde fijo</td><td>Carga completada</td></tr>
          <tr><td>Amarillo parpadeante</td><td>Anomalía recuperable — se reanudará automáticamente</td></tr>
          <tr><td>Rojo fijo</td><td>Anomalía no recuperable — retire la batería y reinserte; si persiste, desenchufe el adaptador</td></tr>
        </tbody>
      </table>

      <h3>Buenas prácticas con el hub</h3>
      <ul>
        <li>Use solo el adaptador USB-C DJI de 100 W oficial. Adaptadores genéricos pueden no entregar la potencia requerida y prolongar tiempos de carga.</li>
        <li>Use el hub solo con baterías TB100. No es compatible con otros modelos.</li>
        <li>Coloque el hub sobre superficie estable, no inflamable, en zona ventilada.</li>
        <li>Mantenga los terminales metálicos limpios y secos; límpielos con paño suave si presentan suciedad.</li>
        <li>No cargue baterías recién retiradas de la aeronave: deje enfriar 15–20 minutos.</li>
      </ul>

      <h3>Estimación de tiempos típicos</h3>
      <p>A 220 V y temperatura ambiente 25 °C, con adaptador 100 W, una batería TB100 tarda aproximadamente <strong>70 minutos</strong> en cargarse del 0 % al 100 % en modo Estándar. En modo Listo para Volar, alcanza el 90 % en aproximadamente 60 minutos. Con cuatro baterías en secuencia, una carga completa al 100 % toma cerca de 4 horas y 40 minutos.</p>

      <div class="callout aviso">
        <strong>Estación BS100</strong>
        Para operadores intensivos con flotas Matrice 400, DJI ofrece la <em>Intelligent Battery Station BS100</em>, capaz de cargar tres TB100 y dos baterías de control remoto WB37 simultáneamente con potencia mucho mayor (45 minutos al 100 % a 220 V) y modo silencioso de 36 dB. La BS100 es opcional para Matrice 4 pero altamente recomendada para operaciones profesionales con más de cuatro baterías en flota.
      </div>
    </div>
  </section>

  <!-- ============ LECCIÓN 3.3 ============ -->
  <section class="bloque" id="l33">
    <div class="leccion">
      <span class="etiqueta">Lección 3.3</span>
      <h2>Módulo RTK y servicios de corrección</h2>

      <p>El módulo <strong>RTK (Real-Time Kinematic)</strong> integrado de la aeronave aporta posicionamiento de precisión centimétrica. Es resistente a interferencias magnéticas de estructuras metálicas y líneas de alta tensión, capacidad crítica para operaciones de inspección en infraestructura energética donde el GNSS sin corrección puede degradarse significativamente.</p>

      <h3>Especificaciones de posicionamiento</h3>
      <div class="spec-grid">
        <div class="spec-card"><strong>Constelaciones</strong><span class="valor">GPS L1/L2 + Galileo + BeiDou + QZSS</span></div>
        <div class="spec-card"><strong>Hover sin RTK (visión)</strong><span class="valor">±0.1 m vertical, ±0.1 m horizontal</span></div>
        <div class="spec-card"><strong>Hover sin RTK (GNSS)</strong><span class="valor">±0.5 m vertical, ±0.5 m horizontal</span></div>
        <div class="spec-card"><strong>Hover con RTK fix</strong><span class="valor">±0.1 m</span></div>
        <div class="spec-card"><strong>Precisión RTK fix</strong><span class="valor">1 cm + 1 ppm horizontal</span></div>
        <div class="spec-card"><strong>Precisión vertical RTK</strong><span class="valor">1.5 cm + 1 ppm</span></div>
      </div>

      <h3>Tipos de servicio RTK soportados</h3>
      <p>El operador puede seleccionar entre cuatro tipos de servicio según el contexto de operación, en DJI Pilot 2 → Vista de cámara → ⚙ → RTK:</p>

      <table class="tabla-curso">
        <thead><tr><th>Tipo</th><th>Descripción</th><th>Caso de uso</th></tr></thead>
        <tbody>
          <tr>
            <td><strong>D-RTK 3</strong></td>
            <td>Estación base D-RTK 3 propia desplegada en sitio.</td>
            <td>Operaciones donde no hay cobertura celular o se requiere autonomía total.</td>
          </tr>
          <tr>
            <td><strong>Mobile Station Network RTK</strong></td>
            <td>Servicio público de red RTK accesible vía control remoto con conexión a internet.</td>
            <td>Mapeo en zonas urbanas con cobertura de red NTRIP local.</td>
          </tr>
          <tr>
            <td><strong>Custom Network RTK</strong></td>
            <td>Servidor NTRIP propio del operador o cliente con credenciales personalizadas.</td>
            <td>Empresas con infraestructura geodésica propia (mineras, autopistas).</td>
          </tr>
          <tr>
            <td><strong>D-RTK Relay</strong></td>
            <td>Configuración avanzada con estación base y repetidor.</td>
            <td>Operaciones de gran cobertura geográfica con visibilidad bloqueada.</td>
          </tr>
        </tbody>
      </table>

      <h3>Activación y configuración</h3>
      <p>Antes de cada operación que requiera precisión RTK debe verificarse:</p>
      <ol>
        <li>RTK habilitado en menú DJI Pilot 2 → Vista de cámara → ⚙ → RTK.</li>
        <li>Servicio correctamente seleccionado y configurado.</li>
        <li>El estado de posicionamiento de la aeronave en la tabla de estado muestra <strong>"FIX"</strong>. Si muestra "FLOAT" o "SINGLE", la posición no es centimétrica.</li>
        <li>Para Network RTK: control remoto con tarjeta nano-SIM en el adaptador celular DJI o conexión WiFi a internet.</li>
        <li>El modo de mantenimiento de precisión de posicionamiento se puede activar tras obtener fix RTK.</li>
      </ol>

      <h3>Configuración de Custom Network RTK</h3>
      <p>Para usar un servidor NTRIP propio:</p>
      <ol>
        <li>Conecte el control remoto a internet (4G o WiFi).</li>
        <li>Vincule el RC con la aeronave.</li>
        <li>Acceda a DJI Pilot 2 → Vista de cámara → ⚙ → RTK → seleccione "Red RTK personalizada".</li>
        <li>Complete: dirección IP del servidor NTRIP, puerto, mountpoint, usuario y contraseña.</li>
        <li>Pulse "Guardar" y espere a que el estado cambie a "FIX".</li>
      </ol>

      <div class="callout">
        <strong>Posicionamiento RTK durante el vuelo</strong>
        El posicionamiento RTK puede activarse y desactivarse durante el vuelo. Tras activarse, queda disponible el modo de precisión de mantenimiento de posicionamiento ("Position Hold Precision Mode"), recomendado para misiones de mapeo y inspección estática.
      </div>

      <h3>Limitaciones físicas del RTK</h3>
      <ul>
        <li>El RTK requiere correcciones diferenciales con latencia &lt; 2 segundos. Pérdidas de enlace 4G prolongadas hacen caer el fix.</li>
        <li>Bajo dosel arbóreo denso o cerca de estructuras metálicas masivas (subestaciones), pueden producirse pérdidas momentáneas de fix.</li>
        <li>La distancia entre la aeronave y la estación base afecta la precisión: el error sistemático es de 1 ppm, es decir 1 cm cada 10 km adicionales.</li>
        <li>En regiones polares (latitudes extremas) la geometría satelital degrada la precisión.</li>
      </ul>
    </div>
  </section>

  <!-- ============ LECCIÓN 3.4 ============ -->
  <section class="bloque" id="l34">
    <div class="leccion">
      <span class="etiqueta">Lección 3.4</span>
      <h2>Mecanismos de protección eléctrica</h2>

      <p>La placa de gestión (BMS) de la TB100 incorpora mecanismos de protección que actúan automáticamente ante condiciones anómalas. Estos mecanismos previenen daños a la batería y minimizan riesgos de evento térmico (fuga térmica). Conocer su comportamiento permite al operador interpretar correctamente las alertas y actuar con criterio.</p>

      <h3>Protecciones durante la carga</h3>
      <table class="tabla-curso">
        <thead><tr><th>Patrón LED</th><th>Condición detectada</th></tr></thead>
        <tbody>
          <tr><td>LED 2 parpadea 2 veces/seg</td><td>Sobrecorriente</td></tr>
          <tr><td>LED 2 parpadea 3 veces/seg</td><td>Cortocircuito</td></tr>
          <tr><td>LED 3 parpadea 2 veces/seg</td><td>Sobrecarga</td></tr>
          <tr><td>LED 3 parpadea 3 veces/seg</td><td>Cargador con sobretensión</td></tr>
          <tr><td>LED 4 parpadea 2 veces/seg</td><td>Temperatura de carga muy baja</td></tr>
          <tr><td>LED 4 parpadea 3 veces/seg</td><td>Temperatura de carga muy alta</td></tr>
        </tbody>
      </table>

      <p>Para reanudar la carga: desconecte el cargador y vuelva a conectarlo. Si la causa es temperatura, espere a que vuelva al rango y la carga se reanudará automáticamente.</p>

      <h3>Protecciones en operación</h3>
      <ul>
        <li><strong>Protección térmica:</strong> si la batería supera los 70 °C internos en vuelo, el sistema reduce potencia y muestra alerta. Si llega a 80 °C, ejecuta RPO automático.</li>
        <li><strong>Protección por bajo voltaje:</strong> al alcanzar voltaje crítico, ejecuta RPO automático con cuenta atrás. Si el operador rechaza, la aeronave aterrizará localmente sin posibilidad de cancelar.</li>
        <li><strong>Protección por sobredescarga (en tierra):</strong> la batería deja de descargarse al llegar a un mínimo cuando está inactiva. Para reactivarla, basta con conectarla a la carga.</li>
        <li><strong>Modo Hibernación:</strong> bajo 10 % de carga sin uso por tiempo prolongado, la batería entra en hibernación profunda. Una recarga la reactiva, pero si entra en hibernación tras varios meses, puede haber sufrido daños permanentes.</li>
      </ul>

      <h3>Almacenamiento y transporte</h3>
      <table class="tabla-curso">
        <thead><tr><th>Condición</th><th>Recomendación</th></tr></thead>
        <tbody>
          <tr><td>Almacenamiento &lt; 10 días</td><td>50–60 % de carga, ambiente fresco y seco</td></tr>
          <tr><td>Almacenamiento &gt; 10 días</td><td>40–50 % de carga, ambiente 22–28 °C</td></tr>
          <tr><td>Almacenamiento &gt; 3 meses</td><td>Cargar y descargar al menos una vez para mantener garantía</td></tr>
          <tr><td>Transporte terrestre</td><td>Bolsa antiincendio LiPo guard, en compartimento ventilado</td></tr>
          <tr><td>Transporte aéreo (IATA)</td><td>≤ 30 % de carga, mínimo 2 baterías por bolsa, etiquetado UN3480/UN3481</td></tr>
        </tbody>
      </table>

      <div class="callout alerta">
        <strong>Recordatorio normativo</strong>
        Las baterías TB100 contienen 977 Wh, lo que las clasifica como mercancía peligrosa de categoría especial. Su transporte aéreo requiere autorización específica del operador del vuelo (cargo expreso). Su transporte por carretera nacional debe cumplir con las normas de transporte de mercancías peligrosas (D.S. 298/95 MTT en Chile y normas equivalentes en otros países).
      </div>
    </div>
  </section>

  <!-- ============ CASO PRÁCTICO ============ -->
  <section id="caso">
    <div class="caso-practico">
      <div class="header-caso">
        <div class="icono">CP</div>
        <h2 style="margin:0;border:none;">Caso práctico — Misión de mapeo de gran extensión con limitaciones de batería</h2>
      </div>

      <div class="escenario">
        <strong>Escenario operacional</strong>
        <p>Una empresa minera del norte de Chile encarga el levantamiento fotogramétrico mensual de un rajo abierto de 4.2 km × 3.1 km a 3 800 m de altitud (densidad atmosférica reducida). La temperatura ambiente al inicio de la operación, a las 09:00, es de 6 °C. El cliente exige precisión topográfica horizontal de ±5 cm y vertical de ±10 cm para cubicación. La conectividad celular es marginal (1 barra esporádica). La operación tiene ventana de 4 horas antes de que el viento supere 12 m/s. El operador dispone de un Matrice 4E con un set de 6 baterías TB100, hub de carga y un grupo electrógeno de 5 kVA en sitio.</p>
      </div>

      <strong>Preguntas guía</strong>
      <ul class="preguntas-caso">
        <li>¿Qué tipo de servicio RTK recomienda usar y por qué? Justifique técnicamente.</li>
        <li>¿Cómo afecta la altitud (3 800 m) y la temperatura (6 °C) al tiempo nominal de vuelo de la TB100?</li>
        <li>Calcule cuántos vuelos serán necesarios y proponga un esquema de gestión de batería con el hub.</li>
        <li>¿Qué configuración de hub usaría y por qué? ¿Cómo gestionaría el rotación de baterías frías?</li>
        <li>¿Cuál es el riesgo principal si pierde el FIX RTK durante un waypoint y cómo lo mitiga?</li>
      </ul>

      <details class="respuestas-modelo">
        <summary>Respuesta modelo</summary>
        <div style="padding:14px 6px;">
          <p><strong>Servicio RTK:</strong> dada la conectividad marginal, se descarta Mobile Station Network RTK. La opción correcta es <strong>D-RTK 3 desplegada en sitio</strong>: una estación base sobre punto geodésico conocido del cliente o sobre punto identificado con observación estática previa. El alcance radio del D-RTK es suficiente para cubrir 4.2 × 3.1 km y elimina dependencia de red celular. Como respaldo, se prepara configuración Custom NTRIP con caché para los momentos en que aparezca cobertura celular.</p>
          <p><strong>Impacto altitud y temperatura:</strong> a 3 800 m la densidad atmosférica es ≈ 65 % del nivel del mar, lo que obliga a la aeronave a girar los rotores a mayor RPM para sostentar — el consumo eléctrico aumenta cerca de 25–30 %. La temperatura de 6 °C reduce la capacidad útil de la TB100 en ≈ 10 %. El tiempo efectivo de vuelo cae de los 49 min nominales a aproximadamente 28–32 min reales. Se planifica conservadoramente con 25 minutos de vuelo útil por batería para mantener reserva del 20 %.</p>
          <p><strong>Esquema de vuelos:</strong> el área de 13 km² requiere, con altitud de vuelo 120 m AGL, sobreposición 80/70 % y velocidad 8 m/s, aproximadamente 14 km lineales por hectárea. Se estiman entre 7 y 9 vuelos. Con 6 baterías, el ciclo es: 1 batería en aeronave, 1 esperando junto al RC, 4 en hub. Se opera en relevos.</p>
          <p><strong>Hub:</strong> modo "Listo para Volar" (90 %) durante la operación para minimizar tiempo entre relevos. Solo al finalizar la jornada se activa modo Estándar para llevar todas al 100 %. Se mantiene una caja térmica con bolsas calefaccionadas para precalentar baterías frías a 22 °C antes de cargarlas en el aeronave.</p>
          <p><strong>Riesgo de pérdida de FIX:</strong> si se pierde el FIX en pleno waypoint, la aeronave continúa el vuelo pero las imágenes capturadas pierden la georeferenciación centimétrica para esos disparos, comprometiendo precisión global del producto. Mitigación: configurar pausa automática del waypoint si el estado RTK degrada de FIX a FLOAT/SINGLE por más de 5 segundos; programar puntos de control terrestres (GCP) cada 800 m para reanclar el modelo en post-proceso; mantener vuelo dentro de los 10 km de la estación base para conservar precisión 1 cm + 1 ppm.</p>
        </div>
      </details>
    </div>
  </section>

  

</main>



</body>
</html>
');

  -- Module 4
  INSERT INTO course_modules (course_id, sort_order, title, description)
  VALUES (v_course_id, 4, 'Módulo 4: Control remoto RC Plus 2 y aplicación DJI Pilot 2', 'Hardware y vinculación del RC Plus 2, combinaciones de botones, interfaz DJI Pilot 2, transmisión mejorada 4G.')
  RETURNING id INTO v_module_id;
  INSERT INTO module_activities (module_id, sort_order, type, title, description)
  VALUES (v_module_id, 0, 'html', 'Contenido del módulo 4', '<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Módulo 4 — Control y software · Matrice 4 Series · ENAE</title>
<link rel="stylesheet" href="https://enae.cl/cursos/matrice4/assets/curso.css">
</head>
<body>

<header class="header-curso">
  <div class="marca">ENAE — Curso Matrice 4 Series</div>
  <h1>Módulo 4 · Control remoto RC Plus 2 y aplicación DJI Pilot 2</h1>
  <div class="subtitulo">Hardware del RC · Combinaciones · DJI Pilot 2 · Transmisión 4G · 4 lecciones · 3 horas</div>
</header>



<main class="contenedor">

  <section class="bloque">
    <h2>Presentación del módulo</h2>
    <p>El control remoto y la aplicación DJI Pilot 2 conforman la <strong>interfaz hombre-máquina</strong> del sistema. La eficiencia operacional, la seguridad y la calidad de los productos finales (fotografía, video, mapas, datos térmicos) dependen del manejo experto de estos dos elementos. Este módulo cubre el RC Plus 2 desde la perspectiva del hardware y la ergonomía operacional, y DJI Pilot 2 desde la lógica de configuración y la planificación de misiones.</p>

    <div class="objetivos">
      <h3>Objetivos de aprendizaje</h3>
      <ul>
        <li>Identificar todos los controles físicos del RC Plus 2 Enterprise y su función operacional.</li>
        <li>Vincular un control remoto con una aeronave por los dos métodos oficiales.</li>
        <li>Personalizar botones C1, C2, C3, C4 y 5D conforme a perfiles operacionales propios.</li>
        <li>Navegar la interfaz de DJI Pilot 2: vista de cámara, configuración, modos de vuelo inteligentes.</li>
        <li>Configurar transmisión mejorada 4G con Adaptador celular 2 DJI y SIM nano.</li>
      </ul>
    </div>

    <div class="indice-leccion">
      <h4>Índice del módulo</h4>
      <ol>
        <li><a href="#l41">Lección 4.1 · Hardware del RC Plus 2 Enterprise</a></li>
        <li><a href="#l42">Lección 4.2 · Vinculación, botones y combinaciones</a></li>
        <li><a href="#l43">Lección 4.3 · Aplicación DJI Pilot 2 — interfaz</a></li>
        <li><a href="#l44">Lección 4.4 · Transmisión mejorada 4G</a></li>
        <li><a href="#caso">Caso práctico aplicado</a></li>
      </ol>
    </div>
  </section>

  <!-- ============ LECCIÓN 4.1 ============ -->
  <section class="bloque" id="l41">
    <div class="leccion">
      <span class="etiqueta">Lección 4.1</span>
      <h2>Hardware del RC Plus 2 Enterprise</h2>

      <p>El control remoto <strong>DJI RC Plus 2 Enterprise</strong> es el modelo estándar para la Serie Matrice 4. Se trata de una unidad robusta construida en magnesio y polímero técnico, con grado de protección IP54, pantalla táctil integrada de alta luminosidad para uso al sol directo, antenas externas plegables y batería interna recargable. La variante "Enhanced" agrega interfaces de expansión adicionales y módulos opcionales para integración con productos del ecosistema DJI.</p>

      <figure class="fig">
        <img src="https://enae.cl/cursos/matrice4/assets/img/control_remoto_rcplus2.jpg" alt="DJI RC Plus 2 Enterprise">
        <figcaption>Control remoto DJI RC Plus 2 Enterprise — vista frontal. Pantalla táctil 7&quot; de 1 200 nits, joysticks de precisión, antenas externas y selector de modo de vuelo.</figcaption>
      </figure>

      <h3>Componentes externos principales</h3>
      <table class="tabla-curso">
        <thead><tr><th>#</th><th>Control / componente</th><th>Función</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Pantalla táctil</td><td>Pantalla 7" de 1 200 nits con DJI Pilot 2 y Android nativo</td></tr>
          <tr><td>2</td><td>LED de estado de conexión</td><td>Indica vinculación con la aeronave</td></tr>
          <tr><td>3</td><td>Joysticks (palancas)</td><td>Movimientos de la aeronave en Modo 1, 2 o 3</td></tr>
          <tr><td>4</td><td>Botón Atrás / Función</td><td>1 pulsación = pantalla anterior; 2 pulsaciones = inicio. Se combina con otros para shortcuts</td></tr>
          <tr><td>5</td><td>Botones L1/L2/L3 y R1/R2/R3</td><td>Funciones específicas asignables en DJI Pilot 2</td></tr>
          <tr><td>6</td><td>Botón RPO (Return-to-Home)</td><td>Mantenido = inicia RPO; pulsado breve = cancela</td></tr>
          <tr><td>7</td><td>Micrófonos</td><td>Captación de audio para video</td></tr>
          <tr><td>8</td><td>Indicador de estado</td><td>Visible en parte superior</td></tr>
          <tr><td>9</td><td>LEDs de nivel de batería</td><td>Estado de la batería interna</td></tr>
          <tr><td>10</td><td>Botón de encendido</td><td>1 pulsación = nivel batería; 1 + sostenido = encender/apagar; 1 = encender/apagar pantalla</td></tr>
          <tr><td>11</td><td>Botón 5D</td><td>Joystick de 4 direcciones + clic, configurable</td></tr>
          <tr><td>12</td><td>Botón Detener vuelo</td><td>Frena la aeronave y la deja en hover (requiere visión o GNSS)</td></tr>
          <tr><td>13</td><td>Ranura microSD</td><td>Almacenamiento auxiliar, capturas y bitácoras</td></tr>
          <tr><td>14</td><td>Puerto USB-C</td><td>Carga, conexión PC, salida de datos</td></tr>
          <tr><td>15</td><td>Antenas externas</td><td>Plegables, dirección hacia la aeronave</td></tr>
          <tr><td>16</td><td>Botón personalizable C3</td><td>Función configurable en DJI Pilot 2</td></tr>
          <tr><td>17</td><td>Dial del estabilizador</td><td>Inclinación de la cámara con precisión</td></tr>
          <tr><td>18</td><td>Botón de grabación</td><td>Inicia/detiene grabación de video</td></tr>
          <tr><td>19</td><td>Selector de modo de vuelo</td><td>F (Función) / S (Sport) / N (Normal)</td></tr>
          <tr><td>20</td><td>Puerto HDMI</td><td>Salida video externa para monitor secundario</td></tr>
          <tr><td>21</td><td>Antenas internas</td><td>Adicionales para diversidad de polarización</td></tr>
          <tr><td>22</td><td>Puerto USB-A</td><td>Para dispositivos externos (USB drive, lector microSD)</td></tr>
          <tr><td>23</td><td>Botón de enfoque/obturador</td><td>Mitad = autofocus; completo = capturar foto</td></tr>
          <tr><td>24</td><td>Dial del zoom</td><td>Zoom continuo entre las cámaras visibles (24/70/168 mm)</td></tr>
          <tr><td>25</td><td>Rueda de desplazamiento C4</td><td>Personalizable</td></tr>
          <tr><td>26</td><td>Asa</td><td>Empuñadura ergonómica</td></tr>
          <tr><td>27</td><td>Altavoz</td><td>Avisos sonoros y reproducción</td></tr>
          <tr><td>28</td><td>Salida de aire</td><td>Ventilación interna activa</td></tr>
          <tr><td>30</td><td>Botones C1, C2 personalizables</td><td>Funciones rápidas (PinPoint, foto, hover)</td></tr>
          <tr><td>32</td><td>Botón liberación batería</td><td>Para desmontar la batería WB37</td></tr>
        </tbody>
      </table>

      <h3>Carga del control remoto</h3>
      <p>El RC Plus 2 utiliza una batería WB37 (intercambiable) más una pequeña batería interna de respaldo. Recomendaciones:</p>
      <ul>
        <li>Use el cable USB-C a USB-C oficial (incluido) y un adaptador con Power Delivery para carga rápida.</li>
        <li>Active la batería interna haciendo una primera carga completa antes del primer uso.</li>
        <li>Descargue completamente y recargue al menos una vez cada 3 meses si no se utiliza.</li>
        <li>Para comprobar nivel de batería, presione brevemente el botón de encendido.</li>
      </ul>

      <h3>Códigos LED del RC Plus 2</h3>
      <table class="tabla-curso">
        <thead><tr><th>LED de estado</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td>Rojo fijo</td><td>RC desvinculado de la aeronave</td></tr>
          <tr><td>Rojo parpadeante</td><td>Nivel de batería de la aeronave bajo</td></tr>
          <tr><td>Verde fijo</td><td>Vinculado, en operación normal</td></tr>
          <tr><td>Azul parpadeante</td><td>Vinculación en curso</td></tr>
          <tr><td>Amarillo fijo</td><td>Falla en actualización de firmware</td></tr>
          <tr><td>Azul fijo</td><td>Actualización de firmware exitosa</td></tr>
          <tr><td>Amarillo parpadeante</td><td>Batería del RC baja</td></tr>
          <tr><td>Cian parpadeante</td><td>Joysticks no centrados</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- ============ LECCIÓN 4.2 ============ -->
  <section class="bloque" id="l42">
    <div class="leccion">
      <span class="etiqueta">Lección 4.2</span>
      <h2>Vinculación, botones y combinaciones</h2>

      <h3>Modos de pilotaje (palancas)</h3>
      <p>El RC Plus 2 admite tres modos de mapeo de palancas. El <strong>Modo 2</strong> es el predeterminado y el más común internacionalmente:</p>

      <table class="tabla-curso">
        <thead><tr><th>Modo</th><th>Joystick izquierdo</th><th>Joystick derecho</th></tr></thead>
        <tbody>
          <tr><td><strong>Modo 1</strong></td><td>Pitch (adelante/atrás), Yaw (izq/der)</td><td>Throttle (sub/baj), Roll (izq/der)</td></tr>
          <tr><td><strong>Modo 2</strong> (default)</td><td>Throttle (sub/baj), Yaw (izq/der)</td><td>Pitch (adel/atr), Roll (izq/der)</td></tr>
          <tr><td><strong>Modo 3</strong></td><td>Pitch + Roll</td><td>Throttle + Yaw</td></tr>
        </tbody>
      </table>

      <div class="callout aviso">
        <strong>Selección del modo</strong>
        Una vez que el operador entrena con un modo, NO debe cambiarlo. Cambiar de modo durante una operación crítica puede causar reacciones equivocadas en momentos críticos. Verificar en cada vuelo que el modo activo sea el habitual.
      </div>

      <h3>Vinculación del control remoto con la aeronave</h3>
      <p>Si el RC y la aeronave fueron comprados como kit, ya están vinculados. Si se sustituye un componente, debe re-vincularse:</p>

      <p><strong>Método 1 — Combinación de botones</strong></p>
      <ol>
        <li>Encender ambos dispositivos.</li>
        <li>En el RC, presionar simultáneamente C1 + C2 + Botón Grabación hasta que el LED parpadee azul y suene un pitido.</li>
        <li>Mantener presionado el botón de encendido de la aeronave durante 5 segundos.</li>
        <li>La aeronave emite un pitido y los LEDs de batería parpadean en secuencia.</li>
        <li>Cuando el LED del RC se ilumina verde fijo y suenan dos pitidos, la vinculación está hecha.</li>
      </ol>

      <p><strong>Método 2 — Vía DJI Pilot 2</strong></p>
      <ol>
        <li>Encender RC y aeronave.</li>
        <li>Abrir DJI Pilot 2 → Vinculación del control remoto.</li>
        <li>Mantener encendido en la aeronave 5 segundos hasta que parpadee secuencialmente.</li>
        <li>Esperar verde fijo y dos pitidos del RC.</li>
      </ol>

      <h3>Combinaciones de botones predeterminadas</h3>
      <p>Manteniendo presionado el botón <strong>Atrás</strong>, se accede a funciones rápidas combinándolo con otros controles:</p>

      <table class="tabla-curso">
        <thead><tr><th>Combinación</th><th>Función</th></tr></thead>
        <tbody>
          <tr><td>Atrás + Dial Izquierdo</td><td>Ajuste de brillo de pantalla</td></tr>
          <tr><td>Atrás + Dial Derecho</td><td>Ajuste de volumen</td></tr>
          <tr><td>Atrás + Botón Grabar</td><td>Captura de pantalla en video</td></tr>
          <tr><td>Atrás + Botón Obturador</td><td>Captura de pantalla estática</td></tr>
          <tr><td>Atrás + 5D arriba</td><td>Volver a la pantalla de inicio</td></tr>
          <tr><td>Atrás + 5D abajo</td><td>Acceder a parámetros rápidos</td></tr>
          <tr><td>Atrás + 5D izquierda</td><td>Aplicaciones recientes</td></tr>
        </tbody>
      </table>

      <h3>Personalización de botones C1–C4 y 5D</h3>
      <p>Los botones C1, C2, C3, C4 y 5D son <strong>completamente personalizables</strong> desde DJI Pilot 2 → Vista de cámara → ⚙ → Control. Cada botón puede asignarse a funciones como:</p>
      <ul>
        <li>Activar/desactivar PinPoint con telémetro láser.</li>
        <li>Cambiar entre cámara visible y térmica (M4T).</li>
        <li>Activar AE-Lock o foco bloqueado.</li>
        <li>Iniciar/cancelar misión waypoint.</li>
        <li>Cambiar entre cámara gran angular, tele media, tele.</li>
        <li>Activar luz auxiliar NIR (M4T) o luz frontal.</li>
        <li>Centrar el estabilizador.</li>
        <li>Activar transmisión a otro dispositivo (FlightHub).</li>
      </ul>

      <h3>Zona de transmisión óptima</h3>
      <p>Las antenas externas son direccionales: el rendimiento óptimo requiere que su <strong>cara plana esté orientada perpendicularmente a la aeronave</strong>. Levante las antenas hasta que queden en posición y oriéntelas hacia el cuadrante donde está volando la aeronave. Una mala orientación puede reducir el alcance hasta en 50 %.</p>

      <div class="callout alerta">
        <strong>Interferencias en banda</strong>
        Durante una operación, NO use otros dispositivos que emitan en 2.4 GHz / 5.8 GHz cerca del RC: Wi-Fi del teléfono móvil, hotspots, walkie-talkies de banda WiFi, etc. La interferencia puede degradar la transmisión o causar pérdidas momentáneas de enlace que activarán RPO de seguridad inesperadamente.
      </div>
    </div>
  </section>

  <!-- ============ LECCIÓN 4.3 ============ -->
  <section class="bloque" id="l43">
    <div class="leccion">
      <span class="etiqueta">Lección 4.3</span>
      <h2>Aplicación DJI Pilot 2</h2>

      <p><strong>DJI Pilot 2</strong> es la aplicación oficial de control de la Serie Matrice 4 (también compatible con Matrice 30/350 RTK, Mavic 3 Enterprise y Matrice 400). Está pre-instalada en el RC Plus 2. Su misión es entregar al operador una interfaz unificada para configuración, vuelo, captura, planificación de misiones y diagnóstico.</p>

      <h3>Página principal</h3>
      <p>Al iniciar la app aparece la página principal con accesos a:</p>
      <ul>
        <li><strong>Operación</strong>: ingresar a vista de cámara y volar.</li>
        <li><strong>Misión</strong>: planificación waypoint, área (mapeo), línea oblicua, follow terrain.</li>
        <li><strong>Mi álbum</strong>: revisar fotos y videos guardados.</li>
        <li><strong>Live</strong>: transmisión en vivo a FlightHub o RTMP.</li>
        <li><strong>Health management</strong>: estado de la aeronave, ciclos de batería, calibraciones.</li>
        <li><strong>Mapa de Zona GEO</strong>: revisar restricciones, gestionar licencias de desbloqueo.</li>
      </ul>

      <h3>Vista de cámara — barra superior</h3>
      <p>La barra superior muestra en tiempo real:</p>
      <ul>
        <li>Modo de vuelo activo (N / S / F).</li>
        <li>Estado GNSS (calidad de señal, número de satélites).</li>
        <li>Estado RTK (FIX / FLOAT / SINGLE / no usado).</li>
        <li>Distancia al punto de origen, altitud relativa y velocidad horizontal.</li>
        <li>Icono de batería de la aeronave con porcentaje y autonomía estimada.</li>
        <li>Estado de la transmisión (calidad de enlace OcuSync, opcional 4G).</li>
        <li>Almacenamiento microSD restante.</li>
      </ul>

      <h3>Pantalla de navegación (mapa)</h3>
      <p>Permite ver la posición de la aeronave sobre cartografía vectorial (offline disponible), trazar ruta, gestionar misiones waypoint, y visualizar trayectoria histórica del vuelo. Muestra:</p>
      <ul>
        <li>Punto de origen (Home Point).</li>
        <li>Posición actual de la aeronave.</li>
        <li>Ruta planificada (en modo misión).</li>
        <li>Rutas de RPO planificada por la aeronave.</li>
        <li>Zonas GEO con su clasificación de color.</li>
        <li>Otras aeronaves DJI cercanas (si comparten flota).</li>
        <li>Aeronaves tripuladas detectadas por AirSense (icono avión).</li>
      </ul>

      <h3>Vistas de cámara especializadas</h3>
      <p>DJI Pilot 2 ofrece cuatro vistas de cámara distintas según el modelo y la operación:</p>

      <table class="tabla-curso">
        <thead><tr><th>Vista</th><th>Disponibilidad</th><th>Uso típico</th></tr></thead>
        <tbody>
          <tr><td>Cámara con zoom</td><td>M4T y M4E</td><td>Inspección detallada con zoom continuo 24–168 mm</td></tr>
          <tr><td>Cámara gran angular</td><td>M4T y M4E</td><td>Encuadre amplio, mapeo, vista situacional</td></tr>
          <tr><td>Cámara térmica</td><td>Solo M4T</td><td>Detección de calor, modos isoterma, paletas</td></tr>
          <tr><td>Telémetro láser</td><td>M4T y M4E</td><td>Medición de distancia y PinPoint geo-referenciado</td></tr>
        </tbody>
      </table>

      <h3>Vista de cámara térmica (M4T)</h3>
      <p>La vista térmica del Matrice 4T entrega control granular sobre la imagen IR:</p>
      <ul>
        <li><strong>Paletas:</strong> White Hot, Black Hot, Tinted, Iron Red, Hot Spot, Cold Spot, etc. La elección depende del operador (las paletas de alto contraste como Iron Red son útiles en SAR, mientras que White Hot es estándar en termografía industrial).</li>
        <li><strong>Modo radiométrico:</strong> el sensor reporta temperatura por píxel. Permite definir áreas y obtener temperatura mínima/máxima/promedio.</li>
        <li><strong>Isoterma:</strong> resaltar zonas dentro de un rango definido (por ejemplo: 50–80 °C en un transformador).</li>
        <li><strong>Spot meter:</strong> punto de medición fijo en cualquier coordenada del fotograma.</li>
        <li><strong>FFC (Flat Field Calibration):</strong> calibración de homogeneidad. Suena un "click" del shutter interno cada cierto tiempo.</li>
      </ul>

      <h3>Telémetro láser y PinPoint</h3>
      <p>La función <strong>PinPoint</strong> aprovecha el telémetro láser para georeferenciar puntos. Al apuntar la cámara a un objetivo y activar el láser, DJI Pilot 2:</p>
      <ol>
        <li>Mide la distancia exacta al objetivo (precisión decimétrica).</li>
        <li>Calcula sus coordenadas GNSS basándose en la posición y orientación de la aeronave.</li>
        <li>Crea un marcador permanente en el mapa con coordenadas, altura y nota.</li>
        <li>Comparte el PinPoint a otros usuarios FlightHub conectados a la misión.</li>
      </ol>

      <p>Los PinPoints son la base de las <em>Live Annotations</em> en DJI FlightHub 2: equipos de seguridad pública pueden coordinar sobre un mapa común con puntos, líneas y áreas creadas en tiempo real desde el dron.</p>
    </div>
  </section>

  <!-- ============ LECCIÓN 4.4 ============ -->
  <section class="bloque" id="l44">
    <div class="leccion">
      <span class="etiqueta">Lección 4.4</span>
      <h2>Transmisión mejorada 4G</h2>

      <p>El sistema de transmisión nativo OcuSync entrega un alcance teórico superior a 15 km con buena propagación. Sin embargo, en operaciones BVLOS, en zonas urbanas con multipropagación o en valles cerrados, OcuSync puede degradarse. Para estos escenarios, el sistema admite <strong>transmisión mejorada 4G</strong> mediante el <em>Adaptador celular 2 DJI</em> instalado en la aeronave y la conexión a redes celulares del control remoto.</p>

      <h3>Componentes necesarios</h3>
      <ul>
        <li>Adaptador celular 2 DJI (vendido por separado).</li>
        <li>Tarjeta nano-SIM con plan de datos 4G en el adaptador celular de la aeronave.</li>
        <li>Conectividad del control remoto: tarjeta nano-SIM en su slot integrado o conexión WiFi.</li>
      </ul>

      <h3>Inserción de la nano-SIM</h3>
      <ol>
        <li>Apague la aeronave.</li>
        <li>Abra el compartimento del adaptador celular en la base de la aeronave.</li>
        <li>Inserte la nano-SIM en su orientación correcta (clip de oro hacia adentro).</li>
        <li>Asegure el adaptador celular y cierre la tapa.</li>
        <li>Encienda la aeronave y verifique conexión 4G en DJI Pilot 2 → Estado de la transmisión.</li>
      </ol>

      <h3>Estrategia de seguridad de la transmisión</h3>
      <p>Cuando hay transmisión 4G activa, el sistema funciona en modo dual: si la señal OcuSync falla, la transmisión 4G continúa entregando control y video. Esto se conoce como <em>fallback</em> automático. La aeronave también puede operar exclusivamente en 4G si OcuSync se pierde por completo.</p>

      <div class="callout aviso">
        <strong>Limitaciones del 4G en RPO</strong>
        Durante un RPO con transmisión 4G activa, la aeronave seguirá la última ruta de vuelo conocida ya que la latencia 4G no permite el control fino del sistema de detección. Mantenga atención al estado de batería y a la ruta RPO en el mapa, ya que pueden existir obstáculos no detectados en la traza retornada.
      </div>

      <h3>Requisitos de red</h3>
      <ul>
        <li>SIM con plan 4G (idealmente con cobertura nacional).</li>
        <li>Latencia &lt; 200 ms para operación de calidad.</li>
        <li>Velocidad de subida ≥ 5 Mbps recomendada para video HD.</li>
        <li>Operadores con cobertura confirmada en zona de operación.</li>
      </ul>

      <h3>Notas de uso</h3>
      <ul>
        <li>El RC debe mantener su conexión a internet activa durante toda la misión.</li>
        <li>El consumo de datos puede superar 1 GB/hora en operación con video HD.</li>
        <li>En frontera entre celdas (handover), pueden producirse interrupciones momentáneas.</li>
        <li>La transmisión 4G permite que múltiples usuarios reciban video del dron via FlightHub.</li>
      </ul>
    </div>
  </section>

  <!-- ============ CASO PRÁCTICO ============ -->
  <section id="caso">
    <div class="caso-practico">
      <div class="header-caso">
        <div class="icono">CP</div>
        <h2 style="margin:0;border:none;">Caso práctico — Configuración pre-operacional para SAR montañoso</h2>
      </div>

      <div class="escenario">
        <strong>Escenario operacional</strong>
        <p>Como operador certificado de RPAS, su servicio recibe llamada de Carabineros para apoyar una operación de búsqueda de un excursionista perdido en la Reserva Nacional Río de los Cipreses. Última ubicación reportada: 34°15''S 70°22''W, terreno entre 1 800 y 2 400 m de altitud, con vegetación densa de matorral nativo y crepúsculo civil en 2 horas. La temperatura nocturna estimada es 4 °C. Cobertura celular variable. Su unidad despliega un Matrice 4T con 4 baterías.</p>
      </div>

      <strong>Preguntas guía</strong>
      <ul class="preguntas-caso">
        <li>Detalle la configuración personalizada del RC (botones C1–C4, 5D) que aplicaría para esta misión específica.</li>
        <li>¿Qué configuración de transmisión usaría considerando la cobertura celular variable?</li>
        <li>En DJI Pilot 2, ¿qué paleta térmica recomienda para detección de firma humana? ¿Por qué?</li>
        <li>¿Cómo coordina su operación de RPAS con personal de Carabineros y SAR terrestre, especialmente en lo que respecta a PinPoints?</li>
        <li>Si pierde temporalmente la transmisión OcuSync por geometría del terreno, ¿qué pasa con la operación?</li>
      </ul>

      <details class="respuestas-modelo">
        <summary>Respuesta modelo</summary>
        <div style="padding:14px 6px;">
          <p><strong>Configuración personalizada:</strong> C1 = Activar/desactivar luz NIR; C2 = Activar PinPoint con telémetro láser; C3 = Cambiar entre cámara visible y térmica; C4 (rueda) = Zoom continuo 24–168 mm; 5D arriba = centrar estabilizador; 5D abajo = AE-Lock térmico; 5D izquierda = grabar; 5D derecha = capturar foto. Esta configuración minimiza el tiempo de cambio entre acciones críticas en la búsqueda.</p>
          <p><strong>Transmisión:</strong> usar transmisión dual OcuSync + 4G. La cobertura celular variable significa que el 4G no es suficiente como único canal, pero sí útil como respaldo. OcuSync queda como primario. Verificar que el Adaptador celular 2 esté instalado y que la SIM tenga datos. En zonas de "sombra" (valles cerrados) la operación se planifica con líneas de visión directa al RC, ascendiendo si es necesario para mantener enlace.</p>
          <p><strong>Paleta térmica:</strong> <em>Hot Spot</em> (mancha caliente) o <em>Iron Red</em>. Hot Spot resalta automáticamente las zonas más calientes del cuadro como puntos rojos sobre fondo neutro, ideal para detección rápida de cuerpo humano (~37 °C) sobre vegetación fría (~4 °C). Iron Red es alternativa estándar industrial con buena diferenciación. Se evita White Hot porque la cubierta nubosa puede generar contrastes engañosos.</p>
          <p><strong>Coordinación:</strong> usar DJI FlightHub 2 con Carabineros y equipos SAR como observadores. Cada vez que se detecta una firma térmica sospechosa, activar PinPoint y compartir las coordenadas con cuadrillas terrestres mediante radio o aplicación. Documentar cada PinPoint con foto + nota. Cuadrículas de búsqueda planificadas como misiones waypoint ramificadas en franjas de 80 m con 100 % de superposición a 80 m AGL para garantizar cobertura del sotobosque.</p>
          <p><strong>Pérdida de OcuSync:</strong> si está configurada acción de pérdida = "RPO", la aeronave iniciará retorno automático tras 3 segundos sin enlace. La transmisión 4G mantiene control si está disponible. Para SAR es preferible configurar pérdida de señal = "Hover" durante 30 segundos (espera a recuperar) y luego RPO. Esto evita pérdida innecesaria del punto de búsqueda. Documentar la decisión en el plan de vuelo y comunicarlo al equipo.</p>
        </div>
      </details>
    </div>
  </section>

  

</main>



</body>
</html>
');

  -- Module 5
  INSERT INTO course_modules (course_id, sort_order, title, description)
  VALUES (v_course_id, 5, 'Módulo 5: Operaciones de vuelo y seguridad operacional', 'Modos de vuelo, despegue/aterrizaje, RPO, APAS, AirSense, gestión de zonas GEO y procedimientos de emergencia.')
  RETURNING id INTO v_module_id;
  INSERT INTO module_activities (module_id, sort_order, type, title, description)
  VALUES (v_module_id, 0, 'html', 'Contenido del módulo 5', '<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Módulo 5 — Operaciones de vuelo · Matrice 4 Series · ENAE</title>
<link rel="stylesheet" href="https://enae.cl/cursos/matrice4/assets/curso.css">
</head>
<body>

<header class="header-curso">
  <div class="marca">ENAE — Curso Matrice 4 Series</div>
  <h1>Módulo 5 · Operaciones de vuelo y seguridad operacional</h1>
  <div class="subtitulo">Modos de vuelo · RPO · APAS · AirSense · Zonas GEO · 5 lecciones · 4 horas</div>
</header>



<main class="contenedor">

  <section class="bloque">
    <h2>Presentación del módulo</h2>
    <p>Este módulo aborda la <strong>operación segura de la aeronave</strong>: los modos de vuelo y sus restricciones, los procedimientos de despegue/aterrizaje, el sistema Regreso al Punto de Origen (RPO) y sus tres mecanismos de activación, los sistemas avanzados de asistencia al piloto (APAS), DJI AirSense y la gestión de zonas GEO. Es el módulo central del curso desde el punto de vista operacional.</p>

    <div class="objetivos">
      <h3>Objetivos de aprendizaje</h3>
      <ul>
        <li>Distinguir los modos N, S y F (T/A) y aplicar criterio para usar cada uno.</li>
        <li>Ejecutar la lista de comprobación pre-vuelo conforme a estándar DJI/operacional.</li>
        <li>Comprender la lógica del RPO y configurar correctamente la altitud y comportamiento.</li>
        <li>Operar APAS para evitación automática de obstáculos en condiciones adecuadas.</li>
        <li>Interpretar alertas de DJI AirSense ante tráfico tripulado y reaccionar conforme a protocolo.</li>
        <li>Gestionar el sistema GEO: solicitar desbloqueos, evitar zonas restringidas, leer cuentas atrás.</li>
      </ul>
    </div>

    <div class="indice-leccion">
      <h4>Índice del módulo</h4>
      <ol>
        <li><a href="#l51">Lección 5.1 · Modos de vuelo y procedimientos básicos</a></li>
        <li><a href="#l52">Lección 5.2 · Lista de comprobación pre-vuelo y arranque/parada</a></li>
        <li><a href="#l53">Lección 5.3 · Regreso al Punto de Origen (RPO)</a></li>
        <li><a href="#l54">Lección 5.4 · APAS y protección de aterrizaje</a></li>
        <li><a href="#l55">Lección 5.5 · DJI AirSense y zonas GEO</a></li>
        <li><a href="#caso">Caso práctico aplicado</a></li>
      </ol>
    </div>
  </section>

  <!-- ============ LECCIÓN 5.1 ============ -->
  <section class="bloque" id="l51">
    <div class="leccion">
      <span class="etiqueta">Lección 5.1</span>
      <h2>Modos de vuelo y procedimientos básicos</h2>

      <p>El selector físico del RC Plus 2 permite alternar entre tres posiciones de modo de vuelo: <strong>F (Función), S (Sport) y N (Normal)</strong>. Cada uno responde a un perfil operacional distinto y tiene implicaciones críticas sobre el sistema de detección y la velocidad máxima.</p>

      <h3>Modo Normal (N) — recomendado por defecto</h3>
      <p>Es el modo predeterminado y el adecuado para la <strong>mayoría de los escenarios operativos</strong>. La aeronave dispone de:</p>
      <ul>
        <li>Hover preciso con sistema de visión y GNSS activos.</li>
        <li>Detección de obstáculos completamente operativa (frenado/evasión).</li>
        <li>Modos de vuelo inteligentes habilitados (waypoint, área, mapeo, follow terrain).</li>
        <li>Velocidad máxima horizontal: 15 m/s adelante, 12 m/s atrás, 10 m/s lateral.</li>
      </ul>

      <h3>Modo Sport (S) — alta velocidad</h3>
      <p>Eleva la velocidad máxima horizontal a 21 m/s (75.6 km/h) adelante. Compromete la seguridad porque <strong>desactiva el sistema de detección de obstáculos</strong>. Solo debe usarse en espacio abierto, despejado y bajo control directo del piloto. La distancia de frenado aumenta significativamente.</p>

      <div class="callout alerta">
        <strong>Reglas críticas — Modo Sport</strong>
        <ul style="margin-top:6px;">
          <li>NO usar en zonas con obstáculos cercanos (árboles, líneas, edificios).</li>
          <li>NO usar para inspección o acercamiento a infraestructura.</li>
          <li>Mantener siempre VLOS y atención a la posición.</li>
          <li>La aeronave NO frena automáticamente ante obstáculos.</li>
          <li>La respuesta a controles es mucho más sensible — el operador debe ser experto.</li>
          <li>Solo activar tras evaluación explícita de seguridad.</li>
        </ul>
      </div>

      <h3>Modo Función (F) — Trípode (T) o Posición (A)</h3>
      <p>El modo F se configura en DJI Pilot 2 como <strong>Modo Trípode (T)</strong> o <strong>Modo Posición (ATTI)</strong>:</p>
      <ul>
        <li><strong>Modo T (Trípode):</strong> velocidad reducida (3 m/s o 2.8 m/s en UE) para vuelos de precisión cinematográfica o aproximación a infraestructura. Mantiene detección de obstáculos. Útil para inspección detallada.</li>
        <li><strong>Modo A (ATTI):</strong> el sistema de visión y GNSS se desactivan. La aeronave se comporta como un helicóptero clásico: si el operador suelta los controles, la aeronave deriva con el viento. Solo debe usarse por <em>operadores experimentados</em>. La aeronave puede activar este modo automáticamente si pierde GNSS y visión simultáneamente.</li>
      </ul>

      <div class="callout aviso">
        <strong>Activación automática de ATTI</strong>
        Si la aeronave pierde sistema de visión Y GNSS (o brújula con interferencia), entrará automáticamente en modo ATTI. El piloto debe estar preparado para volar la aeronave manualmente, sin asistencia de hover. Practicar este escenario en simulador o entrenamiento controlado es fundamental.
      </div>

      <h3>Control de la aeronave (Modo 2 estándar)</h3>
      <table class="tabla-curso">
        <thead><tr><th>Acción</th><th>Joystick izquierdo</th><th>Joystick derecho</th></tr></thead>
        <tbody>
          <tr><td>Subir</td><td>Empujar arriba</td><td>—</td></tr>
          <tr><td>Bajar</td><td>Empujar abajo</td><td>—</td></tr>
          <tr><td>Girar a la izquierda (yaw)</td><td>Empujar izquierda</td><td>—</td></tr>
          <tr><td>Girar a la derecha (yaw)</td><td>Empujar derecha</td><td>—</td></tr>
          <tr><td>Avanzar</td><td>—</td><td>Empujar arriba</td></tr>
          <tr><td>Retroceder</td><td>—</td><td>Empujar abajo</td></tr>
          <tr><td>Mover a la izquierda</td><td>—</td><td>Empujar izquierda</td></tr>
          <tr><td>Mover a la derecha</td><td>—</td><td>Empujar derecha</td></tr>
        </tbody>
      </table>

      <h3>Indicadores de estado de la aeronave</h3>
      <p>Los LEDs de estado en la aeronave comunican condición operativa:</p>
      <table class="tabla-curso">
        <thead><tr><th>Patrón LED</th><th>Estado</th></tr></thead>
        <tbody>
          <tr><td>Rojo, amarillo y verde alternados</td><td>Encendido y autodiagnóstico</td></tr>
          <tr><td>Amarillo parpadea 4 veces</td><td>Calentando</td></tr>
          <tr><td>Verde parpadea lento</td><td>GNSS activado, listo para volar</td></tr>
          <tr><td>Verde parpadea doble</td><td>Sistemas de visión activados</td></tr>
          <tr><td>Amarillo parpadea lento</td><td>GNSS y visión desactivados — modo ATTI</td></tr>
          <tr><td>Amarillo parpadea rápido</td><td>Pérdida de señal del control remoto</td></tr>
          <tr><td>Rojo parpadea lento</td><td>Despegue desactivado (consultar Pilot 2)</td></tr>
          <tr><td>Rojo parpadea rápido</td><td>Nivel de batería crítico</td></tr>
          <tr><td>Rojo fijo</td><td>Error crítico</td></tr>
          <tr><td>Rojo y amarillo alternados</td><td>Calibración de brújula necesaria</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- ============ LECCIÓN 5.2 ============ -->
  <section class="bloque" id="l52">
    <div class="leccion">
      <span class="etiqueta">Lección 5.2</span>
      <h2>Lista de comprobación pre-vuelo y arranque/parada</h2>

      <p>La lista de comprobación pre-vuelo es el <strong>elemento más importante</strong> de la operación segura. Debe ejecutarse rigurosamente antes de cada vuelo, independientemente de la experiencia del operador. Su omisión es la principal causa documentada de accidentes en operaciones con RPAS profesionales.</p>

      <h3>Lista de comprobación pre-vuelo (estándar Matrice 4)</h3>
      <ol>
        <li>Verificar batería de aeronave y RC al 100 % (o nivel suficiente para la misión planeada con margen del 30 %).</li>
        <li>Verificar bandas de sujeción de batería extendidas y batería bien insertada (clic audible).</li>
        <li>Inspeccionar la aeronave: ausencia de cuerpos extraños (agua, aceite, arena) en compartimentos, ventilación libre.</li>
        <li>Hélices del mismo modelo, sin daños, montadas correctamente, brazos y palas desplegados.</li>
        <li>Lentes del sistema de visión, cámaras, sensor IR y luz auxiliar limpios, sin pegatinas ni obstrucción.</li>
        <li>Retirar el protector del estabilizador antes de encender la aeronave.</li>
        <li>Antenas del control remoto en posición correcta (cara plana hacia la aeronave).</li>
        <li>Firmware de aeronave, RC y DJI Pilot 2 actualizado a la versión más reciente.</li>
        <li>Encender aeronave y RC; verificar selector en modo N; LED RC en verde fijo y LEDs de batería de aeronave en verde fijo (vinculación correcta).</li>
        <li>Verificar que la zona de operación esté autorizada para vuelo de RPAS.</li>
        <li>Posicionar la aeronave en superficie despejada y plana, sin obstáculos en 5 m.</li>
        <li>El piloto se ubica orientado a la cola de la aeronave a 5 m de distancia.</li>
        <li>Acceder a vista de vuelo en DJI Pilot 2 y revisar parámetros: GNSS ≥ 12 sat, RTK FIX si aplica, calibración de brújula OK, IMU OK.</li>
        <li>Confirmar la altura y distancia máximas configuradas.</li>
        <li>Confirmar la altitud RPO configurada (debe superar todos los obstáculos de la zona).</li>
        <li>Confirmar la acción ante pérdida de señal (RPO recomendado).</li>
        <li>Verificar configuración de RTK si la misión la requiere.</li>
        <li>Coordinar con observador (si aplica) y verificar comunicación radio.</li>
        <li>Anunciar despegue al equipo presente y confirmar área despejada.</li>
      </ol>

      <h3>Arranque de motores (CSC)</h3>
      <p>Los motores se arrancan mediante el <strong>Comando de Combinación de Palancas (CSC)</strong>: ambos joysticks llevados simultáneamente hacia adentro/abajo (formato V invertida) o hacia afuera/abajo. Una vez arrancados, soltar inmediatamente las palancas a posición neutra.</p>

      <h3>Parada de motores</h3>
      <p>Tras aterrizaje, hay dos métodos:</p>
      <ul>
        <li><strong>Método 1:</strong> mantener la palanca de aceleración hacia abajo hasta que los motores se detengan (~3 segundos).</li>
        <li><strong>Método 2:</strong> ejecutar el CSC nuevamente (mismo gesto del arranque) hasta detención.</li>
      </ul>

      <div class="callout alerta">
        <strong>Detención de motores en vuelo</strong>
        El CSC puede detener los motores DURANTE el vuelo solo si el controlador de vuelo detecta un error crítico. Esto provocará el estrellamiento. Es una decisión de último recurso solo cuando exista riesgo a vidas en tierra. La instrucción y entrenamiento sobre este escenario debe documentarse en el manual de operaciones.
      </div>

      <h3>Despegue manual</h3>
      <ol>
        <li>Tras CSC, esperar 2 segundos confirmando giro estable.</li>
        <li>Empujar suavemente la palanca de aceleración hacia arriba.</li>
        <li>Estabilizar a 1.5 m AGL y hacer hover de comprobación 3–5 segundos.</li>
        <li>Verificar respuesta a inputs cortos en cada eje.</li>
        <li>Subir progresivamente a la altura operativa.</li>
      </ol>

      <h3>Aterrizaje manual</h3>
      <ol>
        <li>Aproximar al sitio de aterrizaje a velocidad reducida (modo Normal).</li>
        <li>Estabilizar en hover a 5 m sobre el punto de aterrizaje.</li>
        <li>Iniciar descenso suave manteniendo la aeronave sobre el punto.</li>
        <li>Cuando los patines toquen el suelo, mantener throttle hacia abajo hasta corte de motores.</li>
      </ol>
    </div>
  </section>

  <!-- ============ LECCIÓN 5.3 ============ -->
  <section class="bloque" id="l53">
    <div class="leccion">
      <span class="etiqueta">Lección 5.3</span>
      <h2>Regreso al Punto de Origen (RPO)</h2>

      <p>El <strong>Regreso al Punto de Origen</strong> (RPO, equivalente a <em>Return-to-Home</em> en otros sistemas) es la función automática que devuelve la aeronave al último punto de origen registrado. La Serie Matrice 4 dispone de una versión avanzada (<strong>RPO avanzado</strong>) con planificación inteligente de ruta.</p>

      <h3>Tres mecanismos de activación</h3>

      <table class="tabla-curso">
        <thead><tr><th>Mecanismo</th><th>Activación</th><th>Comportamiento</th></tr></thead>
        <tbody>
          <tr>
            <td><strong>RPO manual</strong></td>
            <td>Mantener presionado el botón RPO en el RC durante el vuelo</td>
            <td>Inicio inmediato de retorno con ruta planificada</td>
          </tr>
          <tr>
            <td><strong>RPO por batería baja</strong></td>
            <td>Cálculo automático cuando la batería solo permite el regreso</td>
            <td>Aviso con cuenta atrás → RPO automático si no se cancela</td>
          </tr>
          <tr>
            <td><strong>RPO por pérdida de señal</strong></td>
            <td>Pérdida de enlace con el RC (si configurado a "RPO")</td>
            <td>Retorno automático tras 3 s sin señal</td>
          </tr>
        </tbody>
      </table>

      <h3>Punto de origen</h3>
      <p>El punto de origen se registra automáticamente durante el despegue cuando hay señal GNSS suficiente o iluminación adecuada. DJI Pilot 2 emite un mensaje de voz al confirmarlo. <strong>Si la posición del operador cambia durante el vuelo</strong>, debe actualizarse manualmente: <em>Vista de cámara → ⚙ → Control → Actualizar punto de origen</em>.</p>

      <h3>Configuración crítica del RPO</h3>
      <ul>
        <li><strong>Altitud RPO:</strong> por defecto 100 m. Debe ajustarse SUPERIOR al obstáculo más alto del área de operación. Si vuela en zonas con torres de 50 m, configure altitud RPO ≥ 70 m.</li>
        <li><strong>Modo RPO:</strong> "Avanzado" (planifica ruta evitando obstáculos) o "Preestablecido" (asciende a altitud RPO y vuelve en línea recta).</li>
        <li><strong>Acción ante pérdida de señal:</strong> RPO (recomendado), Hover (espera) o Aterrizar.</li>
      </ul>

      <h3>Procedimiento de RPO avanzado</h3>
      <ol>
        <li>La aeronave frena y entra en hover por 1–2 s.</li>
        <li>Asciende (si está bajo la altitud RPO) o mantiene altitud actual (si está sobre).</li>
        <li>Calcula la mejor ruta evitando zonas GEO, obstáculos y rutas peligrosas conocidas.</li>
        <li>Vuela hacia el punto de origen ajustando velocidad según viento y obstáculos.</li>
        <li>Sobre el punto de origen, gira la cámara hacia abajo y desciende.</li>
        <li>Activa protección de aterrizaje y aterriza si el terreno es adecuado.</li>
      </ol>

      <div class="callout aviso">
        <strong>Realidad aumentada del RPO</strong>
        Durante el RPO, DJI Pilot 2 muestra la <em>ruta de RPO en RA</em> (realidad aumentada) sobre la vista de cámara, indicando el camino planificado. Esta visualización es referencial: la ruta real puede diferir levemente. Mantenga atención a la pantalla y al estado de batería.
      </div>

      <h3>Casos de excepción</h3>
      <ul>
        <li>Si el sistema de posicionamiento falla durante RPO de seguridad, la aeronave puede entrar en ATTI y aterrizar localmente.</li>
        <li>Si una zona GEO interfiere en la ruta, el RPO se modifica o aborta. Evite operaciones cerca de zonas GEO sin desbloqueo.</li>
        <li>Si el viento es superior a la capacidad de retorno, la aeronave NO podrá regresar y caerá cuando se agote la batería. Vuele con margen de seguridad ante viento.</li>
        <li>Cables eléctricos finos, ramas de árboles y vidrio NO son detectados consistentemente durante RPO. Configure altitud RPO conservadora.</li>
        <li>El RPO no se activa durante un aterrizaje automático en curso.</li>
      </ul>

      <h3>Cómo cancelar el RPO</h3>
      <p>Durante un RPO con señal disponible, presione el botón RPO o el botón "Detener vuelo" en el RC. La aeronave saldrá del RPO y volverá al control manual. Si el RPO se inició por batería baja, no se recomienda cancelarlo a menos que el sitio de despliegue esté más cerca que el punto de origen y sea seguro aterrizar localmente.</p>
    </div>
  </section>

  <!-- ============ LECCIÓN 5.4 ============ -->
  <section class="bloque" id="l54">
    <div class="leccion">
      <span class="etiqueta">Lección 5.4</span>
      <h2>APAS y protección de aterrizaje</h2>

      <p><strong>APAS (Advanced Pilot Assistance Systems)</strong> es el sistema de evasión activa de obstáculos. Cuando está activado, la aeronave responde a los inputs del piloto pero <em>simultáneamente</em> planifica desvíos automáticos para sortear obstáculos detectados en el sistema de visión.</p>

      <h3>Activación de APAS</h3>
      <p>DJI Pilot 2 → Vista de cámara → ⚙ → Sistema anticolisión → Acción = "<strong>Evitar</strong>". Otras opciones disponibles:</p>
      <ul>
        <li><strong>Evitar:</strong> APAS activo. La aeronave intenta replanificar la ruta.</li>
        <li><strong>Frenar:</strong> la aeronave detiene el avance ante obstáculo, sin replanificar.</li>
        <li><strong>Apagado:</strong> la aeronave no actúa ante obstáculos. Solo para operadores expertos en escenarios controlados.</li>
      </ul>

      <h3>Limitaciones de APAS</h3>
      <ul>
        <li>Requiere sistema de visión disponible (luz adecuada, lentes limpias).</li>
        <li>No detecta consistentemente cables muy finos, ramas pequeñas, vidrio o agua.</li>
        <li>Performance degradada en condiciones extremas: &lt; 300 lux o &gt; 10 000 lux.</li>
        <li>No funciona correctamente cerca de zonas GEO.</li>
        <li>Si parcialmente disponible, la aeronave frena en hover en lugar de evadir.</li>
        <li>Se desactiva automáticamente en modo Sport.</li>
      </ul>

      <h3>Protección de aterrizaje</h3>
      <p>Cuando APAS está activo en modo "Evitar" o "Frenar", al iniciar aterrizaje (palanca de throttle abajo) se activa la protección de aterrizaje:</p>
      <ul>
        <li>Si el terreno es plano y adecuado, la aeronave aterriza directamente.</li>
        <li>Si detecta terreno irregular, agua, o no apto, la aeronave queda en hover.</li>
        <li>Para forzar aterrizaje en este caso: mantener throttle abajo durante 5 segundos. La aeronave aterrizará con detección desactivada.</li>
      </ul>

      <h3>Asistencia visual</h3>
      <p>Función adicional que permite al piloto observar la <strong>vista del sistema de visión correspondiente</strong> según la dirección de vuelo. Útil para vuelo en reversa o lateral cuando la cámara principal no apunta hacia el sentido de movimiento.</p>
      <ul>
        <li>Acceder pulsando la flecha de dirección en la vista de cámara.</li>
        <li>Mantener pulsado para bloquear la dirección.</li>
        <li>Pulsar el centro para maximizar la vista.</li>
        <li>Las hélices son visibles en la vista — comportamiento normal.</li>
        <li>Es referencial: no muestra cables finos ni vidrio con precisión.</li>
      </ul>
    </div>
  </section>

  <!-- ============ LECCIÓN 5.5 ============ -->
  <section class="bloque" id="l55">
    <div class="leccion">
      <span class="etiqueta">Lección 5.5</span>
      <h2>DJI AirSense y zonas GEO</h2>

      <h3>DJI AirSense</h3>
      <p>El Matrice 4 incluye un <strong>receptor ADS-B integrado</strong> (DJI AirSense) que detecta tráfico aéreo tripulado dentro de un radio de 10 km. Recibe transmisiones ADS-B Out en estándares 1090ES (RTCA DO-260) y UAT (RTCA DO-282), calcula la posición/orientación/velocidad relativa y muestra alertas categorizadas en DJI Pilot 2.</p>

      <h3>Categorías de alerta AirSense</h3>
      <table class="tabla-curso">
        <thead><tr><th>Nivel</th><th>Indicación</th><th>Acción esperada</th></tr></thead>
        <tbody>
          <tr><td>Aviso</td><td>Icono avión azul en mapa</td><td>Tomar conciencia. Sin acción inmediata.</td></tr>
          <tr><td>Precaución</td><td>"Aeronave tripulada detectada en alrededores. Vuele con cuidado." Icono naranja con distancia.</td><td>Reducir altitud o evitar la traza del tráfico tripulado.</td></tr>
          <tr><td>Advertencia</td><td>"Riesgo de colisión. Descienda o ascienda inmediatamente." Icono rojo + vibración del RC.</td><td>Acción evasiva inmediata: descender al menos 30 m o salir del cuadrante.</td></tr>
        </tbody>
      </table>

      <div class="callout alerta">
        <strong>Limitaciones de AirSense — críticas para CTA</strong>
        <ul style="margin-top:6px;">
          <li>Solo recibe ADS-B de aeronaves equipadas con dispositivo ADS-B Out funcionando. Helicópteros y aviación general sin ADS-B no son detectados.</li>
          <li>Si hay un obstáculo entre tráfico y dron, el mensaje no se recibe.</li>
          <li>Puede haber retrasos por interferencia. Mantener observación visual permanente.</li>
          <li>NO reemplaza la coordinación con la dependencia ATC/AFIS competente.</li>
          <li>NO emite señal hacia las aeronaves tripuladas (es solo IN, no OUT).</li>
        </ul>
      </div>

      <h3>Sistema GEO (Geospatial Environment Online)</h3>
      <p>El sistema GEO de DJI proporciona información en tiempo real sobre restricciones de espacio aéreo. Las zonas se categorizan por colores y comportamientos:</p>

      <table class="tabla-curso">
        <thead><tr><th>Zona</th><th>Color</th><th>Comportamiento</th></tr></thead>
        <tbody>
          <tr><td>Restringida</td><td>Rojo</td><td>Vuelo prohibido. Motores no arrancan dentro. En vuelo: cuenta atrás 100 s → aterrizaje semiautomático.</td></tr>
          <tr><td>Autorización</td><td>Azul</td><td>Vuelo prohibido salvo desbloqueo previo registrado. Mismo comportamiento que restringida si se ingresa.</td></tr>
          <tr><td>Advertencia</td><td>Amarillo</td><td>Permite vuelo con notificación. Operador acepta el aviso.</td></tr>
          <tr><td>Advertencia reforzada</td><td>Naranja</td><td>Permite vuelo previa confirmación de la ruta de vuelo.</td></tr>
          <tr><td>Altitud restringida</td><td>Gris</td><td>Limita altitud de vuelo. Si excede con GNSS débil → fuerte: cuenta atrás 100 s → desciende.</td></tr>
        </tbody>
      </table>

      <h3>Espacios de seguridad</h3>
      <p>Alrededor de zonas restringidas y de autorización, el sistema GEO mantiene un <strong>buffer de 20 m</strong>. La aeronave no puede entrar a la zona desde fuera del buffer. Si despega dentro del buffer, sólo puede aterrizar en el mismo punto o volar en dirección opuesta a la zona. Una vez fuera, no puede regresar al buffer sin desbloqueo.</p>

      <h3>Procedimiento de desbloqueo</h3>
      <ol>
        <li>Acceder a <a href="https://fly-safe.dji.com" rel="noopener">fly-safe.dji.com</a>.</li>
        <li>Seleccionar tipo de desbloqueo: automático (zonas de autorización) o personalizado (operadores con AOC).</li>
        <li>Completar datos: número de teléfono verificado, área, fechas, motivo.</li>
        <li>Esperar aprobación.</li>
        <li>Sincronizar la licencia en DJI Pilot 2 (debe estar conectado a internet).</li>
        <li>Despegar dentro de la zona desbloqueada.</li>
      </ol>

      <h3>Límites máximos de vuelo</h3>
      <p>En DJI Pilot 2 se configuran límites adicionales por software:</p>
      <ul>
        <li><strong>Altitud máxima</strong>: por seguridad, configure ≤ 120 m AGL en cumplimiento DAN 151 Ed. 4 y normativa equivalente.</li>
        <li><strong>Distancia máxima</strong>: configure ≤ 500 m si opera VLOS, salvo autorización BVLOS específica.</li>
      </ul>

      <div class="callout">
        <strong>Responsabilidad final</strong>
        El sistema GEO es una herramienta de apoyo, NO una garantía legal. El operador es siempre responsable de cumplir la regulación aeronáutica local. Verifique fuentes oficiales (NOTAM, autoridades aeronáuticas) antes de cada vuelo en zonas sensibles.
      </div>
    </div>
  </section>

  <!-- ============ CASO PRÁCTICO ============ -->
  <section id="caso">
    <div class="caso-practico">
      <div class="header-caso">
        <div class="icono">CP</div>
        <h2 style="margin:0;border:none;">Caso práctico — Operación próxima a un aeródromo</h2>
      </div>

      <div class="escenario">
        <strong>Escenario operacional</strong>
        <p>Una aerolínea regional contrata su servicio de inspección aérea de un edificio terminal en un aeródromo no controlado en la zona sur de Chile. La operación requiere vuelo a 80 m sobre la cabecera de la pista (sin tráfico activo en ese momento) durante 25 minutos. La FATO está marcada como zona de autorización en el sistema GEO. Hay aviación general no comercial en la zona, no toda equipada con ADS-B. El AFIS de la dependencia opera en horario diurno y deben coordinarse las operaciones. El cliente requiere video continuo de las inspecciones.</p>
      </div>

      <strong>Preguntas guía</strong>
      <ul class="preguntas-caso">
        <li>Detalle el procedimiento completo de desbloqueo del sistema GEO.</li>
        <li>¿Qué coordinación operacional debe establecer con AFIS antes de la operación? ¿Qué documentación queda?</li>
        <li>¿En qué situaciones AirSense NO le alertará y cómo compensa esa limitación?</li>
        <li>¿Qué configuración de RPO emplea considerando la cercanía de la pista? Justifique altitud y modo.</li>
        <li>Si AirSense le marca una alerta de Advertencia con tráfico tripulado a 1 km, ¿cuál es su acción inmediata?</li>
      </ul>

      <details class="respuestas-modelo">
        <summary>Respuesta modelo</summary>
        <div style="padding:14px 6px;">
          <p><strong>Procedimiento de desbloqueo GEO:</strong> con anticipación de mínimo 7 días, ingresar a fly-safe.dji.com con la cuenta DJI verificada. Solicitar "Custom Unlock" especificando coordenadas exactas del aeródromo, ventana horaria de operación, motivo (inspección comercial bajo AOC), número de SN de la aeronave y datos del piloto a distancia (credencial DGAC). Adjuntar autorización del operador del aeródromo y carta de coordinación con AFIS. Una vez aprobado, sincronizar la licencia en DJI Pilot 2 con conexión a internet. Verificar el día de la operación que la licencia aparece como "ACTIVA" en la app.</p>
          <p><strong>Coordinación con AFIS:</strong> presentar plan operacional documentado al menos 72 horas antes con: identificación del operador y AOC, área de operación con coordenadas y altitud, fecha y horarios, contactos de emergencia. Solicitar NOTAM si la operación lo requiere por su naturaleza. El día de la operación, contacto radio con AFIS antes del despegue para activar la operación, e informar fin al aterrizar. Mantener radio operativa durante todo el vuelo. Documentar el contacto en bitácora de vuelo.</p>
          <p><strong>Limitaciones de AirSense:</strong> la aviación general sin ADS-B Out (común en aeronaves antiguas) NO será detectada. Tampoco helicópteros sin ADS-B. La compensación es múltiple: (1) observador dedicado con tarea exclusiva de barrido visual del cielo, (2) escucha activa de la frecuencia AFIS para detectar reportes de tráfico, (3) operación a altitud baja (80 m) que la mantiene fuera del corredor típico de aproximación, (4) operación con luz auxiliar y baliza encendidas para visibilidad recíproca aunque AirSense no detecte.</p>
          <p><strong>Configuración RPO:</strong> altitud RPO = 100 m (sobre la altitud operativa de 80 m, pero NO superior a la altura típica de aproximación de aeronaves a la pista, ≈ 150 m). Modo RPO = Preestablecido para evitar maniobras inesperadas dentro del cuadrante de pista. Punto de origen = posición exacta del operador en el área designada fuera de la cabecera. Acción ante pérdida de señal = RPO inmediato (no Hover, dado el riesgo en zona aeronáutica).</p>
          <p><strong>Acción ante alerta Advertencia:</strong> seguir las instrucciones de DJI Pilot 2 (descender o ascender). Dado contexto: descender inmediatamente a 30 m AGL para alejarse del corredor de tráfico. Comunicar por radio a AFIS la presencia del tráfico y la maniobra evasiva. Si la situación lo amerita, ejecutar RPO. Documentar el evento como ASR (Air Safety Report) y reportar a la DGAC dentro de 72 horas conforme DAN 151 Ed. 4.</p>
        </div>
      </details>
    </div>
  </section>

  

</main>



</body>
</html>
');

  -- Module 6
  INSERT INTO course_modules (course_id, sort_order, title, description)
  VALUES (v_course_id, 6, 'Módulo 6: Operaciones especializadas y misiones avanzadas', 'Misiones waypoint, operaciones térmicas, telémetro láser, PinPoint, mapeo fotogramétrico RTK, vuelo nocturno.')
  RETURNING id INTO v_module_id;
  INSERT INTO module_activities (module_id, sort_order, type, title, description)
  VALUES (v_module_id, 0, 'html', 'Contenido del módulo 6', '<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Módulo 6 — Operaciones especializadas · Matrice 4 Series · ENAE</title>
<link rel="stylesheet" href="https://enae.cl/cursos/matrice4/assets/curso.css">
</head>
<body>

<header class="header-curso">
  <div class="marca">ENAE — Curso Matrice 4 Series</div>
  <h1>Módulo 6 · Operaciones especializadas y misiones avanzadas</h1>
  <div class="subtitulo">Waypoint · Térmica · Telémetro · Mapeo RTK · Vuelo nocturno · 5 lecciones · 4 horas</div>
</header>



<main class="contenedor">

  <section class="bloque">
    <h2>Presentación del módulo</h2>
    <p>Las operaciones profesionales superan el simple "vuelo manual": exigen <strong>misiones automatizadas</strong>, capacidades especializadas (térmica, láser, fotogrametría) y dominio de condiciones operacionales complejas (vuelo nocturno, vuelo cerca de infraestructura energizada, mapeo de gran extensión). Este módulo entrega al operador las herramientas conceptuales y los protocolos para ejecutar cada uno de estos perfiles operacionales.</p>

    <div class="objetivos">
      <h3>Objetivos de aprendizaje</h3>
      <ul>
        <li>Planificar y ejecutar misiones waypoint con el flujo de DJI Pilot 2.</li>
        <li>Configurar y operar la cámara térmica con paletas, isotermas y radiometría.</li>
        <li>Aplicar el telémetro láser y la función PinPoint en escenarios operacionales reales.</li>
        <li>Diseñar misiones de mapeo fotogramétrico con M4E aprovechando el RTK.</li>
        <li>Operar de noche conforme a buenas prácticas y normativa DGAC.</li>
      </ul>
    </div>

    <div class="indice-leccion">
      <h4>Índice del módulo</h4>
      <ol>
        <li><a href="#l61">Lección 6.1 · Misiones waypoint y rutas inteligentes</a></li>
        <li><a href="#l62">Lección 6.2 · Operaciones térmicas con M4T</a></li>
        <li><a href="#l63">Lección 6.3 · Telémetro láser y PinPoint</a></li>
        <li><a href="#l64">Lección 6.4 · Mapeo fotogramétrico con M4E</a></li>
        <li><a href="#l65">Lección 6.5 · Operaciones nocturnas</a></li>
        <li><a href="#caso">Caso práctico aplicado</a></li>
      </ol>
    </div>
  </section>

  <!-- ============ LECCIÓN 6.1 ============ -->
  <section class="bloque" id="l61">
    <div class="leccion">
      <span class="etiqueta">Lección 6.1</span>
      <h2>Misiones waypoint y rutas inteligentes</h2>

      <p>Una <strong>misión waypoint</strong> es una secuencia de puntos programados con coordenadas, altitud, orientación de cámara y acciones específicas, que la aeronave ejecuta automáticamente. Permite repetibilidad, precisión y eficiencia operacional muy superiores al vuelo manual. DJI Pilot 2 soporta varios tipos de rutas inteligentes en su menú "Misión".</p>

      <h3>Tipos de rutas en DJI Pilot 2</h3>
      <table class="tabla-curso">
        <thead><tr><th>Tipo de ruta</th><th>Caso de uso</th></tr></thead>
        <tbody>
          <tr><td><strong>Waypoint</strong></td><td>Inspección punto a punto: torres, estructuras, infraestructura puntual.</td></tr>
          <tr><td><strong>Mapeo (Área)</strong></td><td>Levantamiento fotogramétrico de un polígono.</td></tr>
          <tr><td><strong>Mapeo Oblicuo</strong></td><td>Mapeo con cámara inclinada para modelos 3D urbanos.</td></tr>
          <tr><td><strong>Línea / Lineal</strong></td><td>Inspección de infraestructura lineal: líneas eléctricas, oleoductos, carreteras.</td></tr>
          <tr><td><strong>Follow Terrain</strong></td><td>Vuelo a altura constante AGL siguiendo el terreno (requiere DSM).</td></tr>
          <tr><td><strong>Live Mission Recording</strong></td><td>Grabar en vivo el vuelo y convertirlo en misión repetible.</td></tr>
          <tr><td><strong>Virtual Space Models</strong></td><td>Vuelo dentro de un modelo 3D pre-cargado para simulación.</td></tr>
        </tbody>
      </table>

      <h3>Flujo de creación de waypoint</h3>
      <ol>
        <li>Acceder a Misión → Nueva → Waypoint.</li>
        <li>Marcar puntos sobre el mapa o trasladando la aeronave físicamente y registrando posición.</li>
        <li>Para cada waypoint, configurar: altitud (AGL o ASL), heading, orientación del estabilizador, velocidad, acción al llegar (hover, foto, video, zoom).</li>
        <li>Configurar acciones de entrada/salida de misión: altitud de seguridad, comportamiento ante pérdida de señal, acción al final.</li>
        <li>Verificar elevation profile y posibles obstáculos (DJI Pilot 2 puede mostrar terreno relieve).</li>
        <li>Cargar la misión a la aeronave.</li>
        <li>Ejecutar: la aeronave despega automáticamente, vuela los waypoints y aterriza.</li>
      </ol>

      <h3>Ajustes recomendados por escenario</h3>
      <table class="tabla-curso">
        <thead><tr><th>Escenario</th><th>Velocidad</th><th>Altitud</th><th>Acción al WP</th></tr></thead>
        <tbody>
          <tr><td>Inspección torre eléctrica</td><td>3 m/s</td><td>30 m AGL relativo</td><td>Hover 8 s + foto + video</td></tr>
          <tr><td>Mapeo agrícola</td><td>10 m/s</td><td>120 m AGL constante</td><td>Foto continua intervalada</td></tr>
          <tr><td>Inspección lineal eléctrica</td><td>6 m/s</td><td>15 m sobre conductores</td><td>Video continuo + IR</td></tr>
          <tr><td>SAR cuadrícula</td><td>8 m/s</td><td>80 m AGL</td><td>Video térmico continuo</td></tr>
        </tbody>
      </table>

      <h3>Live Mission Recording</h3>
      <p>Permite "grabar" un vuelo manual y convertirlo en misión repetible. Útil para inspecciones recurrentes (un mismo edificio cada mes) o para simulacros. La grabación guarda waypoints automáticos cada vez que se toma una foto durante el vuelo manual.</p>

      <div class="callout">
        <strong>Buena práctica — pre-flight de misión</strong>
        Antes de ejecutar una misión waypoint, simular su ejecución en el visor 3D de DJI Pilot 2. Verificar visualmente que ningún waypoint quede dentro de la geometría de un edificio, árbol o ladera. La aeronave sigue exactamente lo programado: errores en planificación se traducen en colisiones reales.
      </div>
    </div>
  </section>

  <!-- ============ LECCIÓN 6.2 ============ -->
  <section class="bloque" id="l62">
    <div class="leccion">
      <span class="etiqueta">Lección 6.2</span>
      <h2>Operaciones térmicas con M4T</h2>

      <p>La cámara térmica del Matrice 4T entrega capacidades únicas para detección de calor, pero también exige conocimiento técnico para interpretar correctamente las imágenes y obtener datos válidos.</p>

      <h3>Conceptos fundamentales de termografía aérea</h3>
      <ul>
        <li><strong>Emisividad (ε):</strong> propiedad del material que indica cuánto irradia respecto a un cuerpo negro ideal. Acero pintado: 0.93. Cobre pulido: 0.05. Concreto: 0.92. Configurar correctamente la emisividad en DJI Pilot 2 para cada superficie.</li>
        <li><strong>Reflectividad:</strong> superficies metálicas brillantes reflejan la temperatura del cielo (típicamente −20 a −40 °C en cielo despejado), generando lecturas falsas frías.</li>
        <li><strong>Atmosférica:</strong> la atmósfera entre el dron y el objetivo absorbe radiación IR. El error a 30 m es despreciable, a 200 m puede ser 1–2 °C.</li>
        <li><strong>Radiometría:</strong> el sensor entrega temperatura por píxel (no solo intensidad). Activable en menú "Termal Settings".</li>
      </ul>

      <h3>Paletas térmicas</h3>
      <table class="tabla-curso">
        <thead><tr><th>Paleta</th><th>Aplicación recomendada</th></tr></thead>
        <tbody>
          <tr><td>White Hot</td><td>Estándar industrial, alto contraste, monocroma</td></tr>
          <tr><td>Black Hot</td><td>Inverso a White Hot, útil para SAR (cuerpo humano destaca como mancha oscura)</td></tr>
          <tr><td>Iron Red / Iron Bow</td><td>Multicroma alta-baja temperatura, intuitiva visualmente</td></tr>
          <tr><td>Hot Spot</td><td>Resalta la zona más caliente del cuadro como punto rojo. Ideal SAR rápida.</td></tr>
          <tr><td>Cold Spot</td><td>Resalta la zona más fría. Útil en detección de fugas frías (gas líquido).</td></tr>
          <tr><td>Tinted (Sepia)</td><td>Colorización suave con buen rango dinámico</td></tr>
        </tbody>
      </table>

      <h3>Modos de medición</h3>
      <ul>
        <li><strong>Spot meter:</strong> punto fijo en el cuadro reportando temperatura.</li>
        <li><strong>Box meter:</strong> rectángulo con temperatura mínima, máxima y promedio.</li>
        <li><strong>Isoterma:</strong> resaltar zonas dentro de un rango definido (por ejemplo: aislantes con T &gt; 80 °C aparecen en color sobre fondo neutro).</li>
        <li><strong>Trazado AOI:</strong> dibujar áreas de interés con métricas exportables al informe.</li>
      </ul>

      <h3>Calibración FFC (Flat Field Correction)</h3>
      <p>El sensor microbolométrico requiere calibración periódica para mantener uniformidad. Una pequeña cortina interna (shutter) bloquea momentáneamente el sensor para recalibrar. Suena un "click" característico cada cierto tiempo. Si la imagen muestra ruido fijo (líneas o patrones), forzar FFC manual desde el menú térmico.</p>

      <h3>Buenas prácticas de adquisición térmica</h3>
      <ul>
        <li>Volar perpendicular al objetivo (90°) para minimizar reflexión del cielo.</li>
        <li>Distancia 5–30 m para mejor resolución espacial térmica (≈ 5 cm/píxel a 30 m).</li>
        <li>Hover 8–15 s en cada punto crítico para estabilización térmica del sensor.</li>
        <li>Capturar simultáneamente RGB y IR (modo "RGB+IR Linked").</li>
        <li>Evitar volar con sol directo en lente — sobreexposición.</li>
        <li>NO apuntar nunca el sensor IR directo al sol o láser.</li>
      </ul>

      <div class="callout aviso">
        <strong>Ventana térmica óptima</strong>
        Para inspección eléctrica, la mejor ventana es <em>2 horas después del amanecer / antes del atardecer</em>: el delta térmico entre conexiones defectuosas y entorno es máximo, sin reflexión solar directa. Para SAR, el mejor momento es la noche o el amanecer, cuando la diferencia entre el cuerpo humano (~37 °C) y el ambiente (frío) es máxima.
      </div>
    </div>
  </section>

  <!-- ============ LECCIÓN 6.3 ============ -->
  <section class="bloque" id="l63">
    <div class="leccion">
      <span class="etiqueta">Lección 6.3</span>
      <h2>Telémetro láser y PinPoint</h2>

      <p>El <strong>telémetro láser</strong> es un sensor activo que emite un haz láser pulsado y mide el tiempo de vuelo del retorno reflejado, calculando la distancia precisa al objetivo. Permite la función <strong>PinPoint</strong>, una de las características distintivas de la Serie Matrice 4.</p>

      <h3>Especificaciones técnicas</h3>
      <div class="spec-grid">
        <div class="spec-card"><strong>Alcance máx</strong><span class="valor">1 800 m a 20 % reflectividad (1 Hz)</span></div>
        <div class="spec-card"><strong>Alcance oblicuo (1:5)</strong><span class="valor">600 m</span></div>
        <div class="spec-card"><strong>Zona ciega</strong><span class="valor">1 m</span></div>
        <div class="spec-card"><strong>Error sistemático</strong><span class="valor">&lt; 0.3 m</span></div>
        <div class="spec-card"><strong>Error aleatorio</strong><span class="valor">&lt; 0.1 m @ 1σ</span></div>
        <div class="spec-card"><strong>Clase láser</strong><span class="valor">Clase 1 — segura para vista humana</span></div>
      </div>

      <h3>Función PinPoint</h3>
      <p>PinPoint es la herramienta colaborativa que aprovecha el telémetro láser para georreferenciar puntos de interés con precisión decimétrica. El flujo es:</p>
      <ol>
        <li>Encuadrar el objetivo con el zoom apropiado.</li>
        <li>Activar el telémetro láser (botón personalizado o icono en pantalla).</li>
        <li>El láser mide la distancia y DJI Pilot 2 calcula coordenadas geodésicas (lat, lon, h).</li>
        <li>Se crea un PinPoint en el mapa con ID, coordenadas y nota.</li>
        <li>El PinPoint se sincroniza vía DJI FlightHub 2 con todos los usuarios conectados.</li>
        <li>El PinPoint queda como referencia para acciones (despacho de cuadrillas, repetición de inspección, registro de incidente).</li>
      </ol>

      <h3>Cinco aplicaciones operacionales reales del PinPoint</h3>
      <ol>
        <li><strong>SAR:</strong> al detectar un cuerpo o señal, marcar PinPoint y compartir con cuadrillas terrestres y aéreas para coordinar la extracción.</li>
        <li><strong>Inspección eléctrica:</strong> al detectar un punto caliente en una línea, georeferenciar para que la cuadrilla de mantenimiento sepa exactamente qué torre y qué pieza intervenir.</li>
        <li><strong>Investigación de incidentes:</strong> reconstruir la escena de un accidente con PinPoints sobre cada elemento crítico.</li>
        <li><strong>Operaciones tácticas:</strong> marcar puntos de interés en operativos policiales para coordinación de equipos.</li>
        <li><strong>Inspección forestal:</strong> georeferenciar focos de incendio y alimentar despacho aéreo de aviones cisterna.</li>
      </ol>

      <h3>Limitaciones operacionales</h3>
      <ul>
        <li>El láser es Clase 1 — seguro — pero NO apuntar a personas como buena práctica.</li>
        <li>Lluvia, niebla densa o nieve degradan el alcance (pueden reducirlo 50 % o más).</li>
        <li>Superficies muy oscuras y mate absorben el láser. Reflectividad &lt; 5 % puede no devolver señal.</li>
        <li>Superficies espejadas reflejan sin retornar — la lectura puede ser de un objeto detrás del espejo.</li>
        <li>La precisión de las coordenadas calculadas depende del FIX RTK + estabilizador. Sin RTK, error puede ser metros.</li>
      </ul>
    </div>
  </section>

  <!-- ============ LECCIÓN 6.4 ============ -->
  <section class="bloque" id="l64">
    <div class="leccion">
      <span class="etiqueta">Lección 6.4</span>
      <h2>Mapeo fotogramétrico con M4E</h2>

      <p>El Matrice 4E está diseñado específicamente para <strong>fotogrametría profesional</strong>. La combinación de su sensor 4/3" con apertura ajustable, módulo RTK integrado y procesamiento avanzado permite generar productos cartográficos con precisión centimétrica adecuada para topografía, ingeniería civil y mineral.</p>

      <h3>Misión de mapeo en DJI Pilot 2</h3>
      <ol>
        <li>Acceder a Misión → Mapeo → Área.</li>
        <li>Trazar el polígono del área a mapear sobre el mapa.</li>
        <li>Configurar parámetros: GSD objetivo, altitud (auto-calculada o manual), velocidad, solapamiento adelante/lateral, dirección de líneas de vuelo.</li>
        <li>Para mapeo oblicuo: configurar inclinación de cámara (típico 70°) y solapamiento más conservador.</li>
        <li>Verificar tiempo total estimado vs autonomía. La aeronave puede dividir misiones en múltiples vuelos automáticamente.</li>
        <li>Cargar y ejecutar.</li>
      </ol>

      <h3>Parámetros recomendados</h3>
      <table class="tabla-curso">
        <thead><tr><th>Producto</th><th>GSD</th><th>Altitud</th><th>Solapamiento (F/L)</th><th>Inclinación</th></tr></thead>
        <tbody>
          <tr><td>Topografía estándar</td><td>2 cm/px</td><td>≈ 80 m</td><td>80 % / 70 %</td><td>−90° (nadir)</td></tr>
          <tr><td>Topografía precisión</td><td>1 cm/px</td><td>≈ 40 m</td><td>85 % / 80 %</td><td>−90°</td></tr>
          <tr><td>Modelo 3D urbano</td><td>2 cm/px</td><td>≈ 80 m</td><td>80 % / 70 %</td><td>−70° oblicuo (5 vuelos)</td></tr>
          <tr><td>Mapeo agrícola</td><td>5 cm/px</td><td>≈ 200 m</td><td>75 % / 65 %</td><td>−90°</td></tr>
          <tr><td>Cubicación de acopio</td><td>1 cm/px</td><td>≈ 40 m</td><td>85 % / 75 %</td><td>−90° + oblicuo apoyo</td></tr>
        </tbody>
      </table>

      <h3>Buenas prácticas de adquisición</h3>
      <ul>
        <li>Garantizar FIX RTK sostenido durante todo el vuelo. Si se pierde, programar pausa automática.</li>
        <li>Iluminación uniforme: evitar mediodía con sombras duras. Mejor entre las 10:00 y 14:00 con cielo cubierto ligeramente nublado.</li>
        <li>Apertura f/4 a f/5.6 en el M4E para máxima nitidez (no usar f/2.8 ni f/11).</li>
        <li>ISO bajo (100–400) para minimizar ruido.</li>
        <li>Tiempo de obturación &lt; 1/1000 s para minimizar arrastre.</li>
        <li>Velocidad de vuelo ≤ 8 m/s para mapeo de alta precisión.</li>
        <li>Programar GCP (Ground Control Points) cada 800 m si la precisión exigida es topográfica catastral.</li>
        <li>Volar perpendicular y luego paralelo al norte verdadero para mejor reconstrucción.</li>
      </ul>

      <h3>Productos derivados</h3>
      <p>Las imágenes capturadas se procesan en software fotogramétrico (Pix4D, DroneDeploy, Bentley, Agisoft, Reality Capture) para generar:</p>
      <ul>
        <li><strong>Ortomosaico:</strong> imagen 2D georreferenciada a escala uniforme.</li>
        <li><strong>DSM:</strong> modelo digital de superficie con elevación de cada píxel.</li>
        <li><strong>DTM:</strong> modelo digital del terreno (sin vegetación ni edificios).</li>
        <li><strong>Nube de puntos:</strong> representación 3D de puntos georeferenciados.</li>
        <li><strong>Modelo 3D texturizado:</strong> malla con texturas para visualización.</li>
        <li><strong>Curvas de nivel:</strong> derivadas del DTM para planimetría.</li>
      </ul>

      <div class="callout">
        <strong>RTK vs PPK</strong>
        DJI Pilot 2 entrega imágenes con metadata de geolocalización RTK en tiempo real. Para precisión absoluta máxima, también se pueden post-procesar (PPK) los datos brutos GNSS de la aeronave con un servicio de corrección satelital, obteniendo precisión equivalente o superior. Discutir con el cliente si exige procesamiento PPK previo a la entrega.
      </div>
    </div>
  </section>

  <!-- ============ LECCIÓN 6.5 ============ -->
  <section class="bloque" id="l65">
    <div class="leccion">
      <span class="etiqueta">Lección 6.5</span>
      <h2>Operaciones nocturnas</h2>

      <p>La operación nocturna es uno de los grandes diferenciadores de la Serie Matrice 4 frente a otras plataformas: cámaras térmicas (M4T), luz NIR (M4T), seis lentes fisheye de baja luz para visión, y baliza visual de alta intensidad. Sin embargo, exige protocolos operacionales más estrictos.</p>

      <h3>Marco normativo de vuelo nocturno (Chile, DAN 151 Ed. 4)</h3>
      <p>El vuelo nocturno se considera operación especial y requiere autorización específica. El operador debe presentar:</p>
      <ul>
        <li>Plan operacional con análisis de riesgo nocturno específico.</li>
        <li>Documentación de la baliza visible a 5 km mínimo.</li>
        <li>Capacitación documentada del piloto en operación nocturna.</li>
        <li>Procedimientos de emergencia adaptados (RPO con altitud aumentada, observador con linterna, etc.).</li>
        <li>Coordinación con autoridades aeronáuticas locales y NOTAM si aplica.</li>
      </ul>

      <h3>Capacidades técnicas para vuelo nocturno</h3>
      <ul>
        <li><strong>Sistema de visión de baja luz:</strong> seis lentes fisheye con sensores especialmente diseñados para visión nocturna, permitiendo posicionamiento visual y evitación de obstáculos hasta condiciones casi totalmente oscuras.</li>
        <li><strong>Baliza superior:</strong> LED estroboscópico de alta intensidad visible a varios kilómetros — siempre encendida en operación nocturna.</li>
        <li><strong>Luz auxiliar inferior:</strong> proporciona iluminación al sistema de visión inferior para aterrizaje preciso en oscuridad.</li>
        <li><strong>Cámara térmica (M4T):</strong> opera independiente de la luz visible.</li>
        <li><strong>Luz NIR (M4T):</strong> ilumina objetivos para que las cámaras visibles entreguen imagen de calidad sin alertar al objetivo.</li>
      </ul>

      <h3>Limitaciones nocturnas</h3>
      <ul>
        <li>El operador tiene capacidad reducida de mantener VLOS — usar observador adicional con binoculares.</li>
        <li>APAS es menos efectivo en oscuridad total. Reducir velocidad operativa al 50 % de la diurna.</li>
        <li>Cables y obstáculos finos son menos detectables. Planificar rutas con margen de seguridad mayor.</li>
        <li>Las baterías rinden menos a baja temperatura. Reducir tiempo planificado de vuelo en 20–30 %.</li>
        <li>La concentración del piloto disminuye con fatiga nocturna. Limitar turnos a 4 horas máximo con relevo.</li>
      </ul>

      <h3>Procedimientos específicos nocturnos</h3>
      <ol>
        <li>Site survey diurno previo, marcando obstáculos y calculando rutas.</li>
        <li>Verificación del estado de iluminación: linternas, baliza, luz auxiliar.</li>
        <li>Ascenso vertical inicial a una altitud segura (≥ 60 m AGL) antes de cualquier desplazamiento horizontal.</li>
        <li>Operación a velocidad reducida (≤ 5 m/s) en zonas con obstáculos.</li>
        <li>RPO con altitud aumentada (≥ 30 m sobre el obstáculo más alto del área).</li>
        <li>Aterrizaje sobre punto con luz auxiliar (uso del sensor 3D infrarrojo y luz inferior).</li>
        <li>Comunicaciones radio constantes con observador y equipo de tierra.</li>
      </ol>

      <div class="callout exito">
        <strong>Capacidades únicas para SAR nocturno</strong>
        El M4T es la plataforma de elección para SAR nocturno. La paleta "Hot Spot" + cámara térmica detectan firma humana en bosque a 80 m AGL hasta varios cientos de metros. La luz NIR permite confirmar visualmente con cámara visible sin alertar. La función PinPoint con telémetro láser entrega coordenadas exactas a las cuadrillas terrestres en tiempo real.
      </div>
    </div>
  </section>

  <!-- ============ CASO PRÁCTICO ============ -->
  <section id="caso">
    <div class="caso-practico">
      <div class="header-caso">
        <div class="icono">CP</div>
        <h2 style="margin:0;border:none;">Caso práctico — Inspección termográfica de subestación</h2>
      </div>

      <div class="escenario">
        <strong>Escenario operacional</strong>
        <p>El operador del sistema interconectado central contrata su servicio para inspección termográfica de una subestación 220 kV/110 kV en operación, ubicada en zona pre-cordillerana. La inspección debe identificar conexiones defectuosas en transformadores principales (3), interruptores (12) y barras (4 m vertical, 30 m horizontal). La operación es diurna, en ventana de 2 horas tras el amanecer (delta térmico óptimo). El cliente requiere informe digital con: foto IR + RGB de cada anomalía, temperatura puntual y de referencia, coordenadas exactas y código del equipo afectado. La subestación está rodeada por línea de transmisión de 220 kV en operación.</p>
      </div>

      <strong>Preguntas guía</strong>
      <ul class="preguntas-caso">
        <li>Diseñe la misión waypoint para inspección sistemática. ¿Cuántos waypoints estima?</li>
        <li>¿Qué emisividad configura para acero galvanizado y para aisladores cerámicos? ¿Por qué importa?</li>
        <li>¿Qué paleta térmica usaría? ¿Qué configuración de isoterma propondría?</li>
        <li>¿Cómo aprovecha el PinPoint para georeferenciar cada hallazgo?</li>
        <li>¿Qué medidas de seguridad operacional especial adopta dada la subestación energizada?</li>
      </ul>

      <details class="respuestas-modelo">
        <summary>Respuesta modelo</summary>
        <div style="padding:14px 6px;">
          <p><strong>Diseño misión waypoint:</strong> 19 puntos primarios (3 transformadores × 4 caras = 12, 4 barras × 1 = 4, 12 interruptores en grupos de 4 caras = 3 puntos por grupo). Configurar cada waypoint con altitud relativa a 5 m sobre el equipo, hover de 12 s, captura simultánea RGB+IR (modo "Linked"), zoom automatizado a tele media (70 mm) para detalle, regresar al gran angular para vista contextual. Velocidad de vuelo entre WPs: 4 m/s. Total estimado de vuelo: 22–25 minutos por aeronave.</p>
          <p><strong>Emisividad:</strong> acero galvanizado nuevo ≈ 0.28 (alto reflectivo); acero pintado oxidado ≈ 0.95; aisladores cerámicos vidriados ≈ 0.93. La incorrecta configuración produce errores de 5–15 °C, suficiente para clasificar erróneamente una anomalía. Para subestación, configurar dos perfiles en DJI Pilot 2: uno para aisladores/transformadores (ε = 0.93), otro para conductores y conexiones (ε = 0.95). Aplicar en cada captura el perfil correcto desde menú térmico.</p>
          <p><strong>Paleta y isoterma:</strong> paleta Iron Red para vista global (intuitiva). Para análisis crítico, activar isoterma con rango definido: cualquier punto con T &gt; (Tref + 15 °C) se resalta en color brillante para detección visual rápida. Tref se calcula como temperatura promedio de la conexión sana de referencia. En transformadores, configurar área de medición sobre el bushing y usar Box meter con Tmin/Tmax/Tavg.</p>
          <p><strong>PinPoint:</strong> al detectar anomalía, activar telémetro láser apuntando al punto exacto. DJI Pilot 2 calcula coordenadas con FIX RTK. Crear PinPoint con código (ej. "T1-Bushing-A-Hot"), nota descriptiva con temperatura y fenómeno, captura RGB+IR como evidencia. Sincronizar vía FlightHub. Al final del vuelo, exportar lista de PinPoints como CSV para ingreso al informe.</p>
          <p><strong>Seguridad operacional:</strong> distancia mínima de 5 m a partes vivas energizadas (criterio NTSC SEC vigente). Verificar con el operador de la subestación que no haya descargas atmosféricas en el área (radar meteorológico previo). Mantener observador de seguridad eléctrica certificado en piso. NO operar en modo Sport (riesgo de inducción electromagnética en sensores). Configurar RPO con altitud 50 m (sobre torres de 30 m) y modo Preestablecido. Si pierde GNSS por interferencia magnética de la subestación, la aeronave debe entrar en hover por sistema de visión y el piloto extrae manualmente.</p>
        </div>
      </details>
    </div>
  </section>

  

</main>



</body>
</html>
');

  -- Module 7
  INSERT INTO course_modules (course_id, sort_order, title, description)
  VALUES (v_course_id, 7, 'Módulo 7: Mantenimiento, diagnóstico y certificación', 'Checklist pre y post vuelo, mantenimiento preventivo, actualización de firmware, troubleshooting y certificación C2.')
  RETURNING id INTO v_module_id;
  INSERT INTO module_activities (module_id, sort_order, type, title, description)
  VALUES (v_module_id, 0, 'html', 'Contenido del módulo 7', '<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Módulo 7 — Mantenimiento y certificación · Matrice 4 Series · ENAE</title>
<link rel="stylesheet" href="https://enae.cl/cursos/matrice4/assets/curso.css">
</head>
<body>

<header class="header-curso">
  <div class="marca">ENAE — Curso Matrice 4 Series</div>
  <h1>Módulo 7 · Mantenimiento, diagnóstico y certificación</h1>
  <div class="subtitulo">Pre y post vuelo · Mantenimiento · Firmware · Troubleshooting · 4 lecciones · 3 horas</div>
</header>



<main class="contenedor">

  <section class="bloque">
    <h2>Presentación del módulo</h2>
    <p>Una operación profesional sostenible requiere disciplina de mantenimiento. Este módulo aborda los <strong>checklists pre-vuelo y post-vuelo</strong>, las rutinas de mantenimiento preventivo, el procedimiento de actualización de firmware (vía DJI Pilot 2 y DJI Assistant 2), la metodología de troubleshooting y los aspectos de la certificación Clase C2 europea, AESA y normativa chilena DAN 151.</p>

    <div class="objetivos">
      <h3>Objetivos de aprendizaje</h3>
      <ul>
        <li>Ejecutar checklist pre-vuelo y post-vuelo con criterio profesional.</li>
        <li>Implementar un programa de mantenimiento preventivo basado en horas de vuelo y ciclos.</li>
        <li>Actualizar firmware de aeronave y RC vía DJI Pilot 2 y vía DJI Assistant 2.</li>
        <li>Aplicar metodología de troubleshooting ante fallos comunes.</li>
        <li>Comprender los requisitos de certificación C2 y geo-consciencia.</li>
        <li>Cumplir con disposición de residuos electrónicos y baterías.</li>
      </ul>
    </div>

    <div class="indice-leccion">
      <h4>Índice del módulo</h4>
      <ol>
        <li><a href="#l71">Lección 7.1 · Listas de comprobación pre y post vuelo</a></li>
        <li><a href="#l72">Lección 7.2 · Mantenimiento preventivo programado</a></li>
        <li><a href="#l73">Lección 7.3 · Actualización de firmware</a></li>
        <li><a href="#l74">Lección 7.4 · Troubleshooting y registrador de vuelo</a></li>
        <li><a href="#caso">Caso práctico aplicado</a></li>
      </ol>
    </div>
  </section>

  <!-- ============ LECCIÓN 7.1 ============ -->
  <section class="bloque" id="l71">
    <div class="leccion">
      <span class="etiqueta">Lección 7.1</span>
      <h2>Listas de comprobación pre y post vuelo</h2>

      <h3>Checklist pre-vuelo (formato profesional)</h3>
      <p>El checklist debe estar disponible en formato físico (laminado) y digital. Cada operador firma su ejecución antes del despegue:</p>

      <table class="tabla-curso">
        <thead><tr><th>#</th><th>Ítem</th><th>Criterio</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Documentación</td><td>Credencial piloto vigente · tarjeta de registro DGAC · AOC/permiso</td></tr>
          <tr><td>2</td><td>Coordinación</td><td>Permisos GEO sincronizados · NOTAM consultado · ATC notificado si aplica</td></tr>
          <tr><td>3</td><td>Meteorología</td><td>Viento &lt; 12 m/s · sin precipitación · visibilidad &gt; 5 km · Tº dentro de rango</td></tr>
          <tr><td>4</td><td>Aeronave — estructura</td><td>Brazos plegados/desplegados sin daño · sin fisuras visibles</td></tr>
          <tr><td>5</td><td>Aeronave — hélices</td><td>Mismo modelo · sin daño · montadas correctamente con clic</td></tr>
          <tr><td>6</td><td>Aeronave — sensores</td><td>Lentes limpios · sin pegatinas · sin condensación · sin obstrucciones</td></tr>
          <tr><td>7</td><td>Aeronave — estabilizador</td><td>Protector RETIRADO · libre de obstrucciones · gimbal sin daño</td></tr>
          <tr><td>8</td><td>Aeronave — batería</td><td>≥ 90 % carga · clic audible al insertar · LEDs verdes · temperatura adecuada</td></tr>
          <tr><td>9</td><td>RC — batería</td><td>≥ 80 % carga · LED verde fijo</td></tr>
          <tr><td>10</td><td>RC — antenas</td><td>Levantadas y orientadas hacia área de operación</td></tr>
          <tr><td>11</td><td>Vinculación</td><td>RC y aeronave conectados · LEDs verdes</td></tr>
          <tr><td>12</td><td>Firmware</td><td>Aeronave, RC y DJI Pilot 2 versión más reciente</td></tr>
          <tr><td>13</td><td>Calibración</td><td>Brújula OK · IMU OK · vision OK</td></tr>
          <tr><td>14</td><td>GNSS / RTK</td><td>≥ 12 satélites · RTK FIX si misión lo requiere</td></tr>
          <tr><td>15</td><td>Configuración</td><td>Modo N · altitud máx · distancia máx · altitud RPO · acción pérdida señal</td></tr>
          <tr><td>16</td><td>Selector</td><td>Modo de vuelo en N</td></tr>
          <tr><td>17</td><td>Área operación</td><td>Despejada 5 m · piloto orientado a cola · observador en posición</td></tr>
          <tr><td>18</td><td>Plan misión</td><td>Cargado · revisado en 3D · sin colisiones planificadas</td></tr>
          <tr><td>19</td><td>Comunicaciones</td><td>Radio operativa · contactos de emergencia disponibles</td></tr>
          <tr><td>20</td><td>Anuncio</td><td>Despegue anunciado al equipo · "Going up"</td></tr>
        </tbody>
      </table>

      <h3>Checklist post-vuelo</h3>
      <table class="tabla-curso">
        <thead><tr><th>#</th><th>Ítem</th><th>Acción</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Aeronave aterrizada</td><td>Confirmar contacto firme con suelo · cortar motores</td></tr>
          <tr><td>2</td><td>Apagado</td><td>Apagar primero la aeronave · luego el RC</td></tr>
          <tr><td>3</td><td>Inspección visual</td><td>Hélices · estabilizador · estructura · sensores</td></tr>
          <tr><td>4</td><td>Estado de batería</td><td>Esperar 15–20 min antes de manipular o cargar</td></tr>
          <tr><td>5</td><td>Temperatura motores</td><td>NO tocar inmediatamente — riesgo de quemadura</td></tr>
          <tr><td>6</td><td>Almacenamiento</td><td>Recolocar protector estabilizador · plegar brazos · guardar en bolsa</td></tr>
          <tr><td>7</td><td>Datos</td><td>Extraer microSD · respaldar capturas · revisar bitácora vuelo</td></tr>
          <tr><td>8</td><td>Bitácora</td><td>Anotar: hora despegue/aterrizaje · número vuelo del ciclo · ciclos batería · incidencias</td></tr>
          <tr><td>9</td><td>Reporte</td><td>Reportar cualquier anomalía mecánica o electrónica al responsable de mantenimiento</td></tr>
          <tr><td>10</td><td>ASR</td><td>Si hubo evento de seguridad, redactar Air Safety Report</td></tr>
        </tbody>
      </table>

      <div class="callout">
        <strong>Cultura de checklist</strong>
        El checklist no es opcional ni reemplazable por experiencia. Investigaciones de Boeing, Airbus y DGAC muestran que la inmensa mayoría de los accidentes son atribuibles a omisión de un ítem cubierto en el checklist estándar. La firma del checklist es trazabilidad legal.
      </div>
    </div>
  </section>

  <!-- ============ LECCIÓN 7.2 ============ -->
  <section class="bloque" id="l72">
    <div class="leccion">
      <span class="etiqueta">Lección 7.2</span>
      <h2>Mantenimiento preventivo programado</h2>

      <p>El mantenimiento preventivo se basa en <strong>tres ejes</strong>: por horas de vuelo, por ciclos de batería y por tiempo calendario. Un programa estructurado es requisito de cumplimiento DAN 151 para AOCs y prolonga la vida útil del equipo.</p>

      <h3>Programa recomendado</h3>
      <table class="tabla-curso">
        <thead><tr><th>Frecuencia</th><th>Tarea</th></tr></thead>
        <tbody>
          <tr><td>Antes de cada vuelo</td><td>Checklist pre-vuelo completo</td></tr>
          <tr><td>Después de cada vuelo</td><td>Checklist post-vuelo · limpieza superficial · revisión hélices</td></tr>
          <tr><td>Cada 10 horas de vuelo</td><td>Limpieza profunda lentes y sensores · revisión motor (sonido, libertad)</td></tr>
          <tr><td>Cada 25 horas de vuelo</td><td>Calibración IMU y brújula completa · revisión bandas batería · prueba RPO en zona segura</td></tr>
          <tr><td>Cada 50 horas de vuelo</td><td>Revisión visual interna por personal autorizado · revisión gimbal · firmware</td></tr>
          <tr><td>Cada 100 horas de vuelo</td><td>Servicio profesional certificado DJI · diagnóstico completo</td></tr>
          <tr><td>Cada 50 ciclos batería</td><td>Test de capacidad · verificar pérdida &lt; 80 % capacidad nominal</td></tr>
          <tr><td>Cada 3 meses</td><td>Carga y descarga completa de baterías sin uso · firmware DJI Pilot 2</td></tr>
          <tr><td>Cada 12 meses</td><td>Revisión integral por DJI o servicio autorizado · informe a DGAC</td></tr>
        </tbody>
      </table>

      <h3>Almacenamiento</h3>
      <ul>
        <li>Almacenar en lugar fresco y seco, libre de polvo, temperatura 22–28 °C.</li>
        <li>Baterías al 50 % de carga si almacenamiento prolongado &gt; 10 días.</li>
        <li>Caja rígida transporte original o equivalente con protección anti-impacto.</li>
        <li>Bolsas anti-incendio LiPo Guard para batería.</li>
        <li>Estabilizador con protector instalado.</li>
        <li>NO almacenar con baterías insertadas en la aeronave por períodos prolongados.</li>
      </ul>

      <h3>Limpieza</h3>
      <ul>
        <li><strong>Cuerpo de la aeronave:</strong> paño de microfibra húmedo. NO usar alcohol, solventes ni limpiadores agresivos.</li>
        <li><strong>Lentes y sensores ópticos:</strong> kit de limpieza de óptica fotográfica. Aplicar limpiador específico solo sobre el paño, no directamente sobre el lente.</li>
        <li><strong>Hélices:</strong> paño suave seco. Si hay residuos, paño húmedo con agua, secar inmediatamente.</li>
        <li><strong>Conectores:</strong> aire comprimido (no por boca). Mantener secos. NO usar lubricantes.</li>
        <li><strong>Tras vuelo en arena/desierto:</strong> aire comprimido en motores, ventiladores y conectores antes de almacenar.</li>
      </ul>

      <div class="callout aviso">
        <strong>Bitácora de mantenimiento</strong>
        Llevar una bitácora individual por aeronave (digital o física) donde se registren: cada vuelo (fecha, duración, piloto, observaciones), cada mantenimiento ejecutado (tarea, fecha, responsable), cada incidente, cada actualización de firmware. La bitácora es exigible por DGAC en una auditoría.
      </div>
    </div>
  </section>

  <!-- ============ LECCIÓN 7.3 ============ -->
  <section class="bloque" id="l73">
    <div class="leccion">
      <span class="etiqueta">Lección 7.3</span>
      <h2>Actualización de firmware</h2>

      <p>El firmware integra mejoras de seguridad, correcciones de bugs y nuevas funcionalidades. DJI publica firmware periódicamente para la Serie Matrice 4. La actualización es <strong>obligatoria</strong> para mantener el cumplimiento del manual y la cobertura de garantía.</p>

      <h3>Vía DJI Pilot 2 (recomendado)</h3>
      <ol>
        <li>Encender aeronave y RC, vinculados.</li>
        <li>Conectar el RC a internet (WiFi o nano-SIM).</li>
        <li>Abrir DJI Pilot 2 → si hay actualización disponible aparece notificación.</li>
        <li>Pulsar "Actualizar todo" — el sistema descarga, transfiere a la aeronave y aplica.</li>
        <li>NO desconectar ni apagar durante el proceso (5–15 minutos).</li>
        <li>Reiniciar ambos dispositivos al finalizar.</li>
        <li>Verificar éxito en menú Acerca de → Versiones de firmware.</li>
      </ol>

      <h3>Actualización de firmware sin conexión</h3>
      <p>Cuando no hay internet en el sitio, descargar el archivo en un PC, copiarlo al RC vía USB y aplicar. Útil para operaciones remotas o ambientes seguros (industria sensible, defensa).</p>

      <h3>Vía DJI Assistant 2 (Enterprise Series)</h3>
      <p>Software para PC que permite actualización avanzada, descarga de bitácoras y diagnóstico:</p>
      <ol>
        <li>Descargar DJI Assistant 2 (Enterprise Series) desde dji.com/downloads/softwares/assistant-dji-2-for-matrice.</li>
        <li>Conectar la aeronave (apagada) al PC vía USB-C.</li>
        <li>Encender la aeronave y abrir Assistant 2.</li>
        <li>Iniciar sesión con cuenta DJI.</li>
        <li>Seleccionar firmware deseado y aplicar.</li>
        <li>Mantener conexión hasta confirmación de éxito.</li>
        <li>Repetir para el RC.</li>
      </ol>

      <div class="callout alerta">
        <strong>Reglas críticas — actualización firmware</strong>
        <ul style="margin-top:6px;">
          <li>NUNCA interrumpir una actualización en curso (puede dejar el equipo "bricked").</li>
          <li>Aeronave y RC deben tener ≥ 50 % de batería antes de iniciar.</li>
          <li>Actualizar primero la aeronave, luego el RC, luego DJI Pilot 2.</li>
          <li>Tras actualización, ejecutar calibración de brújula e IMU como precaución.</li>
          <li>Una falla de firmware en LED amarillo fijo del RC requiere intervención del soporte DJI.</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- ============ LECCIÓN 7.4 ============ -->
  <section class="bloque" id="l74">
    <div class="leccion">
      <span class="etiqueta">Lección 7.4</span>
      <h2>Troubleshooting y registrador de vuelo</h2>

      <h3>Metodología profesional de diagnóstico</h3>
      <ol>
        <li><strong>Reproducir el problema:</strong> documentar exactamente cuándo y cómo ocurre.</li>
        <li><strong>Aislar variables:</strong> probar con otra batería, otro RC, otra microSD.</li>
        <li><strong>Revisar firmware:</strong> verificar que todos los componentes estén en la versión más reciente.</li>
        <li><strong>Calibrar:</strong> ejecutar calibración de brújula, IMU y gimbal desde DJI Pilot 2.</li>
        <li><strong>Revisar logs:</strong> descargar bitácora de vuelo desde Assistant 2.</li>
        <li><strong>Consultar:</strong> base de conocimientos DJI, foros oficiales, soporte técnico.</li>
        <li><strong>Reportar:</strong> si requiere intervención, abrir caso con número de serie, logs y video.</li>
      </ol>

      <h3>Fallos comunes y resolución</h3>

      <table class="tabla-curso">
        <thead><tr><th>Síntoma</th><th>Causa probable</th><th>Acción</th></tr></thead>
        <tbody>
          <tr>
            <td>No arranca motores</td>
            <td>Zona GEO restringida; batería baja; brújula no calibrada</td>
            <td>Revisar mensaje en DJI Pilot 2; comprobar zona; calibrar</td>
          </tr>
          <tr>
            <td>Brújula con interferencia</td>
            <td>Estructura metálica cerca; magnéticos; calibración antigua</td>
            <td>Despegar lejos de metales; recalibrar; mover punto despegue</td>
          </tr>
          <tr>
            <td>Pérdida de FIX RTK</td>
            <td>Pérdida 4G/WiFi; cambio de celda; obstrucción radio</td>
            <td>Verificar conectividad; ajustar D-RTK más cerca; reactivar</td>
          </tr>
          <tr>
            <td>APAS no funciona</td>
            <td>Baja luz / alta luz; superficies sin textura; modo Sport</td>
            <td>Cambiar a Normal; ajustar altitud; aumentar iluminación</td>
          </tr>
          <tr>
            <td>Tiempo de vuelo bajo</td>
            <td>Batería envejecida; baja temperatura; alta altitud; viento</td>
            <td>Test de capacidad; reemplazo batería &gt; 400 ciclos o &lt; 80 %</td>
          </tr>
          <tr>
            <td>Imagen térmica con líneas</td>
            <td>FFC pendiente</td>
            <td>Ejecutar FFC manual desde menú térmico</td>
          </tr>
          <tr>
            <td>Pantalla RC no enciende</td>
            <td>Batería interna agotada; problema firmware</td>
            <td>Cargar 30 min; mantener encendido 10 s; consultar soporte</td>
          </tr>
          <tr>
            <td>Estabilizador con error</td>
            <td>Bloqueo mecánico al despegue; protector puesto</td>
            <td>Apagar; retirar obstrucción/protector; encender en superficie plana</td>
          </tr>
          <tr>
            <td>Pérdida de transmisión</td>
            <td>Distancia excesiva; interferencia 2.4/5.8 GHz; antenas mal orientadas</td>
            <td>Reorientar antenas; reducir distancia; cambiar canal en Pilot 2</td>
          </tr>
          <tr>
            <td>Aeronave deriva en hover</td>
            <td>Visión deshabilitada; GNSS débil; viento; calibración pendiente</td>
            <td>Recalibrar IMU/brújula; volar en espacio abierto; verificar Pilot 2</td>
          </tr>
        </tbody>
      </table>

      <h3>Registrador de vuelo</h3>
      <p>Cada vuelo queda registrado en el <strong>flight log</strong> interno con telemetría detallada: posición, velocidades, altitud, comandos del RC, estado de batería, alertas y eventos. El log es la herramienta forense para investigar cualquier incidente.</p>
      <ul>
        <li>Acceso al log: DJI Pilot 2 → Mi álbum → Flight Records, o vía DJI Assistant 2.</li>
        <li>Exportable como CSV o KML.</li>
        <li>Sincronización automática con cuenta DJI si está activado.</li>
        <li>El log debe conservarse durante 6 meses como mínimo (cumplimiento DGAC).</li>
        <li>En caso de incidente, NO borrar el log antes de la investigación.</li>
      </ul>

      <h3>Riesgos y advertencias</h3>
      <p>El manual oficial DJI lista los siguientes riesgos a comunicar al usuario final del servicio:</p>
      <ul>
        <li>Riesgo de daño físico por contacto con hélices en movimiento.</li>
        <li>Riesgo de incendio o explosión por mal manejo de baterías de litio.</li>
        <li>Riesgo de quemadura por contacto con motores tras vuelo prolongado.</li>
        <li>Riesgo de daño por rayo láser del telémetro (Clase 1, pero no apuntar a personas).</li>
        <li>Riesgo de pérdida de control por interferencias electromagnéticas no anticipadas.</li>
        <li>Riesgo de colisión por exceso de confianza en sistemas de detección.</li>
      </ul>

      <h3>Eliminación y reciclaje</h3>
      <p>Las baterías y componentes electrónicos NO deben desecharse en la basura doméstica. Cumpliendo con normativa ambiental (Ley REP en Chile, RAEE en UE), entregar en puntos limpios autorizados o devolver al fabricante. Las baterías agotadas se descargan en agua salina por 24 horas antes de su entrega como medida adicional de seguridad.</p>

      <div class="callout exito">
        <strong>Certificación Clase C2 — implicancias</strong>
        El Matrice 4 cumple con marcado Clase C2 europeo. Esto implica: identificación remota directa activa, geo-consciencia con base de datos de zonas GEO actualizable, transmisión de datos del operador requeridos por reglamento, modo Baja velocidad disponible (2.8 m/s para vuelo cerca de personas), MTOW &lt; 4 kg. Las advertencias del control remoto sobre sobrevuelo de personas no involucradas son obligatorias y NO deben deshabilitarse. El operador es responsable de cumplir con los requerimientos AESA y DAN 151 según jurisdicción.
      </div>
    </div>
  </section>

  <!-- ============ CASO PRÁCTICO ============ -->
  <section id="caso">
    <div class="caso-practico">
      <div class="header-caso">
        <div class="icono">CP</div>
        <h2 style="margin:0;border:none;">Caso práctico — Investigación post-incidente</h2>
      </div>

      <div class="escenario">
        <strong>Escenario operacional</strong>
        <p>Durante una operación de inspección de líneas eléctricas en zona rural, un Matrice 4T del servicio de su consultora colisiona contra un cable telefónico no documentado en cartografía y cae en un campo. La aeronave queda dañada (estabilizador roto, una hélice destruida), pero la batería intacta. El piloto activó RPO de seguridad después de la colisión pero no respondió. El propietario del terreno colabora identificando el sitio. La DGAC requiere informe del incidente en 72 horas conforme DAN 151 Ed. 4. Su rol como Jefe de Operaciones de la consultora es liderar la investigación y producir el reporte.</p>
      </div>

      <strong>Preguntas guía</strong>
      <ul class="preguntas-caso">
        <li>¿Cuál es la secuencia de acciones inmediatas tras conocer el incidente?</li>
        <li>¿Cómo recupera y preserva la información del registrador de vuelo?</li>
        <li>¿Qué metodología de troubleshooting aplica para identificar causas raíz (técnicas y operacionales)?</li>
        <li>¿Qué información debe incluir el reporte a DGAC y qué medidas correctivas propondría?</li>
        <li>¿Cómo procede con la batería tras una colisión? ¿Qué riesgos especiales considera?</li>
      </ul>

      <details class="respuestas-modelo">
        <summary>Respuesta modelo</summary>
        <div style="padding:14px 6px;">
          <p><strong>Secuencia inmediata:</strong> (1) confirmar que no hay personas heridas; (2) asegurar el sitio con cinta de seguridad; (3) NO mover la aeronave sin documentación fotográfica completa de la posición y entorno; (4) documentar GPS exacto, altura aproximada del cable colisionado, condición meteorológica al momento; (5) testimoniar al piloto en escrito mientras los detalles son frescos; (6) notificar a DGAC dentro de 24 horas conforme DAN 151 (notificación inicial); (7) notificar al cliente y al propietario del cable telefónico; (8) iniciar registro fotográfico forense con escala.</p>
          <p><strong>Recuperación del flight log:</strong> antes de mover la batería, verificar si el RC mantiene conexión (probable: aeronave apagada). Trasladar la microSD de la aeronave a un PC limpio y respaldar todo. Conectar la aeronave a DJI Assistant 2 con la batería integral si es seguro: descargar el flight log completo. Sincronizar logs con cuenta DJI. NO borrar ni sobrescribir nada hasta que el reporte oficial esté entregado. Custodia digital con hash SHA-256 para integridad.</p>
          <p><strong>Troubleshooting causa raíz:</strong> el flight log mostrará la trayectoria, los inputs del piloto, el estado de los sistemas y los mensajes de alarma. Análisis de causa raíz por categorías: (a) técnica — ¿el sistema de detección debería haber visto el cable? Cable telefónico típicamente &gt; 10 mm: dentro de capacidad de detección a velocidades &lt; 15 m/s. ¿Cuál era la velocidad? ¿Iluminación adecuada? ¿APAS activo? (b) operacional — ¿el cable estaba en cartografía? ¿Hubo site survey previo? ¿El piloto fue informado? ¿La altitud planificada era adecuada? ¿Se respetó VLOS? (c) humana — ¿fatiga del piloto? ¿Distracción? ¿Modo de vuelo correcto?</p>
          <p><strong>Reporte DGAC:</strong> el formato ASR (Air Safety Report) debe incluir: identificación del operador y AOC; identificación de la aeronave (matrícula DGAC, SN, horas vuelo, ciclos batería); identificación del piloto (credencial); fecha, hora, lugar exacto, condición meteo; secuencia de eventos detallada; análisis de causa raíz; daños materiales y a terceros; medidas correctivas propuestas; cronograma de implementación; documentación adjunta (logs, fotos, testimonio piloto). Medidas correctivas propuestas: actualizar cartografía con cable telefónico georreferenciado; re-entrenamiento del piloto en altitudes mínimas en zonas con infraestructura no documentada; procedimiento adicional de site survey con LIDAR cuando aplique; revisión de checklist pre-vuelo agregando ítem de verificación de cartografía con propietarios locales.</p>
          <p><strong>Manejo de batería tras colisión:</strong> ASUMIR DAÑO INTERNO incluso si exteriormente está intacta. Riesgo de fuga térmica retardada. Procedimiento: aislar la batería en bolsa anti-incendio LiPo dentro de contenedor metálico abierto en zona ventilada al exterior. Monitorear temperatura cada 30 min durante 4 horas. Si presenta hinchazón, calor anómalo o humo, evacuar y llamar a Bomberos. NO recargar nunca. Para descarte: descargar en agua salina (5 % NaCl) por 24 horas, luego entregar a punto limpio autorizado. Documentar el procedimiento como evidencia.</p>
        </div>
      </details>
    </div>
  </section>

  

</main>



</body>
</html>
');

  -- Final exam module
  INSERT INTO course_modules (course_id, sort_order, title, description)
  VALUES (v_course_id, 8, 'Examen final integrador', '70 preguntas selección múltiple sobre los 7 módulos. Aprobación: 70%.')
  RETURNING id INTO v_module_id;
  INSERT INTO module_activities (module_id, sort_order, type, title, description)
  VALUES (v_module_id, 0, 'exam', 'Examen final · Curso Matrice 4 Series', 'Banco de 70 preguntas. 90 minutos recomendados. Aprobación 70%.')
  RETURNING id INTO v_activity_id;
  -- Grade item (one for the final exam → unlocks auto-diploma flow)
  INSERT INTO grade_items (course_id, sort_order, name, weight)
  VALUES (v_course_id, 0, 'Modulo 8: Examen final integrador', 100)
  RETURNING id INTO v_grade_item_id;

  INSERT INTO exams (activity_id, time_limit_minutes, passing_score, max_attempts, shuffle_questions, is_final_exam, grade_item_id)
  VALUES (v_activity_id, 90, 70, 3, true, true, v_grade_item_id)
  RETURNING id INTO v_exam_id;

  -- 70 exam questions
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 1, 'multiple_choice', '¿Cuál es la diferencia óptica fundamental entre el Matrice 4T y el Matrice 4E?', '[{"label": "A", "text": "Solo el M4T tiene telémetro láser."}, {"label": "B", "text": "Solo el M4T tiene cámara térmica y luz NIR; el M4E reemplaza la gran angular por sensor 4/3\" con apertura ajustable."}, {"label": "C", "text": "Solo el M4E tiene telémetro láser y módulo RTK."}, {"label": "D", "text": "El M4T y el M4E son ópticamente idénticos; difieren solo en el control remoto."}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 2, 'multiple_choice', '¿Cuál es la edición vigente de la norma chilena que regula las operaciones de RPAS al momento del curso?', '[{"label": "A", "text": "DAN 151 Edición 2 (2018)"}, {"label": "B", "text": "DAN 151 Edición 3 (2023)"}, {"label": "C", "text": "DAN 151 Edición 4 (mayo 2024)"}, {"label": "D", "text": "DAN 151 Edición 5 (2026)"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 3, 'multiple_choice', 'El peso máximo de despegue (MTOW) del Matrice 4 con hélices estándar es:', '[{"label": "A", "text": "980 g"}, {"label": "B", "text": "1 420 g"}, {"label": "C", "text": "2 300 g"}, {"label": "D", "text": "3 950 g"}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 4, 'multiple_choice', 'Conforme la DAN 151 Ed. 4, la altura máxima estándar de operación de RPAS sobre el suelo es:', '[{"label": "A", "text": "60 m AGL"}, {"label": "B", "text": "90 m AGL"}, {"label": "C", "text": "120 m AGL"}, {"label": "D", "text": "200 m AGL"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 5, 'multiple_choice', 'Para una operación de cubicación de mineral en mina abierta con precisión topográfica de 5 cm, ¿qué modelo de la Serie Matrice 4 es la elección óptima?', '[{"label": "A", "text": "Matrice 4E con configuración RTK FIX"}, {"label": "B", "text": "Matrice 4T con cámara térmica"}, {"label": "C", "text": "Cualquiera, indistintamente"}, {"label": "D", "text": "Ninguno alcanza esa precisión"}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 6, 'multiple_choice', '¿Cuál es la temperatura operativa estándar del producto según el manual oficial DJI?', '[{"label": "A", "text": "0 °C a 35 °C"}, {"label": "B", "text": "−5 °C a 50 °C"}, {"label": "C", "text": "−20 °C a 50 °C"}, {"label": "D", "text": "−10 °C a 40 °C"}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 7, 'multiple_choice', 'El sistema GEO de DJI clasifica las zonas con un código de color. ¿Qué representa una zona ROJA?', '[{"label": "A", "text": "Zona de advertencia: la aeronave puede volar con notificación."}, {"label": "B", "text": "Zona de altitud restringida."}, {"label": "C", "text": "Zona restringida: vuelo prohibido; los motores no arrancan dentro."}, {"label": "D", "text": "Zona de autorización: vuelo permitido tras desbloqueo."}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 8, 'multiple_choice', 'La certificación europea Clase C2 implica, entre otros requisitos:', '[{"label": "A", "text": "Altura máxima de 60 m AGL únicamente."}, {"label": "B", "text": "Identificación remota directa, geo-consciencia y disponibilidad de modo Baja velocidad."}, {"label": "C", "text": "Operación BVLOS sin restricciones."}, {"label": "D", "text": "No requiere licencia del operador."}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 9, 'multiple_choice', '¿Cuál es el rango de constelaciones GNSS soportado por el Matrice 4 Series?', '[{"label": "A", "text": "GPS L1/L2 + Galileo + BeiDou + QZSS"}, {"label": "B", "text": "Solo GPS L1"}, {"label": "C", "text": "Solo GPS y Galileo"}, {"label": "D", "text": "GLONASS y BeiDou solamente"}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 10, 'multiple_choice', 'Bajo DAN 151 Ed. 4, el operador de RPAS comercial requiere para volar profesionalmente:', '[{"label": "A", "text": "Solo registrarse en la web de DJI."}, {"label": "B", "text": "Únicamente cumplir los 18 años."}, {"label": "C", "text": "Tener un AOC pero no requiere credencial."}, {"label": "D", "text": "Credencial de Piloto a Distancia, tarjeta de registro de aeronave y autorización de operación (AOC)."}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 11, 'multiple_choice', 'En la nomenclatura DJI, los LEDs frontales en rojo fijo cuando la aeronave está encendida pero los motores no funcionan, indican:', '[{"label": "A", "text": "Falla crítica del sistema."}, {"label": "B", "text": "Modo Sport activo."}, {"label": "C", "text": "Orientación de la aeronave (referencia visual del frente)."}, {"label": "D", "text": "Error de calibración de la brújula."}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 12, 'multiple_choice', '¿En qué situación las hélices de bajo ruido son obligatorias por defecto?', '[{"label": "A", "text": "En todas las operaciones nocturnas."}, {"label": "B", "text": "En aeronaves comercializadas en la Unión Europea."}, {"label": "C", "text": "En operaciones con cámara térmica activa."}, {"label": "D", "text": "Solo cuando la altitud sobrepasa los 100 m AGL."}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 13, 'multiple_choice', 'El sistema de visión omnidireccional del Matrice 4 está compuesto por:', '[{"label": "A", "text": "Seis pares de cámaras estéreo cubriendo frente, atrás, izq, der, arriba y abajo."}, {"label": "B", "text": "Solo dos cámaras estéreo frontales."}, {"label": "C", "text": "Una cámara giratoria de 360°."}, {"label": "D", "text": "Cuatro radares ultrasónicos."}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 14, 'multiple_choice', 'El sistema de detección puede identificar cables eléctricos finos hasta de:', '[{"label": "A", "text": "2 mm a velocidades de hasta 21 m/s."}, {"label": "B", "text": "50 mm a velocidades hasta 5 m/s."}, {"label": "C", "text": "25 mm a velocidades hasta 8 m/s."}, {"label": "D", "text": "12 mm a velocidades de hasta 15 m/s."}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 15, 'multiple_choice', 'La cámara térmica del Matrice 4T tiene resolución nativa:', '[{"label": "A", "text": "320 × 240 px"}, {"label": "B", "text": "1 280 × 1 024 px (sensor)"}, {"label": "C", "text": "640 × 512 px (con UHR a 1 280 × 1 024)"}, {"label": "D", "text": "1 920 × 1 080 px"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 16, 'multiple_choice', 'El telémetro láser del Matrice 4 alcanza a:', '[{"label": "A", "text": "300 m a 50 % reflectividad"}, {"label": "B", "text": "1 800 m a 20 % reflectividad (1 Hz)"}, {"label": "C", "text": "3 000 m a cualquier reflectividad"}, {"label": "D", "text": "600 m máximo en cualquier condición"}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 17, 'multiple_choice', 'El estabilizador del Matrice 4 es una plataforma giroscópica de:', '[{"label": "A", "text": "3 ejes (pitch, roll, yaw)"}, {"label": "B", "text": "2 ejes (pitch, roll)"}, {"label": "C", "text": "4 ejes con rotación libre"}, {"label": "D", "text": "No tiene estabilizador, la cámara está fija"}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 18, 'multiple_choice', '¿Cuál es la consecuencia de mezclar hélices estándar y de bajo ruido en una misma aeronave?', '[{"label": "A", "text": "Aumenta el alcance de transmisión."}, {"label": "B", "text": "Mejora el rendimiento aerodinámico."}, {"label": "C", "text": "No tiene ningún efecto."}, {"label": "D", "text": "Causa inestabilidad de vuelo y es causal de pérdida de garantía."}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 19, 'multiple_choice', 'El sensor 3D infrarrojo inferior se utiliza principalmente para:', '[{"label": "A", "text": "Detectar tráfico aéreo tripulado."}, {"label": "B", "text": "Asistir el aterrizaje en superficies irregulares y baja luminosidad."}, {"label": "C", "text": "Sustituir el GNSS en zonas urbanas."}, {"label": "D", "text": "Generar imágenes térmicas radiométricas."}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 20, 'multiple_choice', '¿Cuál es la apertura de la cámara gran angular del Matrice 4E?', '[{"label": "A", "text": "f/1.7 fija"}, {"label": "B", "text": "f/4 fija"}, {"label": "C", "text": "f/2.8 a f/11 ajustable"}, {"label": "D", "text": "f/8 a f/22 ajustable"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 21, 'multiple_choice', 'La batería TB100 de la Serie Matrice 4 tiene una capacidad energética total de:', '[{"label": "A", "text": "977 Wh"}, {"label": "B", "text": "450 Wh"}, {"label": "C", "text": "2 100 Wh"}, {"label": "D", "text": "320 Wh"}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 22, 'multiple_choice', '¿Cuál es la temperatura ideal de carga de la batería TB100?', '[{"label": "A", "text": "0 a 5 °C"}, {"label": "B", "text": "10 a 20 °C"}, {"label": "C", "text": "35 a 45 °C"}, {"label": "D", "text": "22 a 28 °C"}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 23, 'multiple_choice', 'Para transporte aéreo (regla IATA), la batería TB100 debe estar descargada al:', '[{"label": "A", "text": "100 % cargada (mínimo)"}, {"label": "B", "text": "≤ 30 % de su capacidad"}, {"label": "C", "text": "Exactamente 50 %"}, {"label": "D", "text": "Cero %"}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 24, 'multiple_choice', 'Si una batería TB100 no se ha cargado o descargado durante más de 3 meses:', '[{"label": "A", "text": "Recupera automáticamente plena capacidad."}, {"label": "B", "text": "Aumenta su rendimiento."}, {"label": "C", "text": "Pierde cobertura de garantía y puede sufrir daño permanente."}, {"label": "D", "text": "Requiere reemplazo obligatorio inmediato sin excepciones."}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 25, 'multiple_choice', 'El modo "Listo para volar" del hub de carga termina la carga al:', '[{"label": "A", "text": "90 % en cada batería"}, {"label": "B", "text": "100 % siempre"}, {"label": "C", "text": "75 % en cada batería"}, {"label": "D", "text": "50 % en cada batería"}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 26, 'multiple_choice', 'La precisión horizontal del Matrice 4 con RTK fijo (FIX) es:', '[{"label": "A", "text": "±0.5 m"}, {"label": "B", "text": "±2 cm"}, {"label": "C", "text": "±50 cm"}, {"label": "D", "text": "1 cm + 1 ppm"}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 27, 'multiple_choice', 'Si el estado de posicionamiento RTK muestra "FLOAT" en lugar de "FIX":', '[{"label": "A", "text": "La precisión es centimétrica garantizada."}, {"label": "B", "text": "La precisión NO es centimétrica; el ambiguity resolver no convergió."}, {"label": "C", "text": "La aeronave debe aterrizar inmediatamente."}, {"label": "D", "text": "El RTK funciona pero solo para altitud, no horizontal."}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 28, 'multiple_choice', '¿Qué tipo de servicio RTK es la elección óptima cuando NO hay cobertura celular en el sitio?', '[{"label": "A", "text": "Mobile Station Network RTK"}, {"label": "B", "text": "Custom Network RTK"}, {"label": "C", "text": "D-RTK 3 (estación base local)"}, {"label": "D", "text": "Ningún servicio RTK funciona sin internet"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 29, 'multiple_choice', 'Una batería TB100 con menos del 10 % de carga inactiva por tiempo prolongado entrará en:', '[{"label": "A", "text": "Modo Hibernación, para evitar sobredescarga"}, {"label": "B", "text": "Carga automática inalámbrica"}, {"label": "C", "text": "Estado de error crítico no recuperable"}, {"label": "D", "text": "Recarga automática del 50 %"}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 30, 'multiple_choice', 'Sobre la operación de la batería bajo 0 °C, la recomendación correcta es:', '[{"label": "A", "text": "Volar inmediatamente sin precaución alguna."}, {"label": "B", "text": "Forzar el vuelo a velocidad máxima en modo Sport para auto-calentar."}, {"label": "C", "text": "Precalentar a temperatura ambiente, hover de 60 s antes de operación, reducir tiempo planificado en 30 %."}, {"label": "D", "text": "Cargar a 110 % en modo \"Listo para volar\"."}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 31, 'multiple_choice', 'El control remoto estándar de la Serie Matrice 4 es:', '[{"label": "A", "text": "DJI RC Pro"}, {"label": "B", "text": "DJI RC Plus 2 Enterprise"}, {"label": "C", "text": "DJI Smart Controller"}, {"label": "D", "text": "DJI RC-N2"}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 32, 'multiple_choice', 'En el RC Plus 2, manteniendo presionado el botón "Atrás" + Dial Izquierdo se ajusta:', '[{"label": "A", "text": "El zoom de la cámara"}, {"label": "B", "text": "El volumen del altavoz"}, {"label": "C", "text": "La inclinación del estabilizador"}, {"label": "D", "text": "El brillo de la pantalla táctil"}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 33, 'multiple_choice', 'Para iniciar un Regreso al Punto de Origen manual desde el control remoto:', '[{"label": "A", "text": "Mantener presionado el botón RPO durante el vuelo."}, {"label": "B", "text": "Pulsar el botón Detener vuelo dos veces."}, {"label": "C", "text": "Mover ambos joysticks completamente hacia atrás."}, {"label": "D", "text": "Apagar manualmente la aeronave en pleno vuelo."}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 34, 'multiple_choice', 'El método predeterminado de pilotaje en el RC Plus 2 es:', '[{"label": "A", "text": "Modo 1"}, {"label": "B", "text": "Modo 3"}, {"label": "C", "text": "Modo 2"}, {"label": "D", "text": "Modo Función"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 35, 'multiple_choice', 'Para vincular el RC y la aeronave por combinación de botones se debe presionar:', '[{"label": "A", "text": "Solo el botón de encendido durante 5 s"}, {"label": "B", "text": "Atrás + Joystick izquierdo"}, {"label": "C", "text": "El botón RPO durante 30 s"}, {"label": "D", "text": "C1 + C2 + Botón de Grabación simultáneamente"}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 36, 'multiple_choice', 'En la pantalla táctil del RC Plus 2, deslizar dos veces hacia abajo desde la parte superior abre:', '[{"label": "A", "text": "La aplicación recientemente usada"}, {"label": "B", "text": "El menú de Configuración rápida"}, {"label": "C", "text": "La cámara térmica"}, {"label": "D", "text": "El registrador de vuelo"}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 37, 'multiple_choice', 'La función PinPoint se basa en:', '[{"label": "A", "text": "El telémetro láser para georreferenciar puntos en el mapa con precisión decimétrica."}, {"label": "B", "text": "Solo en GNSS sin RTK."}, {"label": "C", "text": "Sensores ultrasónicos del tren de aterrizaje."}, {"label": "D", "text": "El sistema GEO de DJI."}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 38, 'multiple_choice', '¿Cuál es la limitación crítica del 4G en operaciones con RPO?', '[{"label": "A", "text": "No es compatible con OcuSync."}, {"label": "B", "text": "No permite carga útil térmica."}, {"label": "C", "text": "Usa toda la batería del control remoto."}, {"label": "D", "text": "La latencia 4G no permite el control fino del sistema de detección, por lo que el RPO sigue la última ruta conocida sin evitación dinámica."}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 39, 'multiple_choice', '¿Qué LED del control remoto indica que está vinculado correctamente con la aeronave?', '[{"label": "A", "text": "Rojo fijo"}, {"label": "B", "text": "Azul parpadeante"}, {"label": "C", "text": "Verde fijo"}, {"label": "D", "text": "Amarillo parpadeante"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 40, 'multiple_choice', '¿Cuál es la práctica recomendada respecto al uso de WiFi del teléfono móvil cerca del RC Plus 2 durante el vuelo?', '[{"label": "A", "text": "Activarlo siempre para reforzar la transmisión."}, {"label": "B", "text": "NO usar WiFi del móvil ni otros dispositivos 2.4/5.8 GHz cerca, para no interferir con la comunicación."}, {"label": "C", "text": "Usar exclusivamente Bluetooth del móvil."}, {"label": "D", "text": "No tiene relevancia operacional."}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 41, 'multiple_choice', '¿En qué modo de vuelo el sistema de detección de obstáculos se desactiva automáticamente?', '[{"label": "A", "text": "Modo Normal (N)"}, {"label": "B", "text": "Modo Trípode (T)"}, {"label": "C", "text": "Modo Sport (S)"}, {"label": "D", "text": "El sistema nunca se desactiva"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 42, 'multiple_choice', '¿En qué situación la aeronave entra automáticamente al Modo Posición (ATTI)?', '[{"label": "A", "text": "Cuando los sistemas de visión no están disponibles, la señal GNSS es débil o la brújula tiene interferencia."}, {"label": "B", "text": "Solo cuando el operador lo activa explícitamente."}, {"label": "C", "text": "Después de cada despegue automáticamente."}, {"label": "D", "text": "Nunca entra automáticamente."}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 43, 'multiple_choice', 'Si el operador cambia su posición durante el vuelo y necesita actualizar el punto de origen para el RPO, debe:', '[{"label": "A", "text": "Aterrizar y reiniciar la aeronave."}, {"label": "B", "text": "Despegar de nuevo desde la nueva ubicación."}, {"label": "C", "text": "No es posible actualizar el punto de origen en vuelo."}, {"label": "D", "text": "Acceder a DJI Pilot 2 → Vista de cámara → Control → Actualizar punto de origen."}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 44, 'multiple_choice', '¿Cuál es la altitud RPO predeterminada en DJI Pilot 2?', '[{"label": "A", "text": "30 m"}, {"label": "B", "text": "100 m"}, {"label": "C", "text": "500 m"}, {"label": "D", "text": "5 m"}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 45, 'multiple_choice', 'El sistema DJI AirSense recibe transmisiones ADS-B en estándares:', '[{"label": "A", "text": "Solo Mode S"}, {"label": "B", "text": "Solo VHF aeronáutica"}, {"label": "C", "text": "1090ES (RTCA DO-260) y UAT (RTCA DO-282)"}, {"label": "D", "text": "Solo ATC primario"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 46, 'multiple_choice', 'Una limitación crítica de DJI AirSense que el operador debe conocer es:', '[{"label": "A", "text": "No detecta aeronaves sin ADS-B Out funcionando, ni emite señal hacia las aeronaves tripuladas."}, {"label": "B", "text": "Solo funciona con tráfico militar."}, {"label": "C", "text": "Requiere conexión 4G obligatoria."}, {"label": "D", "text": "Genera fallos en la GNSS de la aeronave."}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 47, 'multiple_choice', 'Cuando el sistema GEO indica una zona de autorización (azul) y la aeronave intenta arrancar motores dentro de ella sin desbloqueo, ocurre:', '[{"label": "A", "text": "Los motores arrancan normalmente."}, {"label": "B", "text": "La aeronave despega y vuela libremente."}, {"label": "C", "text": "Se enciende un LED azul y se vinculan los dispositivos."}, {"label": "D", "text": "Los motores no arrancan, debe enviarse solicitud de desbloqueo registrada."}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 48, 'multiple_choice', 'El espacio de seguridad alrededor de zonas restringidas y de autorización es de aproximadamente:', '[{"label": "A", "text": "5 m"}, {"label": "B", "text": "100 m"}, {"label": "C", "text": "20 m"}, {"label": "D", "text": "500 m"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 49, 'multiple_choice', 'Durante el RPO con transmisión 4G activa y OcuSync degradada, el comportamiento esperado de la aeronave es:', '[{"label": "A", "text": "Cae inmediatamente."}, {"label": "B", "text": "Sigue la última ruta de vuelo conocida; la latencia 4G impide el sistema de detección activa."}, {"label": "C", "text": "Aterriza automáticamente en la ubicación del RC."}, {"label": "D", "text": "Cancela el RPO y vuela en círculos."}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 50, 'multiple_choice', 'Antes de cambiar del modo Normal a otros modos en el RC, el operador debe:', '[{"label": "A", "text": "Activar la configuración \"Múltiples modos de vuelo\" en DJI Pilot 2 y estar suficientemente familiarizado con el comportamiento de la aeronave en cada modo."}, {"label": "B", "text": "Aterrizar primero la aeronave."}, {"label": "C", "text": "Apagar el sistema de visión manualmente."}, {"label": "D", "text": "Cambiar la batería."}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 51, 'multiple_choice', 'Para inspección termográfica de conexiones eléctricas, la ventana óptima del día es:', '[{"label": "A", "text": "Mediodía con sol cenital"}, {"label": "B", "text": "Madrugada antes del amanecer (1 a 4 a.m.)"}, {"label": "C", "text": "Cualquier hora si el cielo está despejado"}, {"label": "D", "text": "2 horas después del amanecer o 2 horas antes del atardecer"}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 52, 'multiple_choice', 'En termografía aérea, configurar incorrectamente la emisividad puede generar errores de:', '[{"label": "A", "text": "No tiene impacto en la temperatura medida."}, {"label": "B", "text": "5 a 15 °C, suficientes para clasificar erróneamente una anomalía."}, {"label": "C", "text": "Más de 100 °C invariablemente."}, {"label": "D", "text": "Solo afecta el contraste visual, no la temperatura."}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 53, 'multiple_choice', 'Para SAR nocturno con cámara térmica, una paleta recomendada es:', '[{"label": "A", "text": "Sepia / Tinted"}, {"label": "B", "text": "Cold Spot (mancha fría)"}, {"label": "C", "text": "Hot Spot o Iron Red"}, {"label": "D", "text": "B/N puro sin paleta"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 54, 'multiple_choice', 'En una misión de mapeo fotogramétrico estándar, el solapamiento adelante/lateral recomendado es:', '[{"label": "A", "text": "80 % / 70 %"}, {"label": "B", "text": "30 % / 20 %"}, {"label": "C", "text": "50 % / 50 %"}, {"label": "D", "text": "100 % / 100 %"}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 55, 'multiple_choice', 'Para inspección detallada de torres con waypoint, la velocidad recomendada es aproximadamente:', '[{"label": "A", "text": "21 m/s"}, {"label": "B", "text": "15 m/s"}, {"label": "C", "text": "12 m/s"}, {"label": "D", "text": "3 m/s"}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 56, 'multiple_choice', 'Para minimizar el ruido en imágenes fotogramétricas con M4E, la apertura recomendada es:', '[{"label": "A", "text": "f/1.7 fija"}, {"label": "B", "text": "f/11 siempre"}, {"label": "C", "text": "f/4 a f/5.6 (apertura media)"}, {"label": "D", "text": "f/22 al máximo posible"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 57, 'multiple_choice', '¿Qué función NO está disponible cuando se opera en oscuridad total con luz NIR?', '[{"label": "A", "text": "Cámara térmica"}, {"label": "B", "text": "El sistema de visión funciona con la misma efectividad que de día — no hay degradación."}, {"label": "C", "text": "Cámara visible iluminada por NIR"}, {"label": "D", "text": "Telémetro láser"}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 58, 'multiple_choice', 'Para mapeo 3D urbano con M4E, la inclinación de cámara típica es:', '[{"label": "A", "text": "−70° oblicuo, con vuelo en cinco direcciones"}, {"label": "B", "text": "−90° (nadir) en una sola pasada"}, {"label": "C", "text": "0° (horizonte)"}, {"label": "D", "text": "+45° apuntando hacia arriba"}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 59, 'multiple_choice', 'El procedimiento FFC (Flat Field Correction) en cámara térmica corresponde a:', '[{"label": "A", "text": "Cambio de paleta térmica."}, {"label": "B", "text": "Calibración de focalización del lente."}, {"label": "C", "text": "Ajuste manual de emisividad."}, {"label": "D", "text": "Calibración de uniformidad del sensor microbolométrico, mediante shutter interno que bloquea el sensor brevemente."}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 60, 'multiple_choice', 'Para vuelo nocturno conforme buenas prácticas, la velocidad operacional recomendada respecto al vuelo diurno es:', '[{"label": "A", "text": "Aumentada al doble"}, {"label": "B", "text": "Reducida al 50 % de la diurna"}, {"label": "C", "text": "Igual a la diurna"}, {"label": "D", "text": "Sin cambio porque la luz NIR compensa"}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 61, 'multiple_choice', 'En el procedimiento de apagado post-vuelo, el orden correcto es:', '[{"label": "A", "text": "RC primero, luego aeronave"}, {"label": "B", "text": "Ambos al mismo tiempo"}, {"label": "C", "text": "Aeronave primero, luego RC"}, {"label": "D", "text": "Solo apagar el RC; la aeronave se apaga sola"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 62, 'multiple_choice', 'Antes de manipular o cargar una batería tras un vuelo, se debe esperar:', '[{"label": "A", "text": "15 a 20 minutos para que se enfríe"}, {"label": "B", "text": "Es indistinto, se puede cargar de inmediato"}, {"label": "C", "text": "Mínimo 4 horas obligatorias"}, {"label": "D", "text": "Solo enfriar el motor, la batería no requiere espera"}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 63, 'multiple_choice', 'El programa de mantenimiento preventivo recomienda calibración IMU y brújula completa:', '[{"label": "A", "text": "Cada 1 hora de vuelo"}, {"label": "B", "text": "Una sola vez en la vida útil"}, {"label": "C", "text": "Cada 250 horas de vuelo"}, {"label": "D", "text": "Cada 25 horas de vuelo"}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 64, 'multiple_choice', 'Una batería con LED amarillo fijo en el hub de carga indica:', '[{"label": "A", "text": "Carga completada al 100 %."}, {"label": "B", "text": "No se ha insertado batería."}, {"label": "C", "text": "Anomalía no recuperable."}, {"label": "D", "text": "Cargando."}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 65, 'multiple_choice', 'El método recomendado para limpiar el cuerpo de la aeronave es:', '[{"label": "A", "text": "Paño de microfibra húmedo, sin alcohol ni solventes"}, {"label": "B", "text": "Esponja con detergente fuerte"}, {"label": "C", "text": "Lavadora industrial"}, {"label": "D", "text": "Aire comprimido directamente sobre los lentes"}]'::JSONB, 'A', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 66, 'multiple_choice', 'Para actualizar firmware vía DJI Pilot 2, ambos dispositivos deben tener un nivel mínimo de batería de:', '[{"label": "A", "text": "10 %"}, {"label": "B", "text": "90 %"}, {"label": "C", "text": "50 %"}, {"label": "D", "text": "Cualquier nivel, no es relevante"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 67, 'multiple_choice', 'El registrador de vuelo (flight log) debe conservarse, conforme estándar profesional, durante un mínimo de:', '[{"label": "A", "text": "24 horas"}, {"label": "B", "text": "1 mes"}, {"label": "C", "text": "2 semanas"}, {"label": "D", "text": "6 meses"}]'::JSONB, 'D', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 68, 'multiple_choice', 'Tras una colisión, una batería TB100 que externamente parece intacta debe:', '[{"label": "A", "text": "Cargarse inmediatamente para verificar funcionamiento."}, {"label": "B", "text": "Aislarse en bolsa antiincendio dentro de contenedor metálico abierto en zona ventilada y monitorearse al menos 4 horas."}, {"label": "C", "text": "Reutilizarse en el siguiente vuelo si no presenta hinchazón visible."}, {"label": "D", "text": "Desecharse en basura doméstica."}]'::JSONB, 'B', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 69, 'multiple_choice', 'El software de PC para actualización avanzada y descarga de bitácoras es:', '[{"label": "A", "text": "DJI Fly"}, {"label": "B", "text": "DJI Mimo"}, {"label": "C", "text": "DJI Assistant 2 (Enterprise Series)"}, {"label": "D", "text": "DJI Studio"}]'::JSONB, 'C', 1);
  INSERT INTO exam_questions (exam_id, sort_order, question_type, question_text, options, correct_answer, points) VALUES (v_exam_id, 70, 'multiple_choice', 'Frente a un incidente con daño material o evento de seguridad, el operador profesional bajo DAN 151 Ed. 4 debe:', '[{"label": "A", "text": "Reportar a la DGAC dentro de los plazos establecidos, conservar evidencias y producir un Air Safety Report (ASR) con análisis de causa raíz."}, {"label": "B", "text": "No reportar para no generar incidentes administrativos."}, {"label": "C", "text": "Borrar inmediatamente los logs para evitar responsabilidad."}, {"label": "D", "text": "Reportar solo al cliente, sin comunicar a las autoridades."}]'::JSONB, 'A', 1);
END $$;


-- Verify
SELECT id, code, title FROM courses WHERE code = 'ENAE/UAS/M4';