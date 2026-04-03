import Link from "next/link";
import styles from "../legal.module.css";

export const metadata = {
  title: "Cookie Policy | Prestige Kitchens & Bedrooms",
  description: "How cookies, session storage, and analytics tags are used on this website.",
};

export default function CookiePolicyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.shell}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>Cookie Policy</h1>
        <p className={styles.meta}>Last updated: 3 April 2026</p>
        <p className={styles.intro}>
          This page explains the cookies, local storage, and similar technologies
          used to run account, checkout, security, and analytics features on this
          website.
        </p>

        <div className={styles.sectionList}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. What cookies are</h2>
            <p>
              Cookies and similar technologies store or read information on your
              device. Under UK PECR rules, non-essential cookies and analytics tags
              generally require valid consent, while strictly necessary cookies may
              be used to provide a service you requested.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Strictly necessary cookies</h2>
            <ul>
              <li>
                <strong>Supabase authentication/session storage:</strong> used to
                keep you signed in, verify your account session, and control access
                to your order history and admin/customer routes. Cookie/local
                storage names may vary and often begin with <code>sb-</code>.
              </li>
              <li>
                <strong>Checkout and security cookies:</strong> Stripe and/or our
                own checkout endpoints may use strictly necessary cookies or
                browser storage to keep payment and fraud-prevention workflows
                working correctly.
              </li>
              <li>
                <strong>Consent preference storage:</strong> if a cookie banner is
                added, a small preference cookie/local storage entry may be used to
                remember your analytics choice.
              </li>
            </ul>
            <p>
              Blocking strictly necessary cookies may break sign-in, checkout, and
              order-history features.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Analytics cookies</h2>
            <p>
              If Google Analytics 4 is enabled, Google&apos;s first-party analytics
              cookies may be used to distinguish users and maintain session state.
              According to Google, the main GA4 cookies are:
            </p>
            <ul>
              <li>
                <strong><code>_ga</code>:</strong> used to distinguish users, with
                a default expiry of up to 2 years.
              </li>
              <li>
                <strong><code>_ga_&lt;container-id&gt;</code>:</strong> used to
                persist session state, with a default expiry of up to 2 years.
              </li>
            </ul>
            <p>
              Analytics cookies should not be set until any required consent has
              been collected. If you decline analytics cookies, core site features
              should still work.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Third-party processing</h2>
            <p>
              Supabase, Stripe, Mailjet, and Google may process data connected to
              cookies, sessions, or analytics according to their own privacy and
              security documentation. See our <Link href="/privacy-policy">Privacy Policy</Link>{" "}
              for the wider list of service providers and purposes.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. How to manage cookies</h2>
            <ul>
              <li>
                Use the site&apos;s cookie banner or preference controls if and when
                analytics consent controls are added.
              </li>
              <li>
                You can also block or delete cookies in your browser settings.
              </li>
              <li>
                If you clear Supabase/session storage, you may need to sign in
                again.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Contact</h2>
            <p>
              If you have questions about cookies or analytics tracking, contact us
              through the <Link href="/enquire">Enquire</Link> page.
            </p>
          </section>
        </div>

        <p className={styles.notice}>
          Important launch note: if you add Google Analytics, add a consent
          banner/consent mode before loading analytics cookies for UK users.
        </p>
      </article>
    </main>
  );
}
