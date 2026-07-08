import "./globals.css";

export const metadata = {
  title: "Welcome to FIFA Half-Time Show Party",
  description: "FIFA Half-Time Show Party landing page.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
