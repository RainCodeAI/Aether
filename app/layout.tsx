// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aether • Intelligence OS",
  description: "Personal Data Fusion Platform",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A0A0C",
};

// Real Clerk keys look like pk_test_<50+ base64 chars>. The placeholder
// "pk_test_replace_me" is only 18 chars — length check distinguishes them.
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
const clerkReady = /^pk_(test|live)_/.test(clerkKey) && clerkKey.length > 40;

const clerkAppearance = {
  variables: {
    colorBackground: "#0D1117",
    colorInputBackground: "#0A0A0C",
    colorText: "#e2e8f0",
    colorTextSecondary: "#94a3b8",
    colorPrimary: "#06b6d4",
    colorDanger: "#f43f5e",
    borderRadius: "0.75rem",
    fontFamily: "inherit",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const inner = (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#0A0A0C] text-slate-200 overflow-hidden">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );

  return clerkReady ? (
    <ClerkProvider appearance={clerkAppearance}>{inner}</ClerkProvider>
  ) : (
    inner
  );
}
