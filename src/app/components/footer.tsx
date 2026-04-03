import Link from "next/link";
import styles from "./footer.module.css";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.content}>

                {/* LEFT */}
                <div className={styles.left}>

                    <div className={styles.info}>
                        <p>📍 unit 13 Telford Rd, Ferndown, Wimborne BH21 7QP, United Kingdom</p>
                        <p>
                            📞 <a href="tel:+447775457427">+44 7775 457427</a>
                        </p>
                    </div>

                    <div className={styles.socials}>
                        <a
                            href="https://www.instagram.com/prestige_kitchensandbedrooms/"
                            aria-label="Instagram"
                        >
                            <img src="/Instagram.webp" alt="Instagram" />
                        </a>
                        <a href="https://www.facebook.com/profile.php?id=61585955789857" aria-label="Facebook">
                            <img src="/Facebook.webp" alt="Facebook" />
                        </a>
                    </div>
                </div>

                {/* RIGHT */}
                <div className={styles.right}>
                    <div className={styles.legalLinks}>
                        <Link href="/privacy-policy">Privacy Policy</Link>
                        <Link href="/cookie-policy">Cookie Policy</Link>
                        <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>
                        <Link href="/returns-policy">Returns Policy</Link>
                    </div>

                    <a
                        href="https://launchset.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Website by <span className={styles.launchset}>Launchset</span>
                    </a>


                    <p className={styles.copy}>
                        © {new Date().getFullYear()} Prestige Construction — All Rights Reserved
                    </p>
                </div>

            </div>
        </footer>
    );
}
