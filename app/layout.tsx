export const metadata = {
  title: "Product Hunt MCP",
  description: "Product Hunt MCP server over Streamable HTTP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif", padding: "3rem", maxWidth: 640, margin: "0 auto", lineHeight: 1.6 }}>
        {children}
      </body>
    </html>
  );
}
