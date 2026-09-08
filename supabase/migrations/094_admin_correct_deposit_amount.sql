-- Let admins correct a pending deposit to the amount actually received,
-- while keeping the user's original request for audit.

ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS original_amount NUMERIC(18, 2);

ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS amount_corrected_at TIMESTAMPTZ;

ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS amount_corrected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.deposits
SET original_amount = amount
WHERE original_amount IS NULL;

ALTER TABLE public.deposits
  ALTER COLUMN original_amount SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.deposit_amount_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID NOT NULL REFERENCES public.deposits(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  previous_amount NUMERIC(18, 2) NOT NULL,
  new_amount NUMERIC(18, 2) NOT NULL,
  original_amount NUMERIC(18, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS deposit_amount_corrections_deposit_idx
  ON public.deposit_amount_corrections (deposit_id, created_at DESC);

ALTER TABLE public.deposit_amount_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deposit_amount_corrections_admin_all ON public.deposit_amount_corrections;
CREATE POLICY deposit_amount_corrections_admin_all
  ON public.deposit_amount_corrections
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT ON public.deposit_amount_corrections TO authenticated;

CREATE OR REPLACE FUNCTION public.deposits_preserve_original_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.original_amount := NEW.amount;
    RETURN NEW;
  END IF;

  NEW.original_amount := COALESCE(OLD.original_amount, OLD.amount, NEW.amount);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deposits_preserve_original_amount ON public.deposits;
CREATE TRIGGER trg_deposits_preserve_original_amount
  BEFORE INSERT OR UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.deposits_preserve_original_amount();

CREATE OR REPLACE FUNCTION public.admin_correct_deposit_amount(
  p_deposit_id UUID,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_dep public.deposits%ROWTYPE;
  v_amount NUMERIC(18, 2);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Enter a valid amount greater than zero';
  END IF;

  v_amount := ROUND(p_amount, 2);

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Enter a valid amount greater than zero';
  END IF;

  IF v_amount > 99999999.99 THEN
    RAISE EXCEPTION 'Amount is too large';
  END IF;

  SELECT * INTO v_dep
  FROM public.deposits
  WHERE id = p_deposit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit not found';
  END IF;

  IF v_dep.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Only pending deposits can be edited';
  END IF;

  IF ROUND(v_dep.amount, 2) = v_amount THEN
    RETURN jsonb_build_object(
      'ok', true,
      'id', v_dep.id,
      'amount', v_dep.amount,
      'original_amount', v_dep.original_amount,
      'unchanged', true
    );
  END IF;

  INSERT INTO public.deposit_amount_corrections (
    deposit_id,
    admin_id,
    previous_amount,
    new_amount,
    original_amount
  )
  VALUES (
    v_dep.id,
    v_admin_id,
    v_dep.amount,
    v_amount,
    COALESCE(v_dep.original_amount, v_dep.amount)
  );

  UPDATE public.deposits
  SET
    amount = v_amount,
    amount_corrected_at = NOW(),
    amount_corrected_by = v_admin_id,
    updated_at = NOW()
  WHERE id = v_dep.id;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_dep.id,
    'amount', v_amount,
    'original_amount', COALESCE(v_dep.original_amount, v_dep.amount),
    'previous_amount', v_dep.amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_correct_deposit_amount(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_correct_deposit_amount(UUID, NUMERIC) TO authenticated;
