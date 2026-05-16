
-- Add Stripe session tracking to orders
ALTER TABLE public.orders
  ADD COLUMN stripe_session_id text UNIQUE,
  ADD COLUMN stripe_payment_intent_id text,
  ADD COLUMN stripe_customer_email text;

CREATE INDEX idx_orders_stripe_session ON public.orders(stripe_session_id);

-- Notification log table for order status SMS/email
CREATE TABLE public.order_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  notification_type text NOT NULL CHECK (notification_type IN ('email','sms')),
  event text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_order_notifications_order_id ON public.order_notifications(order_id);

ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (edge functions use service role)
CREATE POLICY "service_role_manage_notifications"
  ON public.order_notifications FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Admins can read notifications
CREATE POLICY "admin_read_notifications"
  ON public.order_notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Enable realtime for orders so payment success page can react
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
