"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addInvoiceAdjustment,
  addInvoiceLineItem,
  addInvoiceTeam,
  cashOutInvoice,
  createCompany,
  createEmployee,
  createInvoiceDraft,
  deleteInvoiceTeam,
  updateInvoiceNote,
  updateInvoiceStatus,
} from "./store";
import { centsFromUsd } from "./utils";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

export async function createCompanyAction(formData: FormData) {
  await createCompany({
    name: getString(formData, "name"),
    billingAddress: getString(formData, "billingAddress"),
    defaultNote: getString(formData, "defaultNote"),
  });

  revalidatePath("/");
  revalidatePath("/companies");
  redirect("/companies");
}

export async function createEmployeeAction(formData: FormData) {
  await createEmployee({
    companyId: getString(formData, "companyId"),
    fullName: getString(formData, "fullName"),
    designation: getString(formData, "designation"),
    defaultTeam: getString(formData, "defaultTeam"),
    billingRateUsdCents: centsFromUsd(getString(formData, "billingRateUsd")),
    payoutRateUsdCents: centsFromUsd(getString(formData, "payoutRateUsd")),
    activeFrom: getString(formData, "activeFrom"),
    activeTo: getString(formData, "activeTo") || undefined,
  });

  revalidatePath("/");
  revalidatePath("/employees");
  redirect("/employees");
}

export async function createInvoiceDraftAction(formData: FormData) {
  const invoice = await createInvoiceDraft({
    companyId: getString(formData, "companyId"),
    month: Number.parseInt(getString(formData, "month"), 10),
    year: Number.parseInt(getString(formData, "year"), 10),
    invoiceNumber: getString(formData, "invoiceNumber"),
    billingDate: getString(formData, "billingDate"),
    dueDate: getString(formData, "dueDate"),
    duplicateSourceId: getString(formData, "duplicateSourceId") || undefined,
  });

  revalidatePath("/");
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function addInvoiceTeamAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  await addInvoiceTeam(invoiceId, getString(formData, "teamName"));

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

export async function addInvoiceLineItemAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const invoiceTeamId = getString(formData, "invoiceTeamId");
  if (!invoiceTeamId) {
    throw new Error("Select a team before adding a candidate.");
  }

  await addInvoiceLineItem({
    invoiceId,
    invoiceTeamId,
    employeeId: getString(formData, "employeeId"),
    hoursBilled: Number.parseFloat(getString(formData, "hoursBilled")),
    billingRateUsdCents: getString(formData, "billingRateUsd")
      ? centsFromUsd(getString(formData, "billingRateUsd"))
      : undefined,
    payoutRateUsdCents: getString(formData, "payoutRateUsd")
      ? centsFromUsd(getString(formData, "payoutRateUsd"))
      : undefined,
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}

export async function deleteInvoiceTeamAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const invoiceTeamId = getString(formData, "invoiceTeamId");
  if (!invoiceTeamId) {
    throw new Error("Select a team before removing it.");
  }

  await deleteInvoiceTeam(invoiceId, invoiceTeamId);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

export async function addInvoiceAdjustmentAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const type = getString(formData, "type") as
    | "onboarding"
    | "offboarding"
    | "reimbursement";
  const rawAmount = centsFromUsd(getString(formData, "amountUsd"));

  await addInvoiceAdjustment({
    invoiceId,
    type,
    label: getString(formData, "label"),
    employeeName: getString(formData, "employeeName") || undefined,
    amountUsdCents: type === "offboarding" ? -Math.abs(rawAmount) : rawAmount,
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
}

export async function updateInvoiceNoteAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  await updateInvoiceNote(invoiceId, getString(formData, "noteText"));

  revalidatePath(`/invoices/${invoiceId}`);
}

export async function updateInvoiceStatusAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  await updateInvoiceStatus(
    invoiceId,
    getString(formData, "status") as "draft" | "generated" | "sent" | "cashed_out",
  );

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

export async function cashOutInvoiceAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  await cashOutInvoice(invoiceId, getString(formData, "realizedAt"));

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/dashboard");
  revalidatePath("/invoices");
}
