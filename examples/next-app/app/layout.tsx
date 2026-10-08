import type { ReactNode } from 'react';
import { ThemeProvider } from '@axonui/theme';
import '@axonui/theme/styles.css';
import '@axonui/core/styles.css';
import '@axonui/forms/styles.css';
import '@axonui/chat/styles.css';
import '@axonui/charts/styles.css';
import '@axonui/table/styles.css';

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
