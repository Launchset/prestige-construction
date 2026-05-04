"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import styles from "./styles.module.css";

type PdfProductData = {
  features: string[];
  specifications: {
    finish: string | null;
    dimensions: string[];
    capacity: string[];
    energy_class: string | null;
    functions: string[];
    performance: string[];
    installation: string[];
  };
  missing_fields: string[];
  warnings: string[];
  confidence: number;
  should_auto_approve: boolean;
  reason: string;
};

type ReviewItem = {
  sku: string;
  product_name?: string;
  existing_scraped_name: string | null;
  existing_scraped_features: string[];
  extracted_name?: string;
  extracted_features?: string[];
  extracted_features_count?: number;
  pdf_product_data?: PdfProductData;
  pdf_extraction_method?: string;
  spec_sheet_file_path?: string;
  resolved_r2_key?: string;
  supplier_url?: string | null;
  status?: string;
  pdf_review_status?: "pending" | "approved" | "rejected";
  pdf_reviewed_at?: string;
  allow_no_features?: boolean;
};

type BatchState = {
  status: "idle" | "running" | "complete" | "failed" | "stopped";
  stage: "none" | "import_approved" | "extract_next_batch";
  message: string;
  log: string[];
};

function StatusPill({
  tone,
  children,
}: {
  tone: "good" | "muted" | "warn";
  children: ReactNode;
}) {
  return <span className={`${styles.pill} ${styles[tone]}`}>{children}</span>;
}

