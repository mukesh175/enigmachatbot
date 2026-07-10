import "./globals.css";

export const metadata = {
  title: "LeadBot",
  description: "Lead-gen chatbot platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
