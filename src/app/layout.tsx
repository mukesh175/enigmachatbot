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
  themeColor: "#6d3ef7",
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
