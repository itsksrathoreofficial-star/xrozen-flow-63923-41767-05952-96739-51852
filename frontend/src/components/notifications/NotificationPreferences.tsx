import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NOTIFICATION_EVENTS = [
  { key: 'project_created', label: 'Project Created', category: 'Projects' },
  { key: 'project_assigned', label: 'Project Assigned', category: 'Projects' },
  { key: 'project_status_changed', label: 'Project Status Changed', category: 'Projects' },
  { key: 'version_added', label: 'New Version Added', category: 'Projects' },
  { key: 'deadline_approaching', label: 'Deadline Approaching', category: 'Projects' },
  { key: 'deadline_overdue', label: 'Deadline Overdue', category: 'Projects' },
  { key: 'feedback_added', label: 'Feedback Added', category: 'Feedback' },
  { key: 'correction_requested', label: 'Correction Requested', category: 'Feedback' },
  { key: 'project_approved', label: 'Project Approved', category: 'Feedback' },
  { key: 'invoice_generated', label: 'Invoice Generated', category: 'Payments' },
  { key: 'invoice_due', label: 'Invoice Due', category: 'Payments' },
  { key: 'payment_received', label: 'Payment Received', category: 'Payments' },
  { key: 'chat_message', label: 'Chat Message', category: 'Communication' },
];

export function NotificationPreferences() {
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<any>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No preferences exist, create default
        const defaultPrefs = {
          user_id: user.id,
          email_notifications: {},
          in_app_notifications: {},
        };

        const { data: newPrefs, error: insertError } = await supabase
          .from('notification_preferences')
          .insert(defaultPrefs)
          .select()
          .single();

        if (insertError) throw insertError;
        data = newPrefs;
      } else if (error) {
        throw error;
      }

      setPreferences(data);
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (eventKey: string, channel: 'email' | 'in_app', enabled: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channelKey = channel === 'email' ? 'email_notifications' : 'in_app_notifications';
      const currentPrefs = preferences?.[channelKey] || {};
      const newPrefs = { ...currentPrefs, [eventKey]: enabled };

      const { error } = await supabase
        .from('notification_preferences')
        .update({ [channelKey]: newPrefs })
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences({
        ...preferences,
        [channelKey]: newPrefs,
      });

      toast.success('Preferences updated');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  if (loading) {
    return <div>Loading preferences...</div>;
  }

  const categories = [...new Set(NOTIFICATION_EVENTS.map(e => e.category))];

  return (
    <div className="space-y-6">
      {categories.map((category) => (
        <Card key={category} className="shadow-elegant">
          <CardHeader>
            <CardTitle>{category}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {NOTIFICATION_EVENTS.filter(e => e.category === category).map((event) => (
              <div key={event.key}>
                <div className="font-medium mb-2">{event.label}</div>
                <div className="flex items-center gap-6 ml-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={preferences?.in_app_notifications?.[event.key] !== false}
                      onCheckedChange={(checked) => updatePreference(event.key, 'in_app', checked)}
                    />
                    <Label>In-App</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={preferences?.email_notifications?.[event.key] !== false}
                      onCheckedChange={(checked) => updatePreference(event.key, 'email', checked)}
                    />
                    <Label>Email</Label>
                  </div>
                </div>
                <Separator className="mt-4" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
