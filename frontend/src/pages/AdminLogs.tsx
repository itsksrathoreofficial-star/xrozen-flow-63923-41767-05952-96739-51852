import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAdminEmail } from "@/lib/adminAuth";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogs() {
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!isAdminEmail(user.email)) {
      toast.error("Unauthorized access");
      navigate("/dashboard");
      return;
    }
  };

  return (
    <AdminLayout title="System Activity Logs" description="Monitor system activities and admin actions">
      <div className="max-w-7xl">
        <Card className="shadow-elegant">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <CardTitle>Coming Soon</CardTitle>
            </div>
            <CardDescription>
              Activity logging is not yet implemented.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This feature requires database migration to create the admin_activity_logs table.
              It will be available after the SQLite migration is complete.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
