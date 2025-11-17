import apiDefault, { v1 } from "@/lib/api";

const api = apiDefault;

const asFeature = <T>(p: Promise<T>) =>
  p.catch((err: any) => {
    const sc = err?.response?.status;
    if (sc === 404 || sc === 501) {
      return { __featureDisabled: true } as any as T;
    }
    throw err;
  });

/* -------------------- Types -------------------- */
export type StatsResponse = {
  kpis: { reports: number; avgDaysToReceive: number; avgDaysToClose: number; open: number };
  byMonth: { date: string; count: number }[];
  bySource: { name: "WEB" | "PHONE" | "EMAIL" | "OTHER"; value: number }[];
  byDepartment: { name: string | null; value: number }[];
  statusOverTime: { date: string; OPEN: number; IN_PROGRESS?: number; CLOSED: number }[];
};
export type Department = { id: string; name: string };
export type Category = { id: string; name: string; departmentId: string };
export type CasePolicy = {
  // Sistema / info-only
  restrictVisibility?: boolean;
  allowMentions?: boolean; // legacy (non usato)
  redactPii?: boolean;
  allowAttachments?: boolean;

  // Cataloghi modulo pubblico (configurabili)
  publicShowGlobalLookups?: boolean;
  publicShowTenantLookups?: boolean;
  publicLookupPreference?: 'GLOBAL' | 'TENANT';
};
export type BillingProfile = {
  companyName: string;
  taxId: string;
  address: string;
  zip: string;
  city: string;
  province: string;
  country: string;
  billingEmail: string;
};
export type Subscription = {
  plan: string;
  cycle: "MENSILE" | "ANNUALE";
  status: "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED" | "EXPIRED";
  startsAt?: string | null;
  nextBillingAt?: string | null;
  endsAt?: string | null;
};
export type PaymentMethod = { type: "CARTA" | "BONIFICO"; masked: string };
export type TemplateQuestion = { id: string; label: string; order: number };
export type Template = { id: string; name: string; createdAt?: string; updatedAt?: string; questions: TemplateQuestion[] };
export type MaybeFeatureOff<T> = T & { __featureDisabled?: true };

/* -------------------- STATS -------------------- */
export const getSettingsStats = () =>
  asFeature(api.get(v1("tenant/stats")).then(r => r.data as StatsResponse)) as Promise<MaybeFeatureOff<StatsResponse>>;

/* -------------------- DEPARTMENTS -------------------- */
export const listDepartments = () =>
  asFeature(api.get(v1("tenant/departments")).then(r => r.data as Department[])) as Promise<MaybeFeatureOff<Department[]>>;
export const createDepartment = (input: { name: string }) =>
  api.post(v1("tenant/departments"), input).then(r => r.data as Department);
export const updateDepartment = (id: string, input: { name?: string }) =>
  api.patch(v1(`tenant/departments/${id}`), input).then(r => r.data as Department);
export const deleteDepartment = (id: string) =>
  api.delete(v1(`tenant/departments/${id}`)).then(() => undefined);

/* -------------------- CATEGORIES -------------------- */
export const listCategories = (params?: { departmentId?: string }) =>
  asFeature(api.get(v1("tenant/categories"), { params }).then(r => r.data as Category[])) as Promise<MaybeFeatureOff<Category[]>>;
export const createCategory = (input: { name: string; departmentId: string }) =>
  api.post(v1("tenant/categories"), input).then(r => r.data as Category);
export const updateCategory = (id: string, input: { name?: string; departmentId?: string }) =>
  api.patch(v1(`tenant/categories/${id}`), input).then(r => r.data as Category);
export const deleteCategory = (id: string) =>
  api.delete(v1(`tenant/categories/${id}`)).then(() => undefined);

/* -------------------- CASE POLICY -------------------- */
export const getCasePolicy = () =>
  asFeature(api.get(v1("tenant/case-policy")).then(r => r.data as CasePolicy)) as Promise<MaybeFeatureOff<CasePolicy>>;
export const updateCasePolicy = (input: Partial<CasePolicy>) =>
  api.put(v1("tenant/case-policy"), input).then(r => r.data as CasePolicy);

/* -------------------- BILLING -------------------- */
export const getBillingProfile = () =>
  asFeature(api.get(v1("tenant/billing/profile")).then(r => r.data as BillingProfile)) as Promise<MaybeFeatureOff<BillingProfile>>;
export const updateBillingProfile = (input: Partial<BillingProfile>) =>
  api.put(v1("tenant/billing/profile"), input).then(r => r.data as BillingProfile);
export const getSubscription = () =>
  asFeature(api.get(v1("tenant/subscription")).then(r => r.data as Subscription)) as Promise<MaybeFeatureOff<Subscription>>;
export const updateSubscription = (input: Partial<Pick<Subscription, "cycle" | "status">>) =>
  api.put(v1("tenant/subscription"), input).then(r => r.data as Subscription);
export const getPaymentMethod = () =>
  asFeature(api.get(v1("tenant/payment-method")).then(r => r.data as PaymentMethod)) as Promise<MaybeFeatureOff<PaymentMethod>>;
export const updatePaymentMethod = (input: PaymentMethod) =>
  api.put(v1("tenant/payment-method"), input).then(r => r.data as PaymentMethod);

/* -------------------- TEMPLATES -------------------- */
export const listTemplates = () =>
  asFeature(api.get(v1("tenant/templates")).then(r => r.data as Template[])) as Promise<MaybeFeatureOff<Template[]>>;
export const createTemplate = (input: { name: string; questions?: Array<Pick<TemplateQuestion, "label" | "order">> }) =>
  api.post(v1("tenant/templates"), input).then(r => r.data as Template);
export const updateTemplate = (id: string, input: Partial<{ name: string; questions: Array<Pick<TemplateQuestion, "label" | "order">> }>) =>
  api.patch(v1(`tenant/templates/${id}`), input).then(r => r.data as Template);
export const deleteTemplate = (id: string) =>
  api.delete(v1(`tenant/templates/${id}`)).then(r => r.data as { message: string });

// Fine
