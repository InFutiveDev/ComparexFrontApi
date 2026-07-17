import { MDR_PAYMENT_MODES } from "../constants/mdrSettings.js";
import { PaymentProvider } from "../models/PaymentProvider.js";
import { PlatformSettings } from "../models/PlatformSettings.js";
import { Review } from "../models/Review.js";
import { enrichItemsWithAccountStatus } from "../services/accountStatus.js";
import { getSignedDownloadUrl } from "../services/s3Service.js";
import {
  buildRatingMap,
  sanitizePgCompareRow,
} from "../utils/pgCompare.js";

async function resolveLogo(provider) {
  const file = provider.onboarding?.companyLogo;
  if (!file) return null;
  if (file.key) {
    try {
      return await getSignedDownloadUrl(file.key);
    } catch (error) {
      console.error("Failed to sign comparison logo:", error.message);
    }
  }
  return file.url || null;
}

/** FR-MC-01/02/03 — safe dynamic comparison data for active payment gateways. */
export async function listPgComparison(req, res) {
  try {
    const [{ items }, settings, ratingSummaries] = await Promise.all([
      PaymentProvider.findAll({ page: 1, limit: 100 }),
      PlatformSettings.getOrCreate(),
      Review.getPublishedRatingSummaries(),
    ]);
    const providers = (await enrichItemsWithAccountStatus(items)).filter(
      (provider) => provider.accountStatus === "active",
    );
    const ratingMap = buildRatingMap(ratingSummaries);
    let rows = await Promise.all(
      providers.map(async (provider) =>
        sanitizePgCompareRow(provider, {
          logoUrl: await resolveLogo(provider),
          mdrSettings: settings.mdr,
          ratingMap,
        }),
      ),
    );

    const search = String(req.query.search || "").trim().toLowerCase();
    const category = String(req.query.category || "").trim().toLowerCase();
    const paymentMode = String(req.query.paymentMode || "credit_card").trim();
    const tat = String(req.query.tat || "").trim();
    const minRating = Number(req.query.minRating || 0);
    const maxMdr =
      req.query.maxMdr === undefined || req.query.maxMdr === ""
        ? null
        : Number(req.query.maxMdr);

    if (search) {
      rows = rows.filter((row) =>
        [row.name, row.companyName, row.location, ...row.features, ...row.categories]
          .join(" ")
          .toLowerCase()
          .includes(search),
      );
    }
    if (category) {
      rows = rows.filter((row) =>
        row.categories.some((item) => item.toLowerCase() === category),
      );
    }
    if (tat) rows = rows.filter((row) => row.onboardingTat === tat);
    if (Number.isFinite(minRating) && minRating > 0) {
      rows = rows.filter((row) => row.rating.average >= minRating);
    }
    if (maxMdr !== null && Number.isFinite(maxMdr)) {
      rows = rows.filter((row) => {
        const value = row.mdrNumeric[paymentMode];
        return value !== null && value <= maxMdr;
      });
    }

    const sort = String(req.query.sort || "name_asc");
    rows.sort((a, b) => {
      if (sort === "mdr_asc") {
        return (
          (a.mdrNumeric[paymentMode] ?? Number.POSITIVE_INFINITY) -
          (b.mdrNumeric[paymentMode] ?? Number.POSITIVE_INFINITY)
        );
      }
      if (sort === "tat_asc") return a.tatOrder - b.tatOrder;
      if (sort === "rating_desc") {
        return b.rating.average - a.rating.average || b.rating.count - a.rating.count;
      }
      return a.name.localeCompare(b.name);
    });

    const categories = [
      ...new Set(
        providers.flatMap((provider) => [
          ...(provider.onboarding?.bestSuitedBusinessTypes || []),
          ...(provider.categories || []),
        ]),
      ),
    ]
      .filter(Boolean)
      .sort();

    return res.json({
      paymentGateways: rows,
      total: rows.length,
      filters: {
        categories,
        paymentModes: MDR_PAYMENT_MODES.filter((item) => item.value !== "other"),
        tatOptions: ["instant", "1-2-days", "3-5-days", "1-week-plus"],
      },
    });
  } catch (error) {
    console.error("List PG comparison error:", error);
    return res.status(500).json({ message: "Failed to load payment gateway comparison" });
  }
}
