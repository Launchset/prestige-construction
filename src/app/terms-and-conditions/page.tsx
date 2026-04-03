import Link from "next/link";
import styles from "../legal.module.css";

export const metadata = {
  title: "Terms & Conditions | Prestige Kitchens & Bedrooms",
  description: "Website, account, enquiry, and order terms for Prestige Kitchens & Bedrooms customers.",
};

export default function TermsAndConditionsPage() {
  return (
    <main className={styles.page}>
      <article className={styles.shell}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>Terms &amp; Conditions</h1>
        <p className={styles.meta}>Last updated: 3 April 2026</p>
        <p className={styles.intro}>
          These terms apply when you use this website, create an account, send an
          enquiry, or place an order through online checkout. Additional written
          quotation, installation, or bespoke-project terms may also apply to
          fitted kitchens, bedrooms, and made-to-order work.
        </p>

        <div className={styles.sectionList}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Who operates this website</h2>
            <p>
              This website is operated by Prestige Kitchens and Bedrooms Limited,
              company number 16906440, trading from Unit 13 Telford Road,
              Ferndown, Wimborne, BH21 7QP, United Kingdom.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Use of the website</h2>
            <ul>
              <li>
                You must not misuse the website, attempt unauthorised access,
                interfere with security controls, upload malicious content, or use
                automated scraping in a way that harms service performance or
                infringes rights.
              </li>
              <li>
                We may update, suspend, or withdraw parts of the website for
                maintenance, security, stock updates, or commercial reasons.
              </li>
              <li>
                Product images, dimensions, finishes, colours, and availability are
                provided in good faith but may vary slightly depending on supplier
                updates, display settings, or installation context.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Accounts</h2>
            <ul>
              <li>
                You are responsible for keeping your login details secure and for
                activity that occurs under your account unless caused by our breach
                of security.
              </li>
              <li>
                The email address on your account is used to link orders to your
                order history and may be used for order-related service contact.
              </li>
              <li>
                We may disable or restrict an account where reasonably necessary to
                investigate abuse, fraud, unlawful use, or security risk.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Enquiries and design consultations</h2>
            <p>
              Submitting an enquiry or requesting a free design consultation does
              not create an obligation for either party to proceed with a purchase
              or installation contract. Any quote or proposal is subject to survey,
              supplier availability, written confirmation, and any additional
              project-specific terms issued to you.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Online orders and payment</h2>
            <ul>
              <li>
                Some products may be available for direct online checkout. Others
                may require enquiry, survey, or bespoke quotation first.
              </li>
              <li>
                Payment is processed through Stripe. A contract for an online order
                is formed when payment is accepted and we confirm the order,
                subject to any lawful cancellation rights and any fraud or pricing
                error checks.
              </li>
              <li>
                If a product is unavailable, incorrectly priced, or cannot be
                fulfilled for a lawful reason, we may cancel the order and refund
                sums paid for that order.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Delivery, installation, and access</h2>
            <ul>
              <li>
                Delivery and installation dates are estimates unless expressly
                agreed otherwise in writing.
              </li>
              <li>
                You are responsible for ensuring safe access, accurate delivery
                information, and site readiness for any installation appointment.
              </li>
              <li>
                If access is unavailable or site conditions are not ready, we may
                need to reschedule and may charge reasonable additional costs where
                permitted by law and agreed project terms.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>7. Returns, cancellation, and faulty goods</h2>
            <p>
              Returns and cancellation are governed by our{" "}
              <Link href="/returns-policy">Returns &amp; Cancellation Policy</Link>,
              any product-specific terms, and your statutory consumer rights. Those
              rights are not excluded by these terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>8. Intellectual property</h2>
            <p>
              Website content, branding, page designs, product presentation,
              imagery, and software are protected by intellectual property rights
              owned by us or our licensors/suppliers. You may view and use the
              site for personal purchasing and enquiry purposes, but you must not
              copy, republish, or commercially exploit site content without
              permission.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>9. Liability</h2>
            <ul>
              <li>
                Nothing in these terms excludes or limits liability for fraud,
                fraudulent misrepresentation, death or personal injury caused by
                negligence, or any liability that cannot lawfully be excluded.
              </li>
              <li>
                Nothing in these terms reduces your non-excludable statutory rights
                as a consumer.
              </li>
              <li>
                To the extent permitted by law, we are not responsible for business
                losses, lost profit, lost data, or indirect losses arising from
                consumer use of the website, except where caused by rights that
                cannot legally be excluded.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>10. Privacy and cookies</h2>
            <p>
              Our handling of personal data and cookies is explained in the{" "}
              <Link href="/privacy-policy">Privacy Policy</Link> and{" "}
              <Link href="/cookie-policy">Cookie Policy</Link>.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>11. Governing law</h2>
            <p>
              These terms are governed by the laws of England and Wales. If you are
              a consumer, you may also have mandatory rights in the part of the UK
              where you live. Courts will have jurisdiction in accordance with
              applicable consumer and civil procedure rules.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