function TextList({
  items,
  onRemove,
}: {
  items: string[];
  onRemove?: (index: number) => void;
}) {
  if (items.length === 0) {
    return <p className={styles.empty}>None</p>;
  }

  return (
    <ul className={styles.featureList}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>
          <span>{item}</span>
          {onRemove && (
            <button
              type="button"
              className={styles.removeFeatureButton}
              onClick={() => onRemove(index)}
              aria-label={`Remove feature ${index + 1}`}
            >
              -
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function SpecRow({ label, value }: { label: string; value: string | string[] | null }) {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  if (values.length === 0) {
    return null;
  }

  return (
    <div className={styles.specRow}>
      <dt>{label}</dt>
      <dd>{values.join(" | ")}</dd>
    </div>
  );
}

export default function PdfFeatureReviewClient() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [batchState, setBatchState] = useState<BatchState | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadReview() {
      try {
        const response = await fetch("/api/admin/pdf-feature-review", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }

        const data = (await response.json()) as ReviewItem[];

        if (isMounted) {
          setItems(data);
          setActiveIndex(0);
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load review data");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadReview();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadBatchState() {
      try {
        const response = await fetch("/api/admin/pdf-feature-review/batch", {
          cache: "no-store",
        });

        if (response.ok && isMounted) {
          setBatchState((await response.json()) as BatchState);
        }
      } catch {
        if (isMounted) {
          setBatchState(null);
        }
      }
    }

    loadBatchState();
    const intervalId = window.setInterval(loadBatchState, 3000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const active = items[activeIndex];
  const counts = useMemo(
    () => ({
      approved: items.filter((item) => item.pdf_review_status === "approved").length,
      rejected: items.filter((item) => item.pdf_review_status === "rejected").length,
      pending: items.filter((item) => !item.pdf_review_status || item.pdf_review_status === "pending").length,
    }),
    [items],
  );
  const pdfUrl = useMemo(
    () =>
      active
        ? `/api/admin/pdf-feature-review/pdf?index=${activeIndex}#toolbar=1&navpanes=0`
        : "",
    [active, activeIndex],
  );

  async function updateReview(action: "reject" | "undo_reject" | "approve_remaining") {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/pdf-feature-review", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          action === "approve_remaining"
            ? { action }
            : { action, index: activeIndex },
        ),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = (await response.json()) as { items: ReviewItem[] };
      setItems(result.items);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save review decision");
    } finally {
      setSaving(false);
    }
  }

  async function removeFeature(featureIndex: number) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/pdf-feature-review", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "remove_feature",
          index: activeIndex,
          featureIndex,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = (await response.json()) as { items: ReviewItem[] };
      setItems(result.items);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to remove feature");
    } finally {
      setSaving(false);
    }
  }

  async function useSupplierFeatures() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/pdf-feature-review", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "use_supplier_features",
          index: activeIndex,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = (await response.json()) as { items: ReviewItem[] };
      setItems(result.items);
    } catch (supplierError) {
      setError(supplierError instanceof Error ? supplierError.message : "Failed to use supplier features");
    } finally {
      setSaving(false);
    }
  }

  async function allowNoFeatures() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/pdf-feature-review", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "allow_no_features",
          index: activeIndex,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = (await response.json()) as { items: ReviewItem[] };
      setItems(result.items);
    } catch (allowError) {
      setError(allowError instanceof Error ? allowError.message : "Failed to allow no features");
    } finally {
      setSaving(false);
    }
  }

  async function reloadReview() {
    const response = await fetch("/api/admin/pdf-feature-review", {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = (await response.json()) as ReviewItem[];
    setItems(data);
    setActiveIndex(0);
  }

  async function runNextBatch() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/pdf-feature-review/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ limit: 10 }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setBatchState({
        status: "running",
        stage: "import_approved",
        message: "Batch started.",
        log: [],
      });
    } catch (batchError) {
      setError(batchError instanceof Error ? batchError.message : "Failed to start batch");
    } finally {
      setSaving(false);
    }
  }

  async function stopBatch() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/pdf-feature-review/batch", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const stateResponse = await fetch("/api/admin/pdf-feature-review/batch", {
        cache: "no-store",
      });

      if (stateResponse.ok) {
        setBatchState((await stateResponse.json()) as BatchState);
      }
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : "Failed to stop batch");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (batchState?.status === "complete") {
      reloadReview().catch((reloadError) => {
        setError(reloadError instanceof Error ? reloadError.message : "Failed to reload review data");
      });
    }
  }, [batchState?.status]);

  if (loading) {
    return <main className={styles.page}>Loading review data...</main>;
  }

  if (error) {
    return <main className={styles.page}>Error: {error}</main>;
  }

  if (!active) {
    return <main className={styles.page}>No PDF feature review data found.</main>;
  }

  const data = active.pdf_product_data;
  const features = active.extracted_features ?? [];
  const supplierFeatures = active.existing_scraped_features ?? [];
  const isPdfReady = active.status === "ready_for_review" || active.status === "updated";
  const showSupplierPage = !isPdfReady && Boolean(active.supplier_url);

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1>PDF Feature Review</h1>
          <p>
            {items.length} products in{" "}
            <span className={styles.path}>pdf-feature-review.json</span>
          </p>
          <div className={styles.counts}>
            <span>{counts.approved} approved</span>
            <span>{counts.rejected} rejected</span>
            <span>{counts.pending} pending</span>
          </div>
        </div>

        <div className={styles.productList} aria-label="Products">
          {items.map((item, index) => (
            <button
              key={`${item.sku}-${index}`}
              type="button"
              className={`${styles.productButton} ${
                index === activeIndex ? styles.productButtonActive : ""
              } ${
                item.pdf_review_status === "rejected" ? styles.productButtonRejected : ""
              } ${
                item.pdf_review_status === "approved" ? styles.productButtonApproved : ""
              }`}
              onClick={() => setActiveIndex(index)}
            >
              <span>{item.sku}</span>
              <small>
                {item.pdf_review_status === "rejected"
                  ? "rejected"
                  : item.pdf_review_status === "approved"
                    ? "approved"
                    : item.status === "skipped_no_spec"
                      ? "no spec sheet"
                      : `${item.extracted_features_count ?? 0} features`}
              </small>
            </button>
          ))}
        </div>

        <div className={styles.sidebarActions}>
          <button
            type="button"
            className={styles.approveButton}
            onClick={() => updateReview("approve_remaining")}
            disabled={saving}
          >
            Approve all not rejected
          </button>
          <button
            type="button"
            className={styles.nextBatchButton}
            onClick={runNextBatch}
            disabled={saving || batchState?.status === "running"}
          >
            Import approved and run next 10
          </button>
          <button
            type="button"
            className={styles.stopButton}
            onClick={stopBatch}
            disabled={saving || batchState?.status !== "running"}
          >
            Stop running batch
          </button>
          {batchState && (
            <div className={styles.batchStatus}>
              <strong>{batchState.status}</strong>
              <span>{batchState.message}</span>
              {batchState.log.length > 0 && (
                <pre>{batchState.log.slice(-8).join("\n")}</pre>
              )}
            </div>
          )}
        </div>
      </aside>

      <section className={styles.reviewPane}>
        <header className={styles.productHeader}>
          <div>
            <p className={styles.eyebrow}>{active.sku}</p>
            <h2>{active.extracted_name ?? active.product_name ?? active.sku}</h2>
            <p className={styles.fileName}>
              {active.spec_sheet_file_path ?? "No spec sheet found"}
            </p>
          </div>

          <div className={styles.statusGroup}>
            <StatusPill tone={isPdfReady ? "muted" : "warn"}>
              {active.pdf_extraction_method ?? active.status ?? "pending"}
            </StatusPill>
            <StatusPill tone={(data?.warnings.length ?? 0) === 0 ? "good" : "warn"}>
              {data?.warnings.length ?? 0} warnings
            </StatusPill>
            <StatusPill tone={data?.should_auto_approve ? "good" : "muted"}>
              {data?.should_auto_approve ? "auto approve" : "manual check"}
            </StatusPill>
            {active.allow_no_features && (
              <StatusPill tone="warn">no features allowed</StatusPill>
            )}
            <StatusPill
              tone={
                active.pdf_review_status === "rejected"
                  ? "warn"
                  : active.pdf_review_status === "approved"
                    ? "good"
                    : "muted"
              }
            >
              {active.pdf_review_status ?? "pending"}
            </StatusPill>
            <button
              type="button"
              className={
                active.pdf_review_status === "rejected"
                  ? styles.undoButton
                  : styles.rejectButton
              }
              onClick={() =>
                updateReview(
                  active.pdf_review_status === "rejected" ? "undo_reject" : "reject",
                )
              }
              disabled={saving}
            >
              {active.pdf_review_status === "rejected" ? "Undo reject" : "Reject this one"}
            </button>
          </div>
        </header>

        <div className={styles.split}>
          <div className={styles.textPane}>
            <section className={styles.block}>
              <div className={styles.blockHeader}>
                <h3>Extracted Features</h3>
                <span>{active.extracted_features_count ?? 0}</span>
              </div>
              <button
                type="button"
                className={styles.allowEmptyButton}
                onClick={allowNoFeatures}
                disabled={saving}
              >
                Allow no features
              </button>
              {isPdfReady ? (
                <TextList items={features} onRemove={removeFeature} />
              ) : (
                <p className={styles.empty}>No spec sheet was found for this product.</p>
              )}
            </section>

            {!isPdfReady && (
              <section className={styles.block}>
                <div className={styles.blockHeader}>
                  <h3>Supplier Features</h3>
                  <span>{supplierFeatures.length}</span>
                </div>
                <TextList items={supplierFeatures} />
                <button
                  type="button"
                  className={styles.useSupplierButton}
                  onClick={useSupplierFeatures}
                  disabled={saving || supplierFeatures.length === 0}
                >
                  Use supplier features
                </button>
                {active.supplier_url && (
                  <a className={styles.supplierLink} href={active.supplier_url} target="_blank">
                    Open supplier page
                  </a>
                )}
              </section>
            )}

            {data && (
              <section className={styles.block}>
                <h3>Specifications</h3>
                <dl className={styles.specList}>
                  <SpecRow label="Finish" value={data.specifications.finish} />
                  <SpecRow label="Dimensions" value={data.specifications.dimensions} />
                  <SpecRow label="Capacity" value={data.specifications.capacity} />
                  <SpecRow label="Energy" value={data.specifications.energy_class} />
                  <SpecRow label="Functions" value={data.specifications.functions} />
                  <SpecRow label="Performance" value={data.specifications.performance} />
                  <SpecRow label="Installation" value={data.specifications.installation} />
                </dl>
              </section>
            )}

            <section className={styles.block}>
              <h3>Review Notes</h3>
              <p className={styles.reason}>
                {data?.reason || active.status || "No reason supplied."}
              </p>
              <div className={styles.noteGrid}>
                <div>
                  <h4>Warnings</h4>
                  <TextList items={data?.warnings ?? []} />
                </div>
                <div>
                  <h4>Missing Fields</h4>
                  <TextList items={data?.missing_fields ?? []} />
                </div>
              </div>
            </section>
          </div>

          <div className={styles.pdfPane}>
            {isPdfReady ? (
              <iframe key={pdfUrl} className={styles.pdfFrame} src={pdfUrl} title={`${active.sku} PDF`} />
            ) : showSupplierPage ? (
              <iframe
                key={active.supplier_url}
                className={styles.pdfFrame}
                src={active.supplier_url ?? ""}
                title={`${active.sku} supplier page`}
              />
            ) : (
              <div className={styles.noPdf}>No PDF or supplier page available for this product.</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
