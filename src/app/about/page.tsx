import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Prestige Kitchens & Bedrooms, visit the Ferndown showroom, and see how the team handles bespoke kitchens, bedrooms, and fitted interiors.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Prestige Kitchens & Bedrooms",
    description:
      "Learn about Prestige Kitchens & Bedrooms, visit the Ferndown showroom, and see how the team handles bespoke kitchens, bedrooms, and fitted interiors.",
    images: [
      {
        url: "/about-showroom-hero.webp",
        alt: "Prestige Kitchens & Bedrooms showroom design consultation",
      },
    ],
  },
};


const SERVICES = [
  "Bespoke kitchen design and installation",
  "Fitted bedrooms and wardrobes",
  "Custom storage solutions",
  "Full project management from start to finish",
];

const REASONS = [
  {
    title: "Personalised design",
    body: "Every room is planned around your layout, style, and budget, so the final design feels built for your home rather than pulled from a brochure.",
  },
  {
    title: "Quality craftsmanship",
    body: "High-quality materials and experienced installers help deliver a finish that looks sharp on day one and still works properly long after the job is complete.",
  },
  {
    title: "Transparent pricing",
    body: "Projects are discussed clearly from the start, with practical guidance on finishes, layouts, and costs rather than vague allowances or hidden extras.",
  },
  {
    title: "End-to-end service",
    body: "From the first consultation to the final installation, the same team stays close to the job so nothing gets lost between design and fitting.",
  },
];


const TRUST_POINTS = [
  { value: "Showroom", label: "Visit finishes and layouts in person" },
  { value: "Local", label: "Projects across Ferndown and nearby areas" },
  { value: "End-to-end", label: "Design, supply, and installation together" },
];

function Breadcrumb() {
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <Link href="/">Home</Link>
      <span>/</span>
      <span>About</span>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>Prestige Kitchens &amp; Bedrooms</p>

        <h1 className={styles.heading}>
          Designed around
          <span>your home.</span>
        </h1>

        <p className={styles.intro}>
          Prestige Kitchens &amp; Bedrooms designs and installs bespoke kitchens,
          fitted bedrooms, and made-to-measure storage tailored to the way you
          live, the space you have, and the finish you want.
        </p>

        <p className={styles.intro}>
          Based in Ferndown, the team works with homeowners across the local
          area to deliver interiors that balance style, practicality, and
          long-term quality within roughly 20 miles of BH21 7QP.
        </p>


        <div className={styles.heroActions}>
          <Link href="/enquire" className={styles.primaryCta}>
            Book a consultation
          </Link>
          <Link href="/gallery" className={styles.secondaryCta}>
            View recent work
          </Link>
        </div>
      </div>

      <div className={styles.heroVisual}>
        <div className={styles.heroImageFrame}>
          <Image
            src="/about-showroom-hero.webp"
            alt="Kitchen and bedroom design consultation in a showroom"
            fill
            priority
            className={styles.image}
            sizes="(max-width: 1100px) 100vw, 44vw"
          />
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  return (
    <section className={styles.trustStrip} aria-label="Why clients choose Prestige">
      {TRUST_POINTS.map((point) => (
        <article key={point.value} className={styles.trustCard}>
          <p>{point.value}</p>
          <span>{point.label}</span>
        </article>
      ))}
    </section>
  );
}

function StorySection() {
  return (
    <section className={styles.storyGrid}>
      <article className={styles.storyPanel}>
        <p className={styles.sectionLabel}>Our story</p>
        <h2>A straightforward approach to fitted interiors.</h2>

        <p>
          The business was built around a simple idea: give homeowners a
          properly designed space without the stress and inflated costs that
          often come with renovation work.
        </p>

        <p>
          With years of hands-on experience in kitchen and bedroom design, the
          team handles the process from early concept work through to final
          installation, with close attention to detail, craftsmanship, and
          customer satisfaction throughout.
        </p>
      </article>

      <aside className={styles.visitPanel}>
        <p className={styles.sectionLabel}>Showroom visit</p>
        <h2>See materials, finishes, and layouts before you commit.</h2>

        <p>
          Visit the Ferndown showroom to compare colours, textures, storage
          ideas, and layout options in person, then talk through your project
          with the team.
        </p>

        <Link href="/enquire" className={styles.inlineLink}>
          Arrange a showroom visit
        </Link>
      </aside>
    </section>
  );
}

function ServicesSection() {
  return (
    <section className={styles.servicesSection}>
      <div className={styles.servicesIntro}>
        <p className={styles.sectionLabelAlt}>What we do</p>
        <h2>From first ideas to final fitting.</h2>

        <p>
          Each project is shaped around the client, whether that means a full
          kitchen replacement, a fitted bedroom, or a storage-led room redesign.
        </p>
      </div>

      <div className={styles.servicesGrid}>
        {SERVICES.map((service, index) => (
          <article key={service} className={styles.serviceCard}>
            <span className={styles.serviceNumber}>0{index + 1}</span>
            <h3>{service}</h3>
          </article>
        ))}
      </div>
    </section>
  );
}

function CoverageSection() {
  return (
    <section className={styles.coverageGrid}>
      <div className={styles.coverageColumn}>
        <article className={styles.coveragePanel}>
          <div className={styles.coverageCopy}>
            <p className={styles.sectionLabel}>Areas we cover</p>
            <h2>Local projects across Dorset and nearby areas.</h2>

        <p>
          The showroom is in Ferndown and projects are typically taken on
          across a roughly 20-mile radius of BH21 7QP, including Bournemouth, Poole,
          Wimborne, Ringwood, Verwood, and Christchurch.
        </p>

            <p>If you are just outside that area, it is still worth asking.</p>
          </div>
        </article>

        <aside className={styles.showroomPanel}>
          <p className={styles.showroomLabel}>Visit the showroom</p>

          <address className={styles.address}>
            <span>Unit 13, Telford Road</span>
            <span>Ferndown Industrial Estate</span>
            <span>Ferndown, BH21 7QP</span>
          </address>

          <Link href="/enquire" className={styles.showroomLink}>
            Arrange a visit
          </Link>
        </aside>
      </div>

      <article className={styles.reasonsPanel}>
        <p className={styles.sectionLabel}>Why choose us</p>
        <h2>Clearer design, better fitting, less friction.</h2>

        <div className={styles.reasonGrid}>
          {REASONS.map((reason) => (
            <article key={reason.title} className={styles.reasonCard}>
              <h3>{reason.title}</h3>
              <p>{reason.body}</p>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={styles.ctaPanel}>
      <div className={styles.ctaCopy}>
        <p className={styles.sectionLabel}>Start with a consultation</p>
        <h2>Planning a new kitchen, bedroom, or storage project?</h2>

        <p>
          Get in touch to arrange a free consultation, ask a question, or book
          a showroom visit. The quickest route is to call or send an enquiry.
        </p>
      </div>

      <div className={styles.contactBlock}>
        <p className={styles.contactLabel}>Contact directly</p>

        <a href="tel:+447765504961">07765 504961</a>
        <a href="tel:+447887241451">07887 241451</a>
        <a href="mailto:info@prestige-kitchens.com">
          info@prestige-kitchens.com
        </a>
      </div>

      <div className={styles.ctaActions}>
        <Link href="/enquire" className={styles.primaryCta}>
          Book a consultation
        </Link>
        <Link href="/gallery" className={styles.secondaryCta}>
          View gallery
        </Link>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Breadcrumb />
        <HeroSection />
        <TrustStrip />
        <StorySection />
        <ServicesSection />
        <CoverageSection />
        <FinalCta />
      </div>
    </main>
  );
}
