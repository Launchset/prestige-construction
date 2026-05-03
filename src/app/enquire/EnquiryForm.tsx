"use client";

import { FormEvent, useState } from "react";
import styles from "./enquire.module.css";

type EnquiryFormProps = {
  product: string;
  isProductEnquiry: boolean;
};

type FormState = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export default function EnquiryForm({ product, isProductEnquiry }: EnquiryFormProps) {
  const defaultMessage = isProductEnquiry
    ? `I'm interested in ${product}`
    : "I'd like to book a free design consultation and discuss my project.";
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitted(false);

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Please complete the required fields before sending your enquiry.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          product,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error || "Something went wrong. Please try again.");
        return;
      }

      setSubmitted(true);
      setForm({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <input type="hidden" name="product" value={product} />

      <div className={styles.fieldGrid}>
        <label className={styles.field}>
          <span>Name</span>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
            required
            autoComplete="name"
            placeholder="Your name"
          />
        </label>

        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
        </label>
      </div>

      <label className={styles.field}>
        <span>Phone</span>
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={(event) => updateField("phone", event.target.value)}
          autoComplete="tel"
          placeholder="Optional"
        />
      </label>

      <label className={styles.field}>
        <span>Message</span>
        <textarea
          name="message"
          value={form.message}
          onChange={(event) => updateField("message", event.target.value)}
          required
          rows={6}
          placeholder={defaultMessage}
        />
      </label>

      {error ? <p className={styles.error}>{error}</p> : null}
      {submitted ? <p className={styles.success}>Thanks, we’ll get back to you shortly.</p> : null}

      <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send Enquiry"}
      </button>
    </form>
  );
}
