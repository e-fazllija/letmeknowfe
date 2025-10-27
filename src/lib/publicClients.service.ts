// src/lib/publicClients.service.ts
import { v1 } from "@/lib/api";

export type EmployeeRange =
  | "DA_0_A_50"
  | "DA_51_A_100"
  | "DA_101_A_150"
  | "DA_151_A_200"
  | "DA_201_A_250"
  | "OLTRE_250";

export type BillingCycle = "MENSILE" | "ANNUALE";
export type ContractTerm = "ONE_YEAR" | "THREE_YEARS";
export type PaymentMethod = "CARTA" | "BONIFICO";

export type SignupPublicClientReq = {
  client: {
    companyName: string;
    contactEmail: string;
    employeeRange: EmployeeRange;
    status?: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
    billing: {
      billingTaxId: string;
      billingEmail: string;
      billingPec?: string;
      billingSdiCode?: string;
      billingAddressLine1: string;
      billingZip: string;
      billingCity: string;
      billingProvince: string;
      billingCountry: string;
    };
  };
  subscription: {
    billingCycle: BillingCycle;
    contractTerm: ContractTerm;
    amount: number;
    currency?: string; // default EUR
    paymentMethod: PaymentMethod;
    status?: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED";
    startsAt?: string | null;
    nextBillingAt?: string | null;
    trialEndsAt?: string | null;
    canceledAt?: string | null;
  };
  options?: { idempotencyKey?: string };
};

export type SignupPublicClientRes = {
  ok?: boolean;
  clientId?: string;
  client?: { id: string; companyName: string; contactEmail: string; employeeRange: EmployeeRange };
  subscription?: { id: string; status: string };
  message?: string;
  ownerInvite?: { activationUrl?: string };
};

function ensureIdempotencyKey(maybe?: string) {
  if (maybe && String(maybe).trim()) return String(maybe).trim();
  try {
    // Prefer native UUID when available
    const rnd = (crypto as any)?.randomUUID?.() || `${Math.random().toString(36).slice(2)}${Date.now()}`;
    return `req-${rnd}`;
  } catch {
    return `req-${Math.random().toString(36).slice(2)}${Date.now()}`;
  }
}

export async function signupPublicClient(payload: SignupPublicClientReq): Promise<SignupPublicClientRes> {
  const body: SignupPublicClientReq = {
    client: {
      companyName: payload.client.companyName,
      contactEmail: payload.client.contactEmail,
      employeeRange: payload.client.employeeRange,
      status: payload.client.status ?? "ACTIVE",
      billing: {
        billingTaxId: payload.client.billing.billingTaxId,
        billingEmail: payload.client.billing.billingEmail,
        billingPec: payload.client.billing.billingPec || undefined,
        billingSdiCode: payload.client.billing.billingSdiCode || undefined,
        billingAddressLine1: payload.client.billing.billingAddressLine1,
        billingZip: payload.client.billing.billingZip,
        billingCity: payload.client.billing.billingCity,
        billingProvince: payload.client.billing.billingProvince.toUpperCase(),
        billingCountry: payload.client.billing.billingCountry,
      },
    },
    subscription: {
      billingCycle: payload.subscription.billingCycle,
      contractTerm: payload.subscription.contractTerm,
      amount: payload.subscription.amount,
      currency: payload.subscription.currency ?? "EUR",
      paymentMethod: payload.subscription.paymentMethod,
      status: payload.subscription.status ?? "ACTIVE",
      startsAt: payload.subscription.startsAt ?? undefined,
      nextBillingAt: payload.subscription.nextBillingAt ?? undefined,
      trialEndsAt: payload.subscription.trialEndsAt ?? undefined,
      canceledAt: payload.subscription.canceledAt ?? undefined,
    },
    options: { idempotencyKey: ensureIdempotencyKey(payload.options?.idempotencyKey) },
  };

  // Hardening public signup: enforce credentials: "omit" and avoid x-tenant-id
  const RAW_BASE = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  function hostOrigin(url?: string): string {
    try {
      if (!url) return "";
      const withProto = /^https?:\/\//i.test(url) ? url : `http://${String(url).replace(/^\/+/, "")}`;
      const u = new URL(withProto);
      return `${u.protocol}//${u.host}`;
    } catch { return ""; }
  }
  const origin = hostOrigin(RAW_BASE) || "";
  const url = `${origin}${v1("public/clients/signup")}`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    const text = (data && data.message) || (await res.text().catch(() => ""));
    throw new Error(text || `Signup failed: ${res.status}`);
  }
  const clientId = data?.clientId ?? data?.client?.id;
  if (clientId) { try { localStorage.setItem("lmw_client_id", String(clientId)); } catch {} }
  return { ...(data || {}), clientId } as SignupPublicClientRes;
}
