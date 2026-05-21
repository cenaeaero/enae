-- =============================================================================
-- Facturación B2B (Fase 1: ingresos)
-- Cotización → O/C → HES → Factura → Pago
-- Servicios exentos de IVA. Vencimiento default: 30 días desde fecha de factura.
-- =============================================================================

CREATE TABLE IF NOT EXISTS billing_cases (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company             text NOT NULL,
  course_id           uuid REFERENCES courses(id) ON DELETE SET NULL,
  session_id          uuid REFERENCES sessions(id) ON DELETE SET NULL,

  -- Contacto en la empresa
  contact_name        text,
  contact_email       text,
  contact_phone       text,

  -- Cotización
  quotation_number    text,
  quotation_date      date,
  quotation_amount    numeric(14, 2) DEFAULT 0,
  quotation_sent_at   timestamptz,
  quotation_file_url  text,

  -- Orden de Compra recibida del cliente
  oc_number           text,
  oc_received_at      timestamptz,
  oc_file_url         text,

  -- HES (Hoja de Entrada de Servicio)
  hes_number          text,
  hes_received_at     timestamptz,
  hes_file_url        text,

  -- Factura emitida por ENAE
  invoice_number      text,
  invoice_date        date,
  invoice_amount      numeric(14, 2),
  invoice_file_url    text,
  payment_due_date    date,           -- default invoice_date + 30 días (set en trigger)

  -- Pago recibido
  payment_received_at timestamptz,
  payment_amount      numeric(14, 2),
  payment_reference   text,           -- nro. transferencia / cheque / etc.

  -- Estado derivado y observaciones
  status              text NOT NULL DEFAULT 'quoted'
    CHECK (status IN ('draft','quoted','oc_pending','hes_pending','to_invoice','invoiced','paid','overdue','cancelled')),
  notes               text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_cases_company    ON billing_cases (company);
CREATE INDEX IF NOT EXISTS idx_billing_cases_status     ON billing_cases (status);
CREATE INDEX IF NOT EXISTS idx_billing_cases_session    ON billing_cases (session_id);
CREATE INDEX IF NOT EXISTS idx_billing_cases_due        ON billing_cases (payment_due_date) WHERE payment_received_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_billing_cases_unique_open
  ON billing_cases (company, session_id)
  WHERE session_id IS NOT NULL AND status <> 'cancelled';

-- =============================================================================
-- Tabla puente: alumnos incluidos en cada caso
-- =============================================================================

CREATE TABLE IF NOT EXISTS billing_case_registrations (
  billing_case_id uuid NOT NULL REFERENCES billing_cases(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  added_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (billing_case_id, registration_id)
);

CREATE INDEX IF NOT EXISTS idx_bcr_registration ON billing_case_registrations (registration_id);

-- =============================================================================
-- Trigger: mantener payment_due_date = invoice_date + 30 días si no se setea
--           bump updated_at en cada update
--           promover status a 'overdue' si vence sin pago
-- =============================================================================

CREATE OR REPLACE FUNCTION billing_cases_set_defaults() RETURNS trigger AS $$
BEGIN
  IF NEW.invoice_date IS NOT NULL AND NEW.payment_due_date IS NULL THEN
    NEW.payment_due_date := NEW.invoice_date + INTERVAL '30 days';
  END IF;

  -- Auto-marcar pagado si llegó el pago
  IF NEW.payment_received_at IS NOT NULL AND NEW.status <> 'paid' THEN
    NEW.status := 'paid';
  END IF;

  -- Marcar vencido si la factura está sin pago y la fecha pasó
  IF NEW.payment_received_at IS NULL
     AND NEW.invoice_date IS NOT NULL
     AND NEW.payment_due_date IS NOT NULL
     AND NEW.payment_due_date < CURRENT_DATE
     AND NEW.status NOT IN ('paid','cancelled') THEN
    NEW.status := 'overdue';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_billing_cases_defaults ON billing_cases;
CREATE TRIGGER trg_billing_cases_defaults
  BEFORE INSERT OR UPDATE ON billing_cases
  FOR EACH ROW EXECUTE FUNCTION billing_cases_set_defaults();

-- =============================================================================
-- Vista de overview por empresa (la que alimenta la pestaña "Por Empresa")
-- =============================================================================

CREATE OR REPLACE VIEW billing_company_summary AS
SELECT
  bc.company,
  count(*) FILTER (WHERE bc.status NOT IN ('paid','cancelled'))            AS open_cases,
  count(*) FILTER (WHERE bc.status = 'paid')                                AS paid_cases,
  count(*) FILTER (WHERE bc.status = 'overdue')                             AS overdue_cases,
  coalesce(sum(bc.invoice_amount) FILTER (WHERE bc.invoice_date IS NOT NULL AND bc.payment_received_at IS NULL), 0)  AS amount_receivable,
  coalesce(sum(bc.invoice_amount) FILTER (WHERE bc.status = 'overdue'), 0)                                            AS amount_overdue,
  coalesce(sum(bc.payment_amount), 0)                                                                                  AS amount_collected,
  coalesce(sum(bc.quotation_amount) FILTER (WHERE bc.invoice_date IS NULL AND bc.status NOT IN ('cancelled','paid')), 0) AS amount_pipeline
FROM billing_cases bc
GROUP BY bc.company
ORDER BY bc.company;

-- =============================================================================
-- RLS — permitir todo a service_role (admin endpoints lo usan)
-- =============================================================================

ALTER TABLE billing_cases             ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_case_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_cases_service ON billing_cases;
CREATE POLICY billing_cases_service ON billing_cases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS bcr_service ON billing_case_registrations;
CREATE POLICY bcr_service ON billing_case_registrations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- Storage bucket para PDFs (cotización, O/C, HES, factura)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('billing-docs', 'billing-docs', false, 26214400, ARRAY['application/pdf','image/png','image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Solo service_role lee/escribe (admin endpoints firman URLs)
DROP POLICY IF EXISTS "billing-docs service" ON storage.objects;
CREATE POLICY "billing-docs service" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'billing-docs')
  WITH CHECK (bucket_id = 'billing-docs');
