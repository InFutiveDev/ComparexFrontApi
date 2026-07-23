function trimOrNull(value) {
  const trimmed = value?.trim?.();
  return trimmed || null;
}

export function parseAffiliateIdsFromUrl(urlString) {
  if (!urlString) {
    return { pgId: null, resellerId: null };
  }

  try {
    const url = new URL(urlString, "http://localhost");
    return {
      pgId: trimOrNull(url.searchParams.get("pg") ?? url.searchParams.get("pgId")),
      resellerId: trimOrNull(url.searchParams.get("rs") ?? url.searchParams.get("resellerId")),
    };
  } catch {
    return { pgId: null, resellerId: null };
  }
}

/** Resolve affiliate ids from body, query string, or Referer (supports live site without updated frontend). */
export function resolveAffiliateIds(req) {
  const fromBody = {
    pgId: trimOrNull(req.body?.pgId),
    resellerId: trimOrNull(req.body?.resellerId),
  };

  const fromQuery = {
    pgId: trimOrNull(req.query?.pg ?? req.query?.pgId),
    resellerId: trimOrNull(req.query?.rs ?? req.query?.resellerId),
  };

  const referer = req.headers.referer || req.headers.referrer || "";
  const fromReferer = parseAffiliateIdsFromUrl(referer);

  return {
    pgId: fromBody.pgId || fromQuery.pgId || fromReferer.pgId,
    resellerId: fromBody.resellerId || fromQuery.resellerId || fromReferer.resellerId,
  };
}

export async function resolveAffiliatePartners({ pgId, resellerId }, models) {
  const { PaymentProvider, ResellerPartner } = models;

  let affiliateProvider = null;
  if (pgId) {
    affiliateProvider = await PaymentProvider.findById(pgId);
  }

  let affiliateReseller = null;
  if (resellerId) {
    affiliateReseller = await ResellerPartner.findById(resellerId);
  }

  return { affiliateProvider, affiliateReseller };
}

export function resolveLeadSource(affiliateProvider, affiliateReseller, fallback = "merchant") {
  if (affiliateProvider && affiliateReseller) {
    return "reseller-pg-affiliate";
  }
  if (affiliateProvider) {
    return "pg-affiliate";
  }
  if (affiliateReseller) {
    return "reseller-affiliate";
  }
  return fallback;
}

export function getResellerDisplayName(affiliateReseller) {
  return (
    affiliateReseller?.businessName?.trim() ||
    affiliateReseller?.fullName?.trim() ||
    null
  );
}

export function buildAffiliateLeadFields(affiliateProvider, affiliateReseller, { assignPg = true } = {}) {
  const now = new Date();
  const fields = {
    registeredViaPgId: affiliateProvider?._id ?? null,
    registeredViaResellerId: affiliateReseller?._id ?? null,
    referredByResellerName: getResellerDisplayName(affiliateReseller),
    source: resolveLeadSource(affiliateProvider, affiliateReseller),
  };

  if (assignPg && affiliateProvider) {
    fields.assignedPgId = affiliateProvider._id;
    fields.assignedPgName = affiliateProvider.companyName ?? null;
    fields.assignedAt = now;
  }

  return fields;
}

export function appendAffiliateUpdates(lead, affiliateProvider, affiliateReseller, updates) {
  if (!lead.registeredViaResellerId && affiliateReseller) {
    updates.registeredViaResellerId = affiliateReseller._id;
    updates.referredByResellerName = getResellerDisplayName(affiliateReseller);
    if (!lead.source || lead.source === "merchant") {
      updates.source = resolveLeadSource(affiliateProvider, affiliateReseller);
    }
  }

  if (!lead.registeredViaPgId && affiliateProvider) {
    updates.registeredViaPgId = affiliateProvider._id;
    if (!lead.assignedPgId) {
      updates.assignedPgId = affiliateProvider._id;
      updates.assignedPgName = affiliateProvider.companyName ?? null;
      updates.assignedAt = new Date();
    }
    if ((!lead.source || lead.source === "merchant") && !updates.source) {
      updates.source = resolveLeadSource(affiliateProvider, affiliateReseller);
    }
  }
}
