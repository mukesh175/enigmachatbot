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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var accent = localStorage.getItem('leadbot_accent_color');
                if (accent) document.documentElement.style.setProperty('--accent-color', accent);
                var font = localStorage.getItem('leadbot_font_family');
                if (font) document.documentElement.style.setProperty('--app-font', font);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
