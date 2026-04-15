import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'Aestus LP Newsletter Tool',
  description: 'Internal quarterly LP newsletter bullet generator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {/* Slim top nav */}
          <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
              <span className="text-sm font-semibold tracking-tight text-gray-900">
                Aestus&nbsp;
                <span className="text-brand-500">Newsletter Tool</span>
              </span>
              {/* Clerk user button renders itself */}
              <div id="clerk-user" />
            </div>
          </header>

          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
