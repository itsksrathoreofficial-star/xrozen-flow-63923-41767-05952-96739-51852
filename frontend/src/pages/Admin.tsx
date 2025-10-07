import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CreditCard, DollarSign, Video, Bell, Settings, FileText } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { isAdminEmail } from "@/lib/adminAuth";

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProjects: 0,
    totalRevenue: 0,
    activeSubscriptions: 0
  });

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const user = await apiClient.getCurrentUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is admin (already checked by AdminLayout, but double-check for safety)
      if (!isAdminEmail(user.email)) {
        toast.error("Unauthorized access");
        navigate("/dashboard");
        return;
      }

      // Load stats using API client
      const usersData = await apiClient.getProfiles();
      const projectsData = await apiClient.getProjects();
      const paymentsData = await apiClient.getPayments();

      setStats({
        totalUsers: usersData?.length || 0,
        totalProjects: projectsData?.length || 0,
        totalRevenue: paymentsData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0,
        activeSubscriptions: usersData?.filter(user => user.subscription_active).length || 0
      });

    } catch (error: any) {
      console.error("Error loading admin data:", error);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Admin Dashboard" description="Manage users, payments, and system settings">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Admin Dashboard" description="Manage users, payments, and system settings">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Video className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalProjects}</div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">₹{stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Badge className="bg-success">{stats.activeSubscriptions}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeSubscriptions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Cards */}
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Access admin panel sections</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            className="h-auto py-4 flex-col gap-2"
            variant="outline"
            onClick={() => navigate("/admin/users")}
          >
            <Users className="w-6 h-6" />
            <span>User Management</span>
          </Button>
          
          <Button 
            className="h-auto py-4 flex-col gap-2"
            variant="outline"
            onClick={() => navigate("/admin/projects")}
          >
            <Video className="w-6 h-6" />
            <span>Projects Oversight</span>
          </Button>

          <Button 
            className="h-auto py-4 flex-col gap-2"
            variant="outline"
            onClick={() => navigate("/admin/subscriptions")}
          >
            <CreditCard className="w-6 h-6" />
            <span>Subscriptions</span>
          </Button>

          <Button 
            className="h-auto py-4 flex-col gap-2"
            variant="outline"
            onClick={() => navigate("/admin/payments")}
          >
            <DollarSign className="w-6 h-6" />
            <span>Payments</span>
          </Button>

          <Button 
            className="h-auto py-4 flex-col gap-2"
            variant="outline"
            onClick={() => navigate("/admin/plans-management")}
          >
            <FileText className="w-6 h-6" />
            <span>Plans Management</span>
          </Button>

          <Button 
            className="h-auto py-4 flex-col gap-2"
            variant="outline"
            onClick={() => navigate("/admin/notifications")}
          >
            <Bell className="w-6 h-6" />
            <span>Notifications</span>
          </Button>

          <Button 
            className="h-auto py-4 flex-col gap-2"
            variant="outline"
            onClick={() => navigate("/admin/api")}
          >
            <Settings className="w-6 h-6" />
            <span>API Management</span>
          </Button>

          <Button 
            className="h-auto py-4 flex-col gap-2"
            variant="outline"
            onClick={() => navigate("/admin/settings")}
          >
            <Settings className="w-6 h-6" />
            <span>Settings</span>
          </Button>

          <Button 
            className="h-auto py-4 flex-col gap-2"
            variant="outline"
            onClick={() => navigate("/admin/logs")}
          >
            <FileText className="w-6 h-6" />
            <span>System Logs</span>
          </Button>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default Admin;
