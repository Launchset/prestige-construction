import Link from "next/link";
import styles from "../legal.module.css";

export const metadata = {
  title: "Returns & Cancellation Policy | Prestige Kitchens & Bedrooms",
  description: "How online order returns, cancellations, and faulty product issues are handled.",
};

export default function ReturnsPolicyPage() {
  return (
    <main className={styles.page}>
      <article className={styles.shell}>
        <p className={styles.eyebrow}>Legal</p>
        <h1 className={styles.title}>Returns &amp; Cancellation Policy</h1>
        <p className={styles.meta}>Last updated: 3 April 2026</p>
        <p className={styles.intro}>
          This policy explains how to request a return, cancellation, or fault
          resolution for orders placed through this website. It should be read
          alongside our <Link href="/terms-and-conditions">Terms &amp; Conditions</Link>.
        </p>

        <div className={styles.sectionList}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. How to request help</h2>
            <p>
              Contact us through the <Link href="/enquire">Enquire</Link> page and
              include your order number, the product involved, a clear explanation
              of the issue, and photos if the item is damaged, faulty, or incorrect.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Cancellations before dispatch or installation</h2>
            <ul>
              <li>
                For standard stock items that have not yet been dispatched,
                contact us as soon as possible and we will confirm whether the
                order can be cancelled.
              </li>
              <li>
                For bespoke, made-to-measure, special-order, or fitted items,
                cancellation rights may be limited once production, supplier order
                placement, survey work, or installation work has started.
              </li>
              <li>
                If service work starts during a consumer cooling-off period at your
                express request, you may have to pay for work already performed if
                you later cancel, where allowed by law.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Returns for non-faulty goods</h2>
            <ul>
              <li>
                If you are a UK consumer and buy eligible standard goods online,
                you may have a legal right to cancel within 14 days after delivery,
                unless an exception applies.
              </li>
              <li>
                Returned goods should be unused, uninstalled, complete, and in
                their original packaging so they can be inspected and resold where
                appropriate.
              </li>
              <li>
                Unless the item is faulty or we agree otherwise, you may be
                responsible for return delivery costs and safe return packaging.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Items that may not be returnable unless faulty</h2>
            <ul>
              <li>Bespoke, made-to-measure, custom-finished, or personalised products.</li>
              <li>Products ordered specially for your project from a supplier.</li>
              <li>Installed, fitted, used, modified, or damaged-by-handling items.</li>
              <li>
                Sealed goods that are not suitable for return for hygiene or
                health protection reasons once unsealed, where that legal exception
                applies.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Faulty, damaged, or incorrect goods</h2>
            <ul>
              <li>
                Please inspect deliveries promptly and report visible damage,
                missing parts, or incorrect goods as soon as reasonably possible.
              </li>
              <li>
                Where a product is faulty, not as described, or incorrectly
                supplied, we will assess the issue and arrange an appropriate
                repair, replacement, collection, or refund in line with your
                statutory rights.
              </li>
              <li>
                Do not attempt installation if obvious transit damage or a
                product mismatch is apparent before fitting.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Refund timing</h2>
            <p>
              Where a refund is approved, we will process it within a reasonable
              period and normally to the original payment method through Stripe or
              the payment route used for the order. Refund timing may depend on
              product inspection, collection, and your card or bank provider.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>7. Statutory rights</h2>
            <p>
              Nothing in this policy is intended to remove or limit your legal
              rights as a consumer under UK law, including rights relating to
              faulty goods, misdescribed goods, or services carried out without
              reasonable care and skill.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
