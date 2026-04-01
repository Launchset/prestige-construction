import "./globals.css";
import Navbar2 from "./components/navbar2";
import Footer from "./components/footer";

const assetsOrigin = process.env.NEXT_PUBLIC_ASSETS_BASE?.replace(/\/+$/, "") ?? "";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {assetsOrigin ? (
          <>
            <link rel="preconnect" href={assetsOrigin} crossOrigin="" />
            <link rel="dns-prefetch" href={assetsOrigin} />
          </>
        ) : null}
      </head>
      <body>
        <Navbar2 />
        <div className="contentWrapper">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
