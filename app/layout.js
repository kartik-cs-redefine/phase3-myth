import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata = {
  title: 'Team MYTH — Phase 3 Tracker',
  description: 'Daily speaking and vocabulary progress tracker'
};

export default function RootLayout({ children }) {
  return <html lang="en" className="dark" suppressHydrationWarning><body className={inter.variable}>{children}</body></html>;
}
