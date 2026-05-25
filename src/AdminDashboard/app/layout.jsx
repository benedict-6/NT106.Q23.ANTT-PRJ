import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata = {
  title: 'Monitor UI',
  description: 'Modern Security Operations Center Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="bg-[#0A0A0A] text-gray-100 min-h-screen font-sans" suppressHydrationWarning>
        <Toaster position="top-right" maxCount={3} toastOptions={{
          style: { background: '#111111', color: '#fff', border: '1px solid #2A2A2A', },
          success: { iconTheme: { primary: '#22c55e', secondary: '#111111' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#111111' } },
        }} />
        {children}
      </body>
    </html>
  );
}
