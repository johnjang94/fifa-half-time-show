import "./globals.css";
import { BackgroundMusic } from "../components/background-music";

export const metadata = {
  title: "FIFA X BTS Watch Party",
  description: "FIFA Half-Time Show Party landing page.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <BackgroundMusic />
        {children}
      </body>
    </html>
  );
}
