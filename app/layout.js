import "./globals.css";

export const metadata = {
  title: "FIFA x BTS Half-Time Show",
  description: "A football-first invite experience with an admin view and Firestore storage.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
