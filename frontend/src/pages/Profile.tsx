import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Crown, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [userCategory, setUserCategory] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const user = await apiClient.getCurrentUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // TODO: Load profile from API
      setProfile(user);
      setFullName(user.full_name || "");
      setUserCategory(user.user_category || "editor");
      setSubscriptionTier(user.subscription_tier || "basic");
    } catch (error: any) {
      console.error("Load profile error:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) {
      toast.error("Profile not loaded");
      return;
    }
    
    setSaving(true);

    try {
      // TODO: Implement profile update API
      toast.success("Profile updated successfully!");
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getTierBadge = (tier: string) => {
    const configs: Record<string, any> = {
      basic: { label: "Basic", className: "bg-secondary" },
      pro: { label: "Pro", className: "bg-primary" },
      premium: { label: "Premium", className: "bg-success" }
    };
    
    const config = configs[tier] || configs.basic;
    return (
      <Badge className={config.className}>
        <Crown className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
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
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold">Profile & Settings</h1>
              </div>
            </div>
          </header>

          <main className="px-8 py-8 max-w-4xl mx-auto">
            <div className="grid gap-6">
              {/* Subscription Card */}
              <Card className="shadow-elegant">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Current Subscription</CardTitle>
                      <CardDescription>Manage your plan and billing</CardDescription>
                    </div>
                    {getTierBadge(profile?.subscription_tier)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium capitalize">{profile?.subscription_tier} Plan</p>
                        <p className="text-sm text-muted-foreground">
                          {profile?.subscription_active ? "Active" : "Inactive"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          {profile?.subscription_tier === 'basic' && '₹999'}
                          {profile?.subscription_tier === 'pro' && '₹2,499'}
                          {profile?.subscription_tier === 'premium' && '₹4,999'}
                        </p>
                        <p className="text-sm text-muted-foreground">/month</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        className="gradient-primary"
                        onClick={() => navigate("/subscription-select")}
                      >
                        Upgrade Plan
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => navigate("/billing-history")}
                      >
                        Billing History
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Information Card */}
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your account details</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile?.email || ""}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fullname">Full Name</Label>
                      <Input
                        id="fullname"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Account Type</Label>
                      <Select value={userCategory} onValueChange={setUserCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="agency">Agency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full gradient-primary" 
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Profile;
