export const metadata = {
  title: 'OpenClaw Platform - Deploy in 1 Minute',
  description: 'One-click deploy your own OpenClaw instance',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}