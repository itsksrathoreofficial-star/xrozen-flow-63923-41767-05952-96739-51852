import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  DollarSign,
  FileText,
  Settings,
  Bell,
  Database,
  Box,
  ArrowLeft,
  HardDrive,
} from "lucide-react";

const adminMenuItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Database",
    url: "/admin/database",
    icon: Database,
  },
  {
    title: "Tables",
    url: "/admin/tables",
    icon: Box,
  },
  {
    title: "Query Console",
    url: "/admin/query",
    icon: FileText,
  },
  {
    title: "Migrations",
    url: "/admin/migrations",
    icon: FileText,
  },
  {
    title: "Backups",
    url: "/admin/backups",
    icon: HardDrive,
  },
  {
    title: "Users",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Projects",
    url: "/admin/projects",
    icon: Box,
  },
  {
    title: "Subscriptions",
    url: "/admin/subscriptions",
    icon: CreditCard,
  },
  {
    title: "Payments",
    url: "/admin/payments",
    icon: DollarSign,
  },
  {
    title: "Notifications",
    url: "/admin/notifications",
    icon: Bell,
  },
  {
    title: "Performance",
    url: "/admin/performance",
    icon: Settings,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
];

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/dashboard")}
                  tooltip="Back to Site"
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {!isCollapsed && <span>Back to Site</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Admin Panel</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => navigate(item.url)}
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <item.icon className="h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
