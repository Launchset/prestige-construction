# Front-End Test Plan

Branch: `front-end-test`
Base: `main` at `03dbfd22c59642ce4a27ed4f0a2594a13d63456c`

## Context From Recent Emails

- Prestige Kitchens asked for:
  - a dedicated Contact Us page
  - an About Us page with clearer location and showroom details
  - a gallery that can be filtered by kitchens, bedrooms, and bathrooms
  - Trustpilot reviews near the bottom of the homepage
- They also supplied:
  - About Us copy with Ferndown showroom details
  - a batch of photos for gallery content
- Direction agreed for this branch:
  - the site should be a good mix of service-led pages and future product browsing
  - service pages are the priority right now because the business is still coming up
  - product browsing should stay available, but not dominate the navigation or homepage
  - Trustpilot content will be added later once the final reviews or embed are available

## Current Site State

- Home page at `src/app/page.tsx` renders only:
  - `Hero`
  - `WhatHappensNext`
  - `Categories`
- Navigation in `src/app/components/navbar2.tsx` is still product-led:
  - Appliances
  - Sinks
  - Taps
- The enquiry flow exists at `src/app/enquire/page.tsx`, but it is framed as a general design consultation rather than a branded Contact page.
- Footer in `src/app/components/footer.tsx` has mixed branding and should be corrected before launch.

## Recommended Build Order

1. Reframe the top-level navigation around the actual customer journey.
2. Add the missing trust-building pages and sections.
3. Rework the homepage so it sells the showroom, service area, and proof of quality while still pointing toward products.
4. Add a gallery page that uses the supplied image content.
5. Clean up metadata, footer details, and internal links so the site reads as one coherent brand.

## What To Add And Where

### 1. Navigation and global layout

Files:
- `src/app/components/navbar2.tsx`
- `src/app/components/navbar2.module.css`
- `src/app/components/footer.tsx`
- `src/app/components/footer.module.css`
- `src/app/layout.tsx`

Changes:
- Replace the current product-first nav with business pages:
  - Home
  - About
  - Gallery
  - Contact
- Keep `Enquire` as the main CTA if we want a stronger conversion button, but point standard contact traffic to a dedicated `/contact` page.
- Keep a lighter path into product browsing, for example:
  - a `Products` link in nav
  - or homepage/category links lower down the page
- Fix footer branding from `Prestige Construction` to `Prestige Kitchens & Bedrooms`.
- Expand footer details to include:
  - showroom address
  - both phone numbers from the email signature
  - email address
  - quick links to About, Gallery, and Contact
- Update metadata description in `src/app/layout.tsx` so it reflects the showroom and fitted interiors business rather than the current product catalogue copy.

### 2. Home page restructuring

Files:
- `src/app/page.tsx`
- `src/app/page.module.css`
- likely new homepage section components under `src/app/components/`

Changes:
- Keep the hero, but rewrite it around:
  - bespoke kitchens and fitted bedrooms
  - free design consultation
  - Ferndown showroom
- Demote the current category grid rather than removing it entirely, since products are still the end goal.
- Add a new homepage section order:
  1. Hero
  2. Social proof / review strip
  3. About preview
  4. What we do
  5. Gallery preview
  6. Process / consultation steps
  7. Product/category preview
  8. Contact CTA
- Add a showroom/location block on the homepage with:
  - Ferndown showroom address
  - areas covered
  - short explanation of what clients can expect when visiting

### 3. About page

Files:
- new `src/app/about/page.tsx`
- new `src/app/about/about.module.css`

Content source:
- Use the `about us page` email as the starting copy.

Sections:
- Intro to Prestige Kitchens & Bedrooms
- Showroom details and address
- Our story
- What we do
- Areas we cover
- Why choose us
- Final CTA to contact or book a consultation

Notes:
- The supplied email copy is usable as a base, but it should be tightened before publishing.
- We should remove AI-style repetition and make the copy sound like the business.

### 4. Contact page

Files:
- new `src/app/contact/page.tsx`
- new `src/app/contact/contact.module.css`
- optionally reuse parts of `src/app/enquire/EnquiryForm.tsx`

Changes:
- Build a dedicated `/contact` page for standard enquiries.
- Include:
  - phone numbers
  - email
  - showroom address
  - opening/visit messaging if provided later
  - enquiry form
- Decide whether `/enquire` remains a conversion-focused design-consultation route while `/contact` becomes the standard business contact page.

Recommendation:
- Keep both:
  - `/contact` for business/contact intent
  - `/enquire` for booked consultation or product enquiry intent

### 5. Gallery page

Files:
- new `src/app/gallery/page.tsx`
- new `src/app/gallery/gallery.module.css`
- possibly new gallery components under `src/app/components/gallery/`

Content source:
- Use the images from the `photos` email as initial gallery assets.

Changes:
- Create a simple visual gallery page without filters for now.
- Support lightbox or large-image viewing on click.
- Add a short intro explaining that the gallery shows recent work and design inspiration.
- Use a filename convention so images can be sorted manually:
  - `ki-` for kitchens
  - `ba-` for bathrooms
  - `be-` for bedrooms

Open content need:
- For now, nearly all images are kitchens and one image is bathroom content.
- That is not enough variety to justify gallery filters yet.
- The plan is to place the files in `public/galary/` and rename them manually with the agreed prefixes before wiring the gallery page.

### 6. Reviews / Trustpilot

Files:
- likely new component such as `src/app/components/reviews.tsx`
- homepage integration in `src/app/page.tsx`

Changes:
- Add a review section near the bottom of the homepage, as requested in the self-sent note.
- Preferred placement:
  - after Gallery preview
  - before final Contact CTA
- Do not block the branch on Trustpilot for now.
- Add the section later once the review content, badge, or embed details are available.

Open content need:
- We still need the actual review quotes, star ratings, and review URLs or embed method.

### 7. Homepage copy and trust signals

Files:
- `src/app/components/hero.tsx`
- `src/app/components/whathappensnext.tsx`
- new supporting sections

Changes:
- Adjust all copy to match the service business:
  - bespoke kitchens
  - fitted bedrooms
  - showroom visit
  - end-to-end design and installation
- Add trust signals pulled from the emails:
  - Ferndown showroom
  - local service area
  - bespoke design
  - installation support
- Keep some product discovery language in supporting sections so the catalogue side does not disappear.

### 8. Image and content management

Files:
- `public/` or a more structured gallery asset folder
- any new data/config file for gallery categories

Changes:
- Store the supplied gallery images in a predictable location.
- Add a simple data structure to map each image to:
  - category
  - alt text
  - optional room/project title

Recommendation:
- Use a local config file for now so frontend iteration is fast.
- Move to CMS or Supabase-backed gallery data only if content starts changing often.

## Immediate Implementation Plan

1. Update nav, footer, and metadata to match the service business.
2. Create `/about`, `/contact`, and `/gallery` routes.
3. Rebuild the homepage around service content with product browsing kept as a secondary path.
4. Create the gallery asset folder and use manual filename prefixes to categorise images.
5. Add Trustpilot content later once the final review material is available.

## Open Questions Before Final Content Lock

- Which images belong in:
  - kitchens
  - bedrooms
  - bathrooms
- Do they want both phone numbers shown publicly everywhere?
- Do they have a preferred Trustpilot embed, badge, or just selected quotes?
