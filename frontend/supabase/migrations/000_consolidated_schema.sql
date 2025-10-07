-- =====================================================
-- CONSOLIDATED SUPABASE SCHEMA MIGRATION
-- This file contains all the database schemas consolidated from individual migrations
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================

-- User categories and roles
CREATE TYPE user_category AS ENUM ('editor', 'client', 'agency');
CREATE TYPE app_role AS ENUM ('editor', 'client', 'agency', 'admin');
CREATE TYPE subscription_tier AS ENUM ('basic', 'pro', 'premium');
CREATE TYPE project_status AS ENUM ('draft', 'in_review', 'approved', 'completed');
CREATE TYPE payment_type AS ENUM ('freelance', 'fulltime');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'overdue');
CREATE TYPE employment_type AS ENUM ('fulltime', 'freelance');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'corrections_needed');
CREATE TYPE notification_type AS ENUM (
  'project_created',
  'project_assigned',
  'project_status_changed',
  'version_added',
  'deadline_approaching',
  'deadline_overdue',
  'feedback_added',
  'feedback_replied',
  'correction_requested',
  'project_approved',
  'project_rejected',
  'invoice_generated',
  'invoice_due',
  'invoice_overdue',
  'payment_received',
  'payment_failed',
  'chat_message',
  'subscription_expiring',
  'subscription_renewed',
  'system_alert',
  'user_mentioned'
);
CREATE TYPE notification_priority AS ENUM ('info', 'important', 'critical');

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  user_category user_category NOT NULL DEFAULT 'editor',
  subscription_tier subscription_tier NOT NULL DEFAULT 'basic',
  subscription_active BOOLEAN NOT NULL DEFAULT true,
  trial_end_date TIMESTAMPTZ,
  subscription_start_date TIMESTAMPTZ,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Editors table
CREATE TABLE public.editors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  specialty TEXT,
  employment_type employment_type NOT NULL DEFAULT 'freelance',
  hourly_rate DECIMAL(10,2),
  monthly_salary DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id)
);

-- Clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  employment_type employment_type NOT NULL DEFAULT 'freelance',
  project_rate DECIMAL(10,2),
  monthly_rate DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id)
);

-- Project types table for autocomplete suggestions
CREATE TABLE public.project_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT,
  editor_id UUID REFERENCES public.editors(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  creator_id UUID NOT NULL,
  raw_footage_link TEXT,
  assigned_date DATE,
  deadline DATE,
  fee DECIMAL(10,2),
  status TEXT DEFAULT 'draft',
  parent_project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  is_subproject BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Project clients junction table
CREATE TABLE public.project_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, client_id)
);

-- Video versions table
CREATE TABLE public.video_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  preview_url TEXT,
  final_url TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approval_status approval_status DEFAULT 'pending',
  final_link_requested BOOLEAN DEFAULT FALSE,
  correction_notes TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Video feedback table
CREATE TABLE public.video_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.video_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  timestamp_seconds INTEGER,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  payer_id UUID NOT NULL REFERENCES public.profiles(id),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_type payment_type NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  invoice_url TEXT,
  due_date TIMESTAMPTZ,
  paid_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Database config table for admin
CREATE TABLE public.database_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'supabase',
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- NOTIFICATION SYSTEM TABLES
-- =====================================================

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type notification_type NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_notifications JSONB NOT NULL DEFAULT '{}',
  in_app_notifications JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Broadcast messages table
CREATE TABLE public.broadcast_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  target_users TEXT[] NOT NULL DEFAULT '{}',
  sent_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ADMIN SYSTEM TABLES
-- =====================================================

-- API keys table
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_limit INTEGER,
  current_usage INTEGER NOT NULL DEFAULT 0,
  environment TEXT NOT NULL DEFAULT 'production',
  last_used TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Admin activity logs table
CREATE TABLE public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subscription plans table
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  tier TEXT NOT NULL,
  price NUMERIC NOT NULL,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  features TEXT[] NOT NULL DEFAULT '{}',
  project_limit INTEGER,
  storage_limit INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trial_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to create user profile with custom ID
CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_id uuid,
  p_email text,
  p_full_name text,
  p_user_category user_category,
  p_password_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    user_category,
    password_hash,
    subscription_active,
    subscription_tier,
    trial_end_date,
    created_at,
    updated_at
  ) VALUES (
    p_id,
    p_email,
    p_full_name,
    p_user_category,
    p_password_hash,
    true,
    'basic'::subscription_tier,
    NOW() + INTERVAL '30 days',
    NOW(),
    NOW()
  );
  
  RETURN p_id;
END;
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, user_category)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE((new.raw_user_meta_data->>'user_category')::user_category, 'editor'::user_category)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

-- Function to automatically assign default role to new users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Get the user_category from metadata and map it to app_role
  user_role := COALESCE((NEW.raw_user_meta_data->>'user_category')::app_role, 'editor'::app_role);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to sync user_category with user_roles
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete existing role
  DELETE FROM public.user_roles WHERE user_id = NEW.id;
  
  -- Insert new role based on user_category
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, NEW.user_category::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to auto-delete expired notifications
CREATE OR REPLACE FUNCTION delete_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$;

