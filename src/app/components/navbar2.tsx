"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./navbar2.module.css";

const NAV_ITEMS = [
    { label: "Appliances", href: "/appliances" },
    { label: "Sinks", href: "/sinks-taps-sinks" },
    { label: "Taps", href: "/sinks-taps-taps" },
];

export default function Navbar2() {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isHidden, setIsHidden] = useState(false);
    const lastScrollYRef = useRef(0);
    const tickingRef = useRef(false);

    useEffect(() => {
        lastScrollYRef.current = window.scrollY;

        const updateNavbarVisibility = () => {
            const currentScrollY = window.scrollY;
            const isScrollingDown = currentScrollY > lastScrollYRef.current;
            const shouldHide = currentScrollY > 100 && isScrollingDown && !menuOpen;

            setIsHidden((prev) => (prev === shouldHide ? prev : shouldHide));
            lastScrollYRef.current = currentScrollY;
            tickingRef.current = false;
        };

        const handleScroll = () => {
            if (tickingRef.current) {
                return;
            }

            tickingRef.current = true;
            window.requestAnimationFrame(updateNavbarVisibility);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, [menuOpen]);

    return (
        <>
            <header className={`${styles.header} ${isHidden ? styles.hidden : ""}`}>
                <div className={styles.shell}>
                    <Link href="/" className={styles.logo}>
                        <Image
                            src="/logo.png"
                            alt="Prestige Kitchens and Bedrooms"
                            width={232}
                            height={87}
                            priority
                            className={styles.logoImage}
                        />
                    </Link>

                    <nav className={styles.desktopNav}>
                        {NAV_ITEMS.map((item, index) => (
                            <div key={item.href} className={styles.navItemWrap}>
                                <Link
                                    href={item.href}
                                    className={`${styles.tab} ${pathname === item.href ? styles.active : ""
                                        }`}
                                >
                                    {item.label}
                                </Link>

                                {index < NAV_ITEMS.length - 1 && (
                                    <span className={styles.navDot} aria-hidden="true">
                                        •
                                    </span>
                                )}
                            </div>
                        ))}
                    </nav>

                    <div className={styles.actions}>
                        <Link href="/account" className={styles.profileBtn}>
                            <span className={styles.profileIcon} aria-hidden="true">
                                ○
                            </span>
                            Account
                        </Link>

                        <Link className={styles.bookBtn} href="/enquire">
                            Enquire
                        </Link>
                    </div>

                    <button
                        className={styles.hamburger}
                        onClick={() => setMenuOpen(true)}
                        aria-label="Open menu"
                    >
                        ☰
                    </button>
                </div>
            </header>

            {menuOpen && (
                <div
                    className={styles.mobileOverlay}
                    onClick={() => setMenuOpen(false)}
                >
                    <div
                        className={styles.mobileMenu}
                        onClick={(e) => e.stopPropagation()}
                    >
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
                            href="/account"
                            className={styles.mobileProfile}
                            onClick={() => setMenuOpen(false)}
                        >
                            Account
                        </Link>

                        <Link
                            href="/enquire"
                            className={styles.mobileCta}
                            onClick={() => setMenuOpen(false)}
                        >
                            Enquire
                        </Link>
                    </div>
                </div>
            )}
        </>
    );
}
