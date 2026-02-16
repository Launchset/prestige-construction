"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import styles from "./navbar2.module.css";

const NAV_ITEMS = [
    { label: "Kitchens", href: "/kitchens" },
    { label: "Appliances", href: "/appliances" },
    { label: "Bedrooms", href: "/bedrooms" },
    { label: "Boot rooms", href: "/boot-rooms" },
    { label: "TV units", href: "/tv-units" },
    { label: "Flooring", href: "/flooring" },
    { label: "Crittall doors", href: "/crittall-doors" },
];

export default function Navbar2() {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <header className={styles.header}>
                <div className={styles.shell}>
                    {/* LOGO */}
                    <Link href="/" className={styles.logo}>
                        <div className={styles.logoInner}>
                            <div className={styles.logoTop}>PRESTIGE</div>
                            <div className={styles.logoBottom}>
                                KITCHENS &amp; BEDROOMS
                            </div>
                        </div>
                    </Link>

                    {/* DESKTOP NAV */}
                    <div className={styles.middle}>
                        <div className={styles.utilities}>
                            <input
                                className={styles.searchInput}
                                type="text"
                                placeholder="Search…"
                            />
                            <Link href="/profile" className={styles.profileBtn}>👤</Link>
                        </div>

                        <nav className={styles.tabs}>
                            {NAV_ITEMS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`${styles.tab} ${pathname === item.href ? styles.active : ""
                                        }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* DESKTOP BOOK */}
                    <div className={styles.right}>
                        <Link className={styles.bookBtn} href="/book">
                            Book now
                        </Link>
                    </div>

                    {/* MOBILE HAMBURGER */}
                    <button
                        className={styles.hamburger}
                        onClick={() => setMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        ☰
                    </button>
                </div>
            </header>

            {/* MOBILE MENU */}
            {menuOpen && (
                <div
                    className={styles.mobileOverlay}
                    onClick={() => setMenuOpen(false)}
                >
                    <div
                        className={styles.mobileMenu}
                        onClick={(e) => e.stopPropagation()}
                    >

                        <div className={styles.mobileSearchWrap}>
                            <input
                                className={styles.mobileSearch}
                                placeholder="Search…"
                            />
                        </div>


                        <nav className={styles.mobileNav}>
                            {NAV_ITEMS.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMenuOpen(false)}
                                    className={styles.mobileItem}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        <Link
                            href="/profile"
                            className={styles.mobileProfile}
                            onClick={() => setMenuOpen(false)}
                        >
                            👤 Profile
                        </Link>

                    </div>
                </div>
            )}

            {!menuOpen && (
                <Link href="/book" className={styles.floatingBook}>
                    Book now
                </Link>
            )}
        </>
    );
}
