"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./navbar.module.css";

const NAV_ITEMS = [
  { label: "Kitchens", href: "/kitchens" },
  { label: "Appliances", href: "/appliances" },
  { label: "Bedrooms", href: "/bedrooms" },
  { label: "Boot rooms", href: "/boot-rooms" },
  { label: "TV units", href: "/tv-units" },
  { label: "Flooring", href: "/flooring" },
  { label: "Crittall doors", href: "/crittall-doors" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <div className={styles.shell}>
        {/* LEFT: LOGO */}
        <Link href="/" className={styles.logo}>
          <div className={styles.logoInner}>
            <div className={styles.logoTop}>PRESTIGE</div>
            <div className={styles.logoBottom}>
              KITCHENS &amp; BEDROOMS
            </div>
          </div>
        </Link>

        {/* CENTER: NAV BUTTONS */}
        <nav className={styles.tabs}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.tab} ${isActive ? styles.active : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT: SEARCH ABOVE BOOK NOW */}
        <div className={styles.right}>
          <input
            type="text"
            placeholder="Search…"
            className={styles.searchInput}
          />

          <Link href="/book" className={styles.bookBtn}>
            Book now
          </Link>
        </div>
      </div>
    </header>
  );
}
