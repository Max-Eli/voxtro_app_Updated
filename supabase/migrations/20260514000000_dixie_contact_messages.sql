-- Dixie Amateur "Contact Us" submissions from dixieamateur.com.
--
-- The public POST /api/submit-contact endpoint stores every submission here
-- (real + bot-flagged), and the customer portal's GET /api/customers/contact-messages
-- endpoint lists the real (is_spam = false) ones. The table was referenced in
-- code but never created via migration, so submissions silently failed to
-- persist (the INSERT is wrapped in a try/except) and the portal showed nothing.
--
-- All access is through the service-role backend, so RLS is enabled with no
-- policies to deny any direct client access.

CREATE TABLE IF NOT EXISTS dixie_contact_messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   uuid        NOT NULL,
  name          text        NOT NULL,
  email         text        NOT NULL,
  subject       text        NOT NULL DEFAULT '',
  message       text        NOT NULL,
  is_spam       boolean     NOT NULL DEFAULT false,
  spam_signals  jsonb       NOT NULL DEFAULT '[]'::jsonb,
  spam_score    integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- The portal lists by customer, newest first, filtered to non-spam.
CREATE INDEX IF NOT EXISTS idx_dixie_contact_messages_customer_created
  ON dixie_contact_messages(customer_id, created_at DESC);

ALTER TABLE dixie_contact_messages ENABLE ROW LEVEL SECURITY;
