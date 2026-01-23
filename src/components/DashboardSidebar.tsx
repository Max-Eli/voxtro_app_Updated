import { Home, Settings, BarChart3, Users, FileText, Workflow, Bot, Phone, ClipboardList, CheckSquare, MessageCircle, Ticket, LogOut, Mic, ExternalLink } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import voxtroLogoDark from "@/assets/voxtro-logo-dark.png";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Voice Assistants",
    url: "/voice-assistants",
    icon: Phone,
  },
  {
    title: "WhatsApp Agents",
    url: "/whatsapp-agents",
    icon: MessageCircle,
  },
  {
    title: "Chatbots",
    url: "/chatbots",
    icon: Bot,
  },
  {
    title: "Tasks",
    url: "/voice-tasks",
    icon: CheckSquare,
  },
  {
    title: "Forms",
    url: "/forms",
    icon: FileText,
  },
  {
    title: "Flows",
    url: "/flows",
    icon: Workflow,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: Users,
  },
  {
    title: "Support Tickets",
    url: "/support-tickets",
    icon: Ticket,
  },
  {
    title: "Usage",
    url: "/usage",
    icon: BarChart3,
  },
  {
    title: "Changelog",
    url: "/changelog",
    icon: ClipboardList,
  },
];

const accountItems = [
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { theme } = useTheme();
  const { signOut } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50";

  const isCollapsed = state === "collapsed";

  const logoSrc = theme === "dark" 
    ? "https://ik.imagekit.io/wrewtbha2/Voxtro%20(1920%20x%201080%20px)%20(2).svg?updatedAt=1758764294633"
    : voxtroLogoDark;

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = "/auth";
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to sign out: ${error?.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar
      className={isCollapsed ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <div className="p-4 border-b bg-white dark:bg-sidebar">
        <div className="flex items-center justify-start">
          <img src={logoSrc} alt="Voxtro" className="h-10 w-auto" />
        </div>
      </div>
      
      <SidebarContent>
        <SidebarGroup>
          <div className="flex items-center justify-between">
            {!isCollapsed && <SidebarGroupLabel>Navigation</SidebarGroupLabel>}
            <SidebarTrigger className={isCollapsed ? "mx-auto" : ""} />
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a
                    href="https://build.voxtro.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sidebar-foreground hover:bg-sidebar-accent/50 flex items-center"
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    {!isCollapsed && (
                      <>
                        <span>Voice Agent Studio</span>
                        <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
                      </>
                    )}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClass}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={handleLogout}
              className="text-sidebar-foreground hover:bg-sidebar-accent/50 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {!isCollapsed && <span>Sign Out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}