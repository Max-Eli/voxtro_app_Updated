import { useLocation } from "react-router-dom";
import { ThemeProvider } from "./ThemeProvider";

/**
 * Portal-aware theme provider that uses different storage keys
 * for customer portal vs admin portal to keep themes separate
 */
export function PortalThemeProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  // Determine if we're on the customer portal
  const isCustomerPortal = location.pathname.startsWith("/customer-");

  // Use different storage keys for customer vs admin
  const storageKey = isCustomerPortal ? "voxtro-customer-theme" : "voxtro-admin-theme";

  return (
    <ThemeProvider defaultTheme="dark" storageKey={storageKey}>
      {children}
    </ThemeProvider>
  );
}
