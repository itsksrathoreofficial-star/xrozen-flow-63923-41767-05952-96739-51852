import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Receipt, Calendar, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { db } from "@/lib/database-config";

const BillingHistory = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Load user profile
      const profileData = await db.query({
        collection: 'profiles',
        operation: 'select',
        where: { id: session.user.id },
        limit: 1
      }) as any[];

      if (profileData && profileData.length > 0) {
        setProfile(profileData[0]);
      }

      // Load user's payment history (where user is either payer or recipient)
      const paymentsData = await db.query({
        collection: 'payments',
        operation: 'select',
        where: [
          { payer_id: session.user.id },
          { recipient_id: session.user.id }
        ]
      }) as any[];

      // Sort by created_at descending
      const sortedPayments = paymentsData?.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ) || [];

      setPayments(sortedPayments);
    } catch (error: any) {
      console.error("Load data error:", error);
      toast.error("Failed to load billing history");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, any> = {
      paid: { label: "Paid", className: "bg-success" },
      pending: { label: "Pending", className: "bg-warning" },
      overdue: { label: "Overdue", className: "bg-destructive" }
    };
    
    const config = configs[status] || configs.pending;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <AppSidebar />
        <div className="flex-1 bg-gradient-to-br from-background via-primary/5 to-success/5">
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="flex items-center px-6 py-4 gap-4">
              <SidebarTrigger />
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow">
                  <Receipt className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold">Billing History</h1>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate("/profile")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Profile
              </Button>
            </div>
          </header>

          <main className="px-8 py-8 max-w-6xl mx-auto">
            {/* Subscription Info Card */}
            {profile && (
              <Card className="shadow-elegant mb-6">
                <CardHeader>
                  <CardTitle>Current Subscription</CardTitle>
                  <CardDescription>Your active plan details</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Plan</p>
                      <p className="font-semibold capitalize">{profile.subscription_tier}</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
                      <p className="font-semibold">
                        {profile.subscription_active ? "Active" : "Inactive"}
                      </p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Monthly Fee</p>
                      <p className="font-semibold">
                        {profile.subscription_tier === 'basic' && '₹999'}
                        {profile.subscription_tier === 'pro' && '₹2,499'}
                        {profile.subscription_tier === 'premium' && '₹4,999'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment History */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>
                  All your transactions and invoices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No payment history found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold">
                                {payment.payment_type === 'freelance' ? 'Project Payment' : 'Salary Payment'}
                              </p>
                              {getStatusBadge(payment.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(payment.created_at)}
                              </span>
                              {payment.due_date && (
                                <span>Due: {formatDate(payment.due_date)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">
                            {formatAmount(payment.amount)}
                          </p>
                          {payment.paid_date && (
                            <p className="text-xs text-muted-foreground">
                              Paid on {formatDate(payment.paid_date)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default BillingHistory;
