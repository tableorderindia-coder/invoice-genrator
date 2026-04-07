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
  createTeam,
  deleteInvoiceLineItem,
  deleteInvoiceTeam,
  updateInvoiceLineItem,
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
  const selectedTeamNames = formData
    .getAll("selectedTeamNames")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const invoice = await createInvoiceDraft({
    companyId: getString(formData, "companyId"),
    month: Number.parseInt(getString(formData, "month"), 10),
    year: Number.parseInt(getString(formData, "year"), 10),
    invoiceNumber: getString(formData, "invoiceNumber"),
    billingDate: getString(formData, "billingDate"),
    dueDate: getString(formData, "dueDate"),
    duplicateSourceId: getString(formData, "duplicateSourceId") || undefined,
    selectedTeamNames,
  });

  revalidatePath("/");
  revalidatePath("/invoices");
  revalidatePath("/invoices/create");
  redirect(`/invoices/drafts/${invoice.id}`);
}

export async function addInvoiceTeamAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const companyId = getString(formData, "companyId");
  const selectedTeamName = getString(formData, "selectedTeamName");
  const newTeamName = getString(formData, "newTeamName");

  let teamName = selectedTeamName;
  if (!teamName && newTeamName) {
    const team = await createTeam({
      companyId,
      name: newTeamName,
    });
    teamName = team.name;
  }

  if (!teamName) {
    throw new Error("Select an existing team or create a new one.");
  }

  await addInvoiceTeam(invoiceId, teamName);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/invoices/drafts/${invoiceId}`);
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
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/invoices/drafts/${invoiceId}`);
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
  revalidatePath(`/invoices/drafts/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/dashboard");
}

export async function deleteInvoiceLineItemAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const lineItemId = getString(formData, "lineItemId");
  if (!lineItemId) {
    throw new Error("Select a member before removing it.");
  }

  await deleteInvoiceLineItem(invoiceId, lineItemId);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/invoices/drafts/${invoiceId}`);
  revalidatePath("/dashboard");
}

export async function updateInvoiceLineItemAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const lineItemId = getString(formData, "lineItemId");
  if (!lineItemId) {
    throw new Error("Select a member before updating it.");
  }

  await updateInvoiceLineItem({
    invoiceId,
    lineItemId,
    hoursBilled: Number.parseFloat(getString(formData, "hoursBilled")),
    billingRateUsdCents: centsFromUsd(getString(formData, "billingRateUsd")),
  });

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/invoices/drafts/${invoiceId}`);
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
  revalidatePath(`/invoices/drafts/${invoiceId}`);
  revalidatePath("/dashboard");
}

export async function updateInvoiceNoteAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  await updateInvoiceNote(invoiceId, getString(formData, "noteText"));

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/invoices/drafts/${invoiceId}`);
}

export async function updateInvoiceStatusAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  await updateInvoiceStatus(
    invoiceId,
    getString(formData, "status") as "draft" | "generated" | "sent" | "cashed_out",
  );

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/invoices/drafts/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/cashout");
  revalidatePath("/dashboard");
}

export async function cashOutInvoiceAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  await cashOutInvoice(invoiceId, getString(formData, "realizedAt"));

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/invoices/drafts/${invoiceId}`);
  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath("/cashout");
}
