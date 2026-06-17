"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Star, Briefcase } from "@phosphor-icons/react";
import {
  Drop,
  Lightning,
  Broom,
  Car,
  Wrench,
  CookingPot,
} from "@phosphor-icons/react";
import { useListingDetail } from "@/hooks/useDirectory";

const SERVICE_ICONS: Record<string, React.ElementType> = {
  plumber: Drop,
  electrician: Lightning,
  maid: Broom,
  driver: Car,
  handyman: Wrench,
  cook: CookingPot,
  other: Briefcase,
};

function getServiceLabel(st: string): string {
  return st.charAt(0).toUpperCase() + st.slice(1);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const neighborhoodId = params?.neighborhoodId as string | undefined;
  const listingId = params?.listingId as string | undefined;
  const { listing, reviews, loading, error, refetch } = useListingDetail(
    neighborhoodId,
    listingId,
  );

  const renderStars = (rating: number | null, size: number = 14) => {
    if (rating == null) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            className={
              star <= rating ? "text-halqa-amber" : "text-halqa-sand-dark"
            }
            weight={star <= rating ? "fill" : "regular"}
          />
        ))}
      </div>
    );
  };

  const Icon = listing
    ? (SERVICE_ICONS[listing.service_type] ?? Briefcase)
    : Briefcase;

  return (
    <div className="pb-20">
      {/* Back button */}
      <div className="flex items-center px-4 pb-2 pt-4">
        <button
          onClick={() => router.back()}
          className="mr-3 flex h-8 w-8 items-center justify-center rounded-full text-halqa-ink-mid transition-colors hover:bg-halqa-sand-mid"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="animate-pulse space-y-4 px-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-halqa-sand-mid" />
            <div className="flex flex-col gap-2">
              <div className="h-4 w-48 rounded bg-halqa-sand-mid" />
              <div className="h-3 w-32 rounded bg-halqa-sand-mid" />
            </div>
          </div>
          <div className="h-3 w-full rounded bg-halqa-sand-mid" />
          <div className="h-3 w-3/4 rounded bg-halqa-sand-mid" />
          <div className="h-3 w-1/2 rounded bg-halqa-sand-mid" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center gap-3 px-4 py-12">
          <p
            className="text-center text-halqa-ink-mid"
            style={{ fontSize: "13px" }}
          >
            Couldn&apos;t load listing. Try again.
          </p>
          <button
            onClick={refetch}
            className="rounded-lg bg-halqa-teal px-4 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && listing && (
        <>
          {/* Worker header */}
          <div className="flex items-center gap-3 px-4 pb-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-halqa-teal-light">
              <Icon size={28} className="text-halqa-teal" weight="fill" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1
                className="font-semibold text-halqa-ink"
                style={{ fontSize: "22px" }}
              >
                {listing.name}
              </h1>
              <span
                className="text-halqa-ink-mid"
                style={{ fontSize: "15px" }}
              >
                {getServiceLabel(listing.service_type)}
              </span>
            </div>
          </div>

          {/* Area + phone + rating */}
          <div className="space-y-2 px-4 pb-4">
            {listing.area_served && (
              <p
                className="text-halqa-ink-light"
                style={{ fontSize: "13px" }}
              >
                Serves: {listing.area_served}
              </p>
            )}
            {listing.contact_phone && (
              <a
                href={`tel:${listing.contact_phone}`}
                className="block text-halqa-ink-mid underline underline-offset-2"
                style={{ fontSize: "13px" }}
              >
                {listing.contact_phone}
              </a>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Star
                size={24}
                className="text-halqa-amber"
                weight="fill"
              />
              <span
                className="font-semibold text-halqa-ink"
                style={{ fontSize: "28px" }}
              >
                {listing.average_rating?.toFixed(1) ?? "0.0"}
              </span>
              <span
                className="text-halqa-ink-light"
                style={{ fontSize: "13px" }}
              >
                ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
              </span>
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="px-4 pb-4">
              <p
                className="text-halqa-ink-mid leading-relaxed"
                style={{ fontSize: "13px" }}
              >
                {listing.description}
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="mx-4 border-t border-halqa-sand-mid" />

          {/* Reviews section */}
          <div className="px-4 pb-4 pt-4">
            <h2
              className="mb-3 tracking-wide text-halqa-ink-light"
              style={{ fontSize: "11px" }}
            >
              COMMUNITY REVIEWS
            </h2>

            {reviews.length === 0 && (
              <p
                className="py-6 text-center text-halqa-ink-mid"
                style={{ fontSize: "13px" }}
              >
                No reviews yet.
              </p>
            )}

            <div className="flex flex-col">
              {reviews.map((review, index) => (
                <div key={review.id}>
                  <div className="space-y-1 py-3">
                    <div className="flex items-center justify-between">
                      <span
                        className="font-medium text-halqa-ink"
                        style={{ fontSize: "13px" }}
                      >
                        {review.reviewer_display_name ?? "Anonymous"}
                      </span>
                      {renderStars(review.rating)}
                    </div>
                    {review.review_body && (
                      <p
                        className="text-halqa-ink-mid"
                        style={{ fontSize: "13px" }}
                      >
                        {review.review_body}
                      </p>
                    )}
                    <p
                      className="text-halqa-ink-light"
                      style={{ fontSize: "11px" }}
                    >
                      {review.created_at ? formatDate(review.created_at) : ""}
                    </p>
                  </div>
                  {index < reviews.length - 1 && (
                    <div className="border-t border-halqa-sand-mid" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
