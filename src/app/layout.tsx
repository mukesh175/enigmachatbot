import "./globals.css";
import { ToastProvider } from "@/lib/toast";
import AuthProvider from "./auth-provider";
import ServiceWorkerRegistration from "./sw-register";
import ThemeInit from "./theme-init";

export const metadata = {
  title: "LeadBot",
  description: "Lead-gen chatbot platform",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#ed5e4e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
        <ServiceWorkerRegistration />
        <ThemeInit />
      </body>
    </html>
  );
}
