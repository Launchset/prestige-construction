import { notFound } from "next/navigation";
import PdfFeatureReviewClient from "./PdfFeatureReviewClient";

export default function PdfFeatureReviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <PdfFeatureReviewClient />;
}
