import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CustomerAuthProvider } from "@/hooks/useCustomerAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ThemeProvider } from "@/components/ThemeProvider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Chatbots from "./pages/Chatbots";
import CreateChatbot from "./pages/CreateChatbot";
import EditChatbot from "./pages/EditChatbot";
import EmbedChat from "./pages/EmbedChat";
import Messenger from "./pages/Messenger";
import WidgetTest from "./pages/WidgetTest";
import Conversations from "./pages/Conversations";
import Usage from "./pages/Usage";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Forms from "./pages/Forms";
import Flows from "./pages/Flows";
import { CustomerAuth } from "./pages/CustomerAuth";
import { CustomerDashboardLayout } from "@/components/CustomerDashboardLayout";
import { CustomerOverview } from "./pages/customer/CustomerOverview";
import { CustomerConversationsPage } from "./pages/customer/CustomerConversationsPage";
import CustomerVoiceAssistantsPage from "./pages/customer/CustomerVoiceAssistantsPage";
import CustomerWhatsAppAgentsPage from "./pages/customer/CustomerWhatsAppAgentsPage";
import { CustomerFormsPage } from "./pages/customer/CustomerFormsPage";
import { CustomerAnalyticsPage } from "./pages/customer/CustomerAnalyticsPage";
import { CustomerSettingsPage } from "./pages/customer/CustomerSettingsPage";
import { CustomerManagement } from "./pages/CustomerManagement";
import VoiceAssistants from "./pages/VoiceAssistants";
import EditVoiceAssistant from "./pages/EditVoiceAssistant";
import WhatsAppAgents from "./pages/WhatsAppAgents";
import Documentation from "./pages/Documentation";
import ApiReference from "./pages/ApiReference";
import Guides from "./pages/Guides";
import Support from "./pages/Support";
import Status from "./pages/Status";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Cookies from "./pages/Cookies";
import NotFound from "./pages/NotFound";
import Changelog from "./pages/Changelog";
import VoiceAssistantTasks from "./pages/VoiceAssistantTasks";
import SupportTickets from "./pages/SupportTickets";
import CustomerSupportTicketsPage from "./pages/customer/CustomerSupportTicketsPage";
import CustomerLeadsPage from "./pages/customer/CustomerLeadsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="voxtro-ui-theme">
      <AuthProvider>
        <CustomerAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
                <Route path="/chatbots" element={<DashboardLayout><Chatbots /></DashboardLayout>} />
                <Route path="/conversations" element={<DashboardLayout><Conversations /></DashboardLayout>} />
                <Route path="/forms" element={<DashboardLayout><Forms /></DashboardLayout>} />
                <Route path="/flows" element={<DashboardLayout><Flows /></DashboardLayout>} />
                <Route path="/customers" element={<DashboardLayout><CustomerManagement /></DashboardLayout>} />
                <Route path="/voice-assistants" element={<DashboardLayout><VoiceAssistants /></DashboardLayout>} />
                <Route path="/voice-assistants/:assistantId/edit" element={<EditVoiceAssistant />} />
                <Route path="/voice-tasks" element={<DashboardLayout><VoiceAssistantTasks /></DashboardLayout>} />
                <Route path="/whatsapp-agents" element={<DashboardLayout><WhatsAppAgents /></DashboardLayout>} />
                <Route path="/usage" element={<DashboardLayout><Usage /></DashboardLayout>} />
                <Route path="/support-tickets" element={<DashboardLayout><SupportTickets /></DashboardLayout>} />
                <Route path="/settings" element={<DashboardLayout><Settings /></DashboardLayout>} />
                <Route path="/billing" element={<DashboardLayout><Billing /></DashboardLayout>} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/create-chatbot" element={<CreateChatbot />} />
                <Route path="/edit-chatbot/:chatbotId" element={<EditChatbot />} />
                <Route path="/embed/:chatbotId" element={<EmbedChat />} />
                <Route path="/messenger/:chatbotId" element={<Messenger />} />
                <Route path="/widget-test" element={<WidgetTest />} />
                <Route path="/customer-login" element={<CustomerAuth />} />
                <Route path="/customer-dashboard" element={<CustomerDashboardLayout />}>
                  <Route index element={<CustomerOverview />} />
                  <Route path="conversations" element={<CustomerConversationsPage />} />
                  <Route path="voice-assistants" element={<CustomerVoiceAssistantsPage />} />
                  <Route path="whatsapp-agents" element={<CustomerWhatsAppAgentsPage />} />
                  <Route path="leads" element={<CustomerLeadsPage />} />
                  <Route path="support-tickets" element={<CustomerSupportTicketsPage />} />
                  <Route path="forms" element={<CustomerFormsPage />} />
                  <Route path="analytics" element={<CustomerAnalyticsPage />} />
                  <Route path="settings" element={<CustomerSettingsPage />} />
                </Route>
                <Route path="/docs" element={<Documentation />} />
                <Route path="/api" element={<ApiReference />} />
                <Route path="/guides" element={<Guides />} />
                <Route path="/support" element={<Support />} />
                <Route path="/status" element={<Status />} />
                <Route path="/about" element={<About />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/cookies" element={<Cookies />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CustomerAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
