import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Bot,
  Phone,
  MessageCircle,
  Ticket,
  Users
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "sonner";
import voxtroLogoDark from "@/assets/voxtro-logo-dark.png";

const menuItems = [
  { title: "Dashboard", url: "/customer-dashboard", icon: Home },
  { title: "Chatbots", url: "/customer-dashboard/conversations", icon: Bot },
  { title: "Voice Assistants", url: "/customer-dashboard/voice-assistants", icon: Phone },
  { title: "WhatsApp Agents", url: "/customer-dashboard/whatsapp-agents", icon: MessageCircle },
  { title: "Leads", url: "/customer-dashboard/leads", icon: Users },
  { title: "Support Tickets", url: "/customer-dashboard/support-tickets", icon: Ticket },
  { title: "Analytics", url: "/customer-dashboard/analytics", icon: BarChart3 },
  { title: "Settings", url: "/customer-dashboard/settings", icon: Settings },
];

interface CustomerSidebarProps {
  customLogo?: string | null;
}

export function CustomerSidebar({ customLogo }: CustomerSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const { customer, signOut } = useCustomerAuth();
  const { theme } = useTheme();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";

  const isActive = (path: string) => {
    if (path === "/customer-dashboard") {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  const getNavClass = (path: string) => {
    return isActive(path) 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "text-sidebar-foreground hover:bg-sidebar-accent/50";
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
  };

  // Use custom logo if provided, otherwise fall back to default
  const defaultLogoSrc = theme === "dark" 
    ? "https://ik.imagekit.io/wrewtbha2/Voxtro%20(1920%20x%201080%20px)%20(2).svg?updatedAt=1758764294633"
    : voxtroLogoDark;
  
  const logoSrc = customLogo || defaultLogoSrc;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b p-4 bg-white dark:bg-sidebar">
        <div className="flex items-center">
          <img src={logoSrc} alt="Company Logo" className="h-8 w-auto max-w-full object-contain" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/customer-dashboard"}
                      className={getNavClass(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button 
                    variant="ghost" 
                    onClick={handleSignOut}
                    className="w-full justify-start"
                  >
                    <LogOut className="h-4 w-4" />
                    {!collapsed && <span>Sign Out</span>}
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
