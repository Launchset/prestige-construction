import Link from "next/link";
import styles from "../legal.module.css";

export const metadata = {
  title: "Privacy Policy | Prestige Kitchens & Bedrooms",
  description: "How Prestige Kitchens & Bedrooms collects, uses, stores, and protects personal data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.shell}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.meta}>Last updated: 3 April 2026</p>
        <p className={styles.intro}>
          This Privacy Policy explains how Prestige Kitchens and Bedrooms Limited
          (&quot;we&quot;, &quot;us&quot;, and &quot;our&quot;) collects and uses personal data through
          this website, customer account features, enquiries, and order workflows.
        </p>

        <div className={styles.sectionList}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Who we are</h2>
            <p>
              Prestige Kitchens and Bedrooms Limited is the data controller for the
              personal data handled through this website.
            </p>
            <ul>
              <li>
                <strong>Company number:</strong> 16906440
              </li>
              <li>
                <strong>Trading address:</strong> Unit 13 Telford Road, Ferndown,
                Wimborne, BH21 7QP, United Kingdom
              </li>
              <li>
                <strong>Privacy requests:</strong> contact us using the{" "}
                <Link href="/enquire">Enquire</Link> page or your published
                customer service contact details.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. What personal data we collect</h2>
            <ul>
              <li>
                <strong>Enquiry data:</strong> name, email address, phone number
                if provided, product interest, message content, and submission time.
              </li>
              <li>
                <strong>Account data:</strong> email address, authentication
                identifiers, profile role, account creation time, and login/session
                state managed through Supabase.
              </li>
              <li>
                <strong>Order and checkout data:</strong> account user ID,
                customer name, account email, phone number, delivery or
                installation address, selected product, SKU, price, currency,
                Stripe checkout session ID, payment status, order status, and order
                timestamps.
              </li>
              <li>
                <strong>Technical and security data:</strong> server request
                metadata, diagnostic logs, browser/device information, and fraud
                or abuse signals where needed to protect the service.
              </li>
              <li>
                <strong>Analytics data:</strong> if Google Analytics is enabled,
                we may collect page views, events, device/browser details,
                approximate location, and pseudonymous cookie identifiers, subject
                to cookie consent where required.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. How we use personal data and our legal basis</h2>
            <ul>
              <li>
                <strong>Answering enquiries and arranging consultations:</strong>{" "}
                to respond to your message, call or email you back, prepare a
                quotation, and discuss your requested products or design work.
                This is usually necessary to take steps at your request before
                entering a contract.
              </li>
              <li>
                <strong>Creating and managing customer accounts:</strong> to let
                you sign in, maintain your order history, and apply role-based
                access controls. This is necessary for our contract with you and
                our legitimate interest in running a secure account system.
              </li>
              <li>
                <strong>Processing orders and payments:</strong> to create orders,
                start secure checkout, update payment status, manage delivery or
                installation, handle service queries, and keep transaction records.
                This is necessary for contract performance and legal/accounting
                compliance.
              </li>
              <li>
                <strong>Sending admin notifications and operational emails:</strong>{" "}
                enquiry details may be sent via Mailjet to our nominated business
                inbox so we can respond quickly. This supports our legitimate
                interest in managing enquiries and customer service.
              </li>
              <li>
                <strong>Protecting the website and preventing abuse:</strong> to
                investigate failed requests, detect misuse, enforce access rules,
                and troubleshoot errors. This is based on our legitimate interest
                in keeping the service safe and reliable.
              </li>
              <li>
                <strong>Analytics and improvement:</strong> if non-essential
                analytics cookies are enabled, Google Analytics data is used to
                understand how visitors use the website and improve content and
                user journeys. Where required, this is based on consent.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Who we share personal data with</h2>
            <ul>
              <li>
                <strong>Supabase:</strong> used for website authentication,
                database storage, row-level access controls, and order/enquiry data
                storage.
              </li>
              <li>
                <strong>Stripe:</strong> used to run secure checkout and return
                payment session/payment-status information. We do not store full
                card numbers on this website.
              </li>
              <li>
                <strong>Mailjet:</strong> used to send enquiry notification emails
                to our business inbox and, where configured, operational email
                messages.
              </li>
              <li>
                <strong>Google Analytics:</strong> if enabled, used to measure
                website traffic and content performance using first-party
                analytics cookies.
              </li>
              <li>
                <strong>Professional and legal parties:</strong> accountants,
                insurers, advisers, IT support, regulators, or law enforcement
                where necessary and lawful.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. International transfers</h2>
            <p>
              Some service providers may process or support personal data from
              outside the United Kingdom or European Economic Area. Where this
              happens, we rely on the provider&apos;s applicable contractual,
              organisational, and technical transfer safeguards and their published
              privacy/security terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. How long we keep data</h2>
            <ul>
              <li>
                <strong>Enquiries:</strong> normally kept for up to 24 months after
                the last meaningful interaction, unless needed longer for a quote,
                dispute, or legal reason.
              </li>
              <li>
                <strong>Customer accounts and profiles:</strong> kept while the
                account remains active and for a reasonable period afterwards where
                needed for security, dispute handling, or legal compliance.
              </li>
              <li>
                <strong>Orders, payment records, and related correspondence:</strong>{" "}
                normally kept for up to 7 years to satisfy tax, accounting, and
                legal record requirements.
              </li>
              <li>
                <strong>Security and technical logs:</strong> kept only as long as
                reasonably needed for diagnosis, fraud prevention, and system
                security.
              </li>
              <li>
                <strong>Analytics data:</strong> retained according to the
                configured Google Analytics retention settings. GA4 cookies such as
                <code> _ga </code> and <code> _ga_&lt;container-id&gt; </code>{" "}
                may persist for up to 2 years by default.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>7. Your privacy rights</h2>
            <p>
              Depending on the context and applicable law, you may have the right
              to request access to your personal data, correction of inaccurate
              data, deletion, restriction, objection to certain processing, data
              portability, and withdrawal of consent where processing relies on
              consent.
            </p>
            <p>
              You also have the right to complain to the UK Information
              Commissioner&apos;s Office at{" "}
              <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noreferrer">
                ico.org.uk/make-a-complaint
              </a>
              . We would appreciate the chance to address your concern first.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>8. Security</h2>
            <p>
              We use role-based access controls, Supabase row-level security,
              HTTPS, and operational access restrictions to reduce unauthorised
              access, misuse, and accidental loss. No online service can be
              guaranteed completely secure, so please use a strong, unique account
              password and contact us promptly if you suspect unauthorised use.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>9. Cookies and tracking</h2>
            <p>
              Essential cookies or local storage may be used to keep you signed
              in, protect checkout/account flows, and operate the website. If
              Google Analytics or other non-essential tracking is enabled, it
              should only run where lawful consent requirements are met. See our{" "}
              <Link href="/cookie-policy">Cookie Policy</Link> for more detail.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>10. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy if our services, suppliers,
              legal obligations, or data practices change. The date at the top
              shows when the page was last updated.
            </p>
          </section>
        </div>

        <p className={styles.notice}>
          If you want this policy to be contract-lawyer tight for your exact
          trading setup, product categories, and retention schedule, have a UK
          solicitor review this page before launch.
        </p>
      </article>
    </main>
  );
}
