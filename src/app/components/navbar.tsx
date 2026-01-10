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
        {/* LOGO */}
        <Link href="/" className={styles.logo} aria-label="Prestige home">
          <div className={styles.logoInner}>
            <div className={styles.logoTop}>PRESTIGE</div>
            <div className={styles.logoBottom}>
              KITCHENS &amp; BEDROOMS
            </div>
          </div>
        </Link>

        {/* NAV BUTTONS (scrollable if needed) */}
        <nav className={styles.tabs} aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.tab} ${isActive ? styles.active : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT SIDE */}
        <div className={styles.right}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Search…"
          />
          <Link className={styles.bookBtn} href="/book">
            Book now
          </Link>
        </div>
      </div>
    </header>
  );
}
