import "./globals.css";
import Navbar2 from "./components/navbar2";
import Footer from "./components/footer";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar2 />
        {children}
        <Footer />
      </body>

    </html>
  );
}
