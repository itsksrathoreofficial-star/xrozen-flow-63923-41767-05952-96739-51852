import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserCircle,
  MessageSquare,
  FileText,
  User,
  Settings,
  Sparkles,
  Bell,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { apiClient } from "@/lib/api-client";

type UserRole = "editor" | "client" | "agency";

interface NavItem {
  title: string;
  url: string;
  icon: any;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["editor", "client", "agency"],
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderKanban,
    roles: ["editor", "client", "agency"],
  },
  {
    title: "Editors",
    url: "/editors",
    icon: UserCircle,
    roles: ["client", "agency"],
  },
  {
    title: "Clients",
    url: "/clients",
    icon: Users,
    roles: ["editor", "agency"],
  },
  {
    title: "Chat",
    url: "/chat",
    icon: MessageSquare,
    roles: ["editor", "client", "agency"],
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
    roles: ["editor", "client", "agency"],
  },
  {
    title: "Invoices",
    url: "/invoices",
    icon: FileText,
    roles: ["editor", "client", "agency"],
  },
  {
    title: "XrozenAI",
    url: "/xrozen-ai",
    icon: Sparkles,
    roles: ["editor", "client", "agency"],
  },
  {
    title: "Profile",
    url: "/profile",
    icon: User,
    roles: ["editor", "client", "agency"],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    roles: ["editor", "client", "agency"],
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    // Load user role using API client
    const loadUserRole = async () => {
      try {
        const user = await apiClient.getCurrentUser();
        if (!user) return;

        // Get user profile to determine role
        const profile = await apiClient.getProfile(user.id);
        if (profile) {
          setUserRole(profile.user_category as UserRole);
        }
      } catch (error) {
        console.error("Error loading user role:", error);
      }
    };

    loadUserRole();
  }, []);

  // Memoize filtered items for better performance
  const filteredNavItems = useMemo(() => 
    navItems.filter((item) =>
      userRole ? item.roles.includes(userRole) : true // Show all items by default
    ),
    [userRole]
  );

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <h2 className="text-xl font-bold gradient-text">Xrozen Workflow</h2>
        <div className="mt-2 px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-xs font-medium text-primary capitalize">
            {userRole || 'Loading...'} Account
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <p className="text-xs text-muted-foreground text-center">
          © 2025 Xrozen
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
