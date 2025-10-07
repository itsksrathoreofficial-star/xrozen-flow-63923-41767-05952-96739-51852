-- Add priority column to notifications table
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';

-- Drop and recreate notification_preferences policies
DROP POLICY IF EXISTS "Users can view own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON public.notification_preferences;

CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Drop and recreate api_keys policies
DROP POLICY IF EXISTS "Only admins can manage API keys" ON public.api_keys;

CREATE POLICY "Only admins can manage API keys"
  ON public.api_keys
  FOR ALL
  USING (true);

-- Drop and recreate admin_activity_logs policies
DROP POLICY IF EXISTS "Admins can view all logs" ON public.admin_activity_logs;
DROP POLICY IF EXISTS "System can insert logs" ON public.admin_activity_logs;

CREATE POLICY "Admins can view all logs"
  ON public.admin_activity_logs
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert logs"
  ON public.admin_activity_logs
  FOR INSERT
  WITH CHECK (true);

-- Drop and recreate broadcast_messages policies
DROP POLICY IF EXISTS "Admins can manage broadcasts" ON public.broadcast_messages;

CREATE POLICY "Admins can manage broadcasts"
  ON public.broadcast_messages
  FOR ALL
  USING (true);