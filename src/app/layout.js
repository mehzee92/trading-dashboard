import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Trading Dashboard",
  description: "Trading Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Trading Dashboard</title>
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content="Trading Dashboard" />
        <meta property="og:description" content="Trading Dashboard with order book, top of book and live chart from tradingview." />
        <meta property="og:image" content="%PUBLIC_URL%/trading.png" />
        <meta property="og:url" content="https://abigailmorales-tradingdashboard.vercel.app/" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
