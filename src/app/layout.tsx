import "./globals.css";
import { ToastProvider } from "@/lib/toast";
import AuthProvider from "./auth-provider";
import ServiceWorkerRegistration from "./sw-register";

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
    <html lang="en">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