-- Function to initialize default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id, preferences)
  VALUES (
    NEW.id,
    '{
      "project_created": {"in_app": true, "email": false},
      "project_assigned": {"in_app": true, "email": true},
      "project_status_changed": {"in_app": true, "email": false},
      "version_added": {"in_app": true, "email": false},
      "deadline_approaching": {"in_app": true, "email": true},
      "deadline_overdue": {"in_app": true, "email": true},
      "feedback_added": {"in_app": true, "email": true},
      "correction_requested": {"in_app": true, "email": true},
      "project_approved": {"in_app": true, "email": true},
      "invoice_generated": {"in_app": true, "email": true},
      "invoice_due": {"in_app": true, "email": true},
      "invoice_overdue": {"in_app": true, "email": true},
      "payment_received": {"in_app": true, "email": true},
      "chat_message": {"in_app": true, "email": false},
      "subscription_expiring": {"in_app": true, "email": true},
      "system_alert": {"in_app": true, "email": true}
    }'::jsonb
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger for new user role assignment
CREATE TRIGGER on_auth_user_role_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Trigger to sync user_category changes
CREATE TRIGGER sync_user_category_to_role
AFTER UPDATE OF user_category ON public.profiles
FOR EACH ROW
WHEN (OLD.user_category IS DISTINCT FROM NEW.user_category)
EXECUTE FUNCTION public.sync_user_role();

-- Trigger to create default preferences for new users
CREATE TRIGGER create_notification_preferences_on_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_video_versions_updated_at
  BEFORE UPDATE ON public.video_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_editors_updated_at
BEFORE UPDATE ON public.editors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_video_feedback_updated_at
BEFORE UPDATE ON public.video_feedback
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON public.subscription_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Only system can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Editors policies
CREATE POLICY "Users can view all editors"
ON public.editors FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert editors"
ON public.editors FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update editors"
ON public.editors FOR UPDATE
TO authenticated
USING (true);

-- Clients policies
CREATE POLICY "Users can view all clients"
ON public.clients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert clients"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update clients"
ON public.clients FOR UPDATE
TO authenticated
USING (true);

-- Project types policies
CREATE POLICY "Anyone can read project types"
ON public.project_types FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Anyone can insert project types"
ON public.project_types FOR INSERT
TO authenticated
WITH CHECK (true);

-- Projects policies
CREATE POLICY "Users can view their projects"
ON public.projects FOR SELECT
TO authenticated
USING (creator_id = auth.uid());

CREATE POLICY "Users can insert projects"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Users can update their projects"
ON public.projects FOR UPDATE
TO authenticated
USING (creator_id = auth.uid());

CREATE POLICY "Users can delete their projects"
ON public.projects FOR DELETE
TO authenticated
USING (creator_id = auth.uid());

-- Project clients policies
CREATE POLICY "Users can view project clients they're part of"
ON public.project_clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND creator_id = auth.uid()
  ) OR client_id = auth.uid()
);

CREATE POLICY "Project creators can manage project clients"
ON public.project_clients
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND creator_id = auth.uid()
  )
);

-- Video versions policies
CREATE POLICY "Users can view video versions for their projects"
ON public.video_versions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND creator_id = auth.uid()
  )
);

CREATE POLICY "Project creators can manage video versions"
ON public.video_versions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id AND creator_id = auth.uid()
  )
);

-- Video feedback policies
CREATE POLICY "Project members can view feedback"
ON public.video_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.video_versions vv
    JOIN public.projects p ON p.id = vv.project_id
    WHERE vv.id = video_feedback.version_id
      AND (
        p.creator_id = auth.uid() OR
        p.editor_id = auth.uid() OR
        p.client_id = auth.uid()
      )
  )
);

CREATE POLICY "Project members can insert feedback"
ON public.video_feedback
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.video_versions vv
    JOIN public.projects p ON p.id = vv.project_id
    WHERE vv.id = version_id
      AND (
        p.creator_id = auth.uid() OR
        p.editor_id = auth.uid() OR
        p.client_id = auth.uid()
      )
  )
);

CREATE POLICY "Project members can update feedback"
ON public.video_feedback
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.video_versions vv
    JOIN public.projects p ON p.id = vv.project_id
    WHERE vv.id = video_feedback.version_id
      AND (
        p.creator_id = auth.uid() OR
        p.editor_id = auth.uid() OR
        p.client_id = auth.uid()
      )
  )
);

-- Payments policies
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (payer_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (payer_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can update own payments"
  ON public.payments FOR UPDATE
  USING (payer_id = auth.uid() OR recipient_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Database config policies
CREATE POLICY "Anyone can view database config"
  ON public.database_config FOR SELECT
  USING (true);

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- Notification preferences policies
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- Broadcast messages policies
CREATE POLICY "Only editors with elevated privileges can manage broadcast messages"
  ON public.broadcast_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
    )
  );

-- API keys policies
CREATE POLICY "Admins can manage API keys"
ON public.api_keys
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin activity logs policies
CREATE POLICY "Admins can view activity logs"
ON public.admin_activity_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert activity logs"
ON public.admin_activity_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Subscription plans policies
CREATE POLICY "Everyone can view subscription plans"
ON public.subscription_plans
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage subscription plans"
ON public.subscription_plans
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- INDEXES
-- =====================================================

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON public.api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON public.api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_resource_type ON public.admin_activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_sent_by ON public.broadcast_messages(sent_by);

-- =====================================================
-- REALTIME SUPPORT
-- =====================================================

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.video_feedback REPLICA IDENTITY FULL;

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default database config
INSERT INTO public.database_config (provider, config, is_active)
VALUES ('supabase', '{"name": "Lovable Cloud (Supabase)", "status": "active"}', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- END OF CONSOLIDATED SCHEMA
-- =====================================================


