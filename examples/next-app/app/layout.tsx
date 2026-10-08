import type { ReactNode } from 'react';
import { ThemeProvider } from '@axon/theme';
import '@axon/theme/styles.css';
import '@axon/core/styles.css';
import '@axon/forms/styles.css';
import '@axon/chat/styles.css';
import '@axon/charts/styles.css';
import '@axon/table/styles.css';

export const metadata = {
  title: 'Axon UI in Next.js',
  description: 'An app router project using every Axon package.',
};

// This is a server component. ThemeProvider (and every other Axon component) is a client component
// by way of its package's "use client" banner, so it can be rendered here without a wrapper.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ThemeProvider defaultMode="system">{children}</ThemeProvider>
      </body>
    </html>
  );
}
