import styles from "./whathappensnext.module.css";
import Image from "next/image";

export default function WhatHappensNext() {
    return (
        <section className={styles.process}>
            <div className={styles.inner}>

                <h2 className={styles.title}>
                    What Happens After You Book
                </h2>

                <p className={styles.subtitle}>
                    Here’s what you can expect once you’ve booked your free design
                    consultation with our expert team.
                </p>

                <div className={styles.grid}>
                    <div className={styles.step}>
                        <Image
                            src="/icons/consultation.webp"
                            alt="Free design consultation"
                            width={112}
                            height={112}
                        />
                        <h3>Free Design Consultation</h3>
                        <p>
                            Meet with one of our expert designers to discuss your space, style,
                            and budget.
                        </p>
                    </div>

                    <div className={styles.step}>
                        <Image
                            src="/icons/design-quote.webp"
                            alt="Tailored design and quotation"
                            width={112}
                            height={112}
                        />
                        <h3>Tailored Design & Quotation</h3>
                        <p>
                            We create a bespoke kitchen or bedroom design with a clear,
                            transparent quote.
                        </p>
                    </div>

                    <div className={styles.step}>
                        <Image
                            src="/icons/approval.webp"
                            alt="Refinement and approval"
                            width={112}
                            height={112}
                        />
                        <h3>Refinement & Approval</h3>
                        <p>
                            We fine-tune every detail until you’re completely happy with the
                            final design.
                        </p>
                    </div>

                    <div className={styles.step}>
                        <Image
                            src="/icons/installation.webp"
                            alt="Professional installation"
                            width={112}
                            height={112}
                        />
                        <h3>Professional Installation</h3>
                        <p>
                            Our experienced team delivers and installs your project with care
                            and precision.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
