import api, { v1 } from "@/lib/api";
import { CSRF_PROTECTION } from "@/config";
import { getCsrfTokenFromCookie } from "@/lib/csrf";

// Types
export type Department = { id: string; name: string };
export type Category = { id: string; name: string; departmentId: string };
export type Stats = { reports?: any; users?: any; departments?: any; categories?: any; updatedAt?: string };
export type CasePolicy = Partial<{
  restrictVisibility: boolean;
  allowMentions: boolean;
  redactPii: boolean;
  allowAttachments: boolean;
  privacyDefault: 'ANONIMO'|'CONFIDENZIALE';
  allowAnonymous: boolean;
  autoAssign: 'OFF'|'ROUND_ROBIN'|'LEAST_LOADED';
  defaultAssigneeUserId: string|null;
  slaHours: number;
  notifyOnAssign: boolean;
  notifyOnStatusChange: boolean;
  requireMfaForAdmins: boolean;
}>;
export type TemplateQuestion = {
  id?: string;
  type: 'TEXT'|'TEXTAREA'|'SELECT'|'MULTISELECT'|'RADIO'|'CHECKBOX'|'DATE'|'NUMBER'|'FILE';
  label: string; required: boolean; options?: string[]; order: number;
};
export type Template = { id: string; name: string; questions?: TemplateQuestion[] };

export type BillingProfile = {
  legalName: string; vatNumber?: string;
  address: { country: string; city: string; zip: string; line1: string; line2?: string };
  emailForInvoices: string;
};
export type Subscription = {
  plan: 'FREE'|'PRO'|'ENTERPRISE';
  status: 'ACTIVE'|'PAST_DUE'|'CANCELED';
  period: { currentStart: string; currentEnd: string };
  seats: number;
  limits?: any;
};
export type PaymentMethodMasked = {
  brand?: string; last4?: string; expMonth?: number; expYear?: number; holderName?: string;
  billingAddress?: BillingProfile['address']; updatedAt?: string;
};

function csrfHeaders() {
  if (!CSRF_PROTECTION) return undefined;
  const token = getCsrfTokenFromCookie();
  return token ? { 'X-CSRF-Token': token } : undefined;
}

// Stats
export async function getStats(): Promise<Stats> {
  const { data } = await api.get(v1('tenant/stats'), { withCredentials: true });
  return (data as any) || {};
}

// Departments CRUD
export async function listDepartments(): Promise<Department[]> {
  const { data } = await api.get(v1('tenant/departments'), { withCredentials: true });
  return Array.isArray(data) ? (data as Department[]) : [];
}
export async function createDepartment(dto: { name: string }): Promise<Department> {
  const { data } = await api.post(v1('tenant/departments'), dto, { withCredentials: true, headers: csrfHeaders() });
  return data as Department;
}
export async function updateDepartment(id: string, dto: { name?: string }): Promise<Department> {
  const { data } = await api.patch(v1(`tenant/departments/${encodeURIComponent(id)}`), dto, { withCredentials: true, headers: csrfHeaders() });
  return data as Department;
}
export async function deleteDepartment(id: string): Promise<void> {
  await api.delete(v1(`tenant/departments/${encodeURIComponent(id)}`), { withCredentials: true, headers: csrfHeaders() });
}

// Categories CRUD
export async function listCategories(params?: { departmentId?: string }): Promise<Category[]> {
  const { data } = await api.get(v1('tenant/categories'), { params: params?.departmentId ? { departmentId: params.departmentId } : {}, withCredentials: true });
  return Array.isArray(data) ? (data as Category[]) : [];
}
export async function createCategory(dto: { name: string; departmentId: string }): Promise<Category> {
  const { data } = await api.post(v1('tenant/categories'), dto, { withCredentials: true, headers: csrfHeaders() });
  return data as Category;
}
export async function updateCategory(id: string, dto: { name?: string; departmentId?: string }): Promise<Category> {
  const { data } = await api.patch(v1(`tenant/categories/${encodeURIComponent(id)}`), dto, { withCredentials: true, headers: csrfHeaders() });
  return data as Category;
}
export async function deleteCategory(id: string): Promise<void> {
  await api.delete(v1(`tenant/categories/${encodeURIComponent(id)}`), { withCredentials: true, headers: csrfHeaders() });
}

// Case Policy
export async function getCasePolicy(): Promise<CasePolicy> {
  const { data } = await api.get(v1('tenant/case-policy'), { withCredentials: true });
  return (data as any) || {};
}
export async function updateCasePolicy(dto: Partial<CasePolicy>): Promise<CasePolicy> {
  const { data } = await api.put(v1('tenant/case-policy'), dto, { withCredentials: true, headers: csrfHeaders() });
  return data as CasePolicy;
}

// Templates CRUD (+ questions inline)
export async function listTemplates(): Promise<Template[]> {
  const { data } = await api.get(v1('tenant/templates'), { withCredentials: true });
  return Array.isArray(data) ? (data as Template[]) : [];
}
export async function createTemplate(dto: { name: string; questions?: TemplateQuestion[] }): Promise<Template> {
  const { data } = await api.post(v1('tenant/templates'), dto, { withCredentials: true, headers: csrfHeaders() });
  return data as Template;
}
export async function updateTemplate(id: string, dto: Partial<Template>): Promise<Template> {
  const { data } = await api.patch(v1(`tenant/templates/${encodeURIComponent(id)}`), dto, { withCredentials: true, headers: csrfHeaders() });
  return data as Template;
}
export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(v1(`tenant/templates/${encodeURIComponent(id)}`), { withCredentials: true, headers: csrfHeaders() });
}

// Billing
export async function getBillingProfile(): Promise<BillingProfile> {
  const { data } = await api.get(v1('tenant/billing/profile'), { withCredentials: true });
  return (data as BillingProfile);
}
export async function updateBillingProfile(dto: BillingProfile): Promise<BillingProfile> {
  const { data } = await api.put(v1('tenant/billing/profile'), dto, { withCredentials: true, headers: csrfHeaders() });
  return data as BillingProfile;
}
export async function getSubscription(): Promise<Subscription> {
  const { data } = await api.get(v1('tenant/billing/subscription'), { withCredentials: true });
  return (data as Subscription);
}
export async function updateSubscription(dto: Partial<Subscription>): Promise<Subscription> {
  const { data } = await api.put(v1('tenant/billing/subscription'), dto, { withCredentials: true, headers: csrfHeaders() });
  return data as Subscription;
}
export async function getPaymentMethod(): Promise<PaymentMethodMasked> {
  const { data } = await api.get(v1('tenant/billing/payment-method'), { withCredentials: true });
  return (data as PaymentMethodMasked);
}
export async function updatePaymentMethod(dto: Partial<PaymentMethodMasked>): Promise<PaymentMethodMasked> {
  const { data } = await api.put(v1('tenant/billing/payment-method'), dto, { withCredentials: true, headers: csrfHeaders() });
  return data as PaymentMethodMasked;
}

// (Optional) Storage placeholders behind FEATURE_STORAGE can be added later

