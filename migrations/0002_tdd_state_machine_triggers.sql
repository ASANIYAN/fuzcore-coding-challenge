CREATE OR REPLACE FUNCTION enforce_invoice_status_transition()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'draft' AND NEW.status IN ('sent', 'void')) OR
    (OLD.status = 'sent' AND NEW.status IN ('paid', 'void'))
  ) THEN
    RAISE EXCEPTION 'Invalid invoice status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoices_status_transition_guard ON invoices;
CREATE TRIGGER invoices_status_transition_guard
BEFORE UPDATE OF status ON invoices
FOR EACH ROW
EXECUTE FUNCTION enforce_invoice_status_transition();

CREATE OR REPLACE FUNCTION enforce_transaction_category_type_match()
RETURNS trigger AS $$
DECLARE
  category_type_value category_type;
BEGIN
  SELECT type INTO category_type_value
  FROM categories
  WHERE id = NEW.category_id;

  IF category_type_value IS NULL THEN
    RAISE EXCEPTION 'Category not found for id: %', NEW.category_id;
  END IF;

  IF category_type_value::text <> NEW.type::text THEN
    RAISE EXCEPTION 'Transaction type % does not match category type %', NEW.type, category_type_value;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_category_type_guard ON transactions;
CREATE TRIGGER transactions_category_type_guard
BEFORE INSERT OR UPDATE OF category_id, type ON transactions
FOR EACH ROW
EXECUTE FUNCTION enforce_transaction_category_type_match();
