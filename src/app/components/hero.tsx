import Image from "next/image";
import styles from "./hero.module.css";

export default function Hero() {
    return (
        <section className={styles.hero}>
            <div className={styles.text}>
                <span className={styles.eyebrow}>FREE DESIGN CONSULTATIONS</span>

                <h1>Book a Design Appointment</h1>

                <p>
                    Kick-start your kitchen project with a free design consultation.
                    Our expert designers work with you to create a space that fits
                    your home, lifestyle, and budget.
                </p>

                <button className={styles.cta}>
                    Book your free design appointment
                </button>
            </div>

            <div className={styles.imagesOuter}>
                <div className={styles.images}>
                    <div className={styles.imageWrap}>
                        <Image
                            src="/heroimage.png"
                            alt="Kitchen design consultation"
                            fill
                            priority
                            className={styles.image}
                        />
                    </div>

                    <div className={styles.imageWrap}>
                        <Image
                            src="/heroimage2.png"
                            alt="Finished premium kitchen design"
                            fill
                            className={styles.image}
                        />
                    </div>
                </div>
            </div>

        </section>
    );
}
