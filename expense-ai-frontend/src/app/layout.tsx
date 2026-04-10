import './globals.css';
import { Manrope } from 'next/font/google';
import SecretAnalyticsShortcut from '../components/SecretAnalyticsShortcut';
import SharedChatbot from '../components/chat/SharedChatbot';

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'Lifewood Finance AI',
  description: 'Manage scanned Google Drive finance workspaces with Lifewood branding',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={manrope.className}>
        {children}
        <SecretAnalyticsShortcut />
        <SharedChatbot />
      </body>
    </html>
  );
}
