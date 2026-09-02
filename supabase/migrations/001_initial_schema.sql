-- Harborline Securities Platform Schema
-- Run this in Supabase SQL Editor

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  kyc_status TEXT NOT NULL DEFAULT 'none' CHECK (kyc_status IN ('none', 'pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- KYC Submissions
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('none', 'pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Balances
CREATE TABLE IF NOT EXISTS balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  currency TEXT NOT NULL DEFAULT 'USD',
  amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deposits
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(18, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(18, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT NOT NULL,
  wallet_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trades
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  amount NUMERIC(18, 8) NOT NULL,
  price NUMERIC(18, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(18, 2) NOT NULL,
  features JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Copy Trading Subscriptions
CREATE TABLE IF NOT EXISTS copy_trading_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trader_name TEXT NOT NULL,
  allocation NUMERIC(18, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mining Packages
CREATE TABLE IF NOT EXISTS mining_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  investment NUMERIC(18, 2) NOT NULL,
  daily_return NUMERIC(5, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Signal Packages
CREATE TABLE IF NOT EXISTS signal_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  price NUMERIC(18, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id TEXT NOT NULL UNIQUE,
  holder_name TEXT NOT NULL,
  issue_date DATE NOT NULL,
  type TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_trading_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mining_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (is_admin());

-- KYC policies
CREATE POLICY "Users can view own KYC" ON kyc_submissions FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert own KYC" ON kyc_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update KYC" ON kyc_submissions FOR UPDATE USING (is_admin());

-- Balances policies
CREATE POLICY "Users can view own balance" ON balances FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Admins can manage balances" ON balances FOR ALL USING (is_admin());

-- Deposits policies
CREATE POLICY "Users can view own deposits" ON deposits FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert deposits" ON deposits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update deposits" ON deposits FOR UPDATE USING (is_admin());

-- Withdrawals policies
CREATE POLICY "Users can view own withdrawals" ON withdrawals FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert withdrawals" ON withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update withdrawals" ON withdrawals FOR UPDATE USING (is_admin());

-- Trades policies
CREATE POLICY "Users can view own trades" ON trades FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Admins can manage trades" ON trades FOR ALL USING (is_admin());

-- Plans (public read)
CREATE POLICY "Anyone can view active plans" ON plans FOR SELECT USING (is_active = true OR is_admin());
CREATE POLICY "Admins can manage plans" ON plans FOR ALL USING (is_admin());

-- Copy trading policies
CREATE POLICY "Users can view own copy subs" ON copy_trading_subscriptions FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert copy subs" ON copy_trading_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mining policies
CREATE POLICY "Users can view own mining" ON mining_packages FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert mining" ON mining_packages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Signal policies
CREATE POLICY "Users can view own signals" ON signal_packages FOR SELECT USING (auth.uid() = user_id OR is_admin());
CREATE POLICY "Users can insert signals" ON signal_packages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert notifications" ON notifications FOR INSERT WITH CHECK (is_admin());

-- Settings policies
CREATE POLICY "Admins can manage settings" ON platform_settings FOR ALL USING (is_admin());
CREATE POLICY "Anyone can read settings" ON platform_settings FOR SELECT USING (true);

-- Certificates (public read for verification)
CREATE POLICY "Anyone can verify certificates" ON certificates FOR SELECT USING (true);
CREATE POLICY "Admins can manage certificates" ON certificates FOR ALL USING (is_admin());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, kyc_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'user',
    'none'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();

  INSERT INTO public.balances (user_id, currency, amount)
  VALUES (NEW.id, 'USD', 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Seed default plans
INSERT INTO plans (name, description, price, features) VALUES
  ('Basic', 'Essential tools for individual investors', 500, '["Portfolio dashboard", "Basic trading signals", "Email support", "Monthly statements"]'),
  ('Professional', 'Advanced features for active traders', 2500, '["Everything in Basic", "Copy trading access", "Priority support", "Advanced analytics", "Weekly reports"]'),
  ('Institution', 'Full-suite wealth management', 10000, '["Everything in Professional", "Dedicated account manager", "Custom strategies", "API access", "24/7 phone support"]')
ON CONFLICT DO NOTHING;

-- Seed sample certificate
INSERT INTO certificates (certificate_id, holder_name, issue_date, type) VALUES
  ('HLS-2024-0001', 'Sample Holder', '2024-01-15', 'Investment Certificate')
ON CONFLICT DO NOTHING;

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload KYC docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view KYC docs" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents');
