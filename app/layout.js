import './globals.css';

export const metadata = {
  title: 'Team MYTH — Phase 3 Tracker',
  description: 'Daily speaking and vocabulary progress tracker'
};

export default function RootLayout({ children }) {
  return <html lang="en" className="dark" suppressHydrationWarning><body>{children}</body></html>;
}
