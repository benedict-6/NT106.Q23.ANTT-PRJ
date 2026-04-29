import { Inter } from 'next/font/google';
import './globals.css';

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
        {children}
      </body>
    </html>
  );
}
