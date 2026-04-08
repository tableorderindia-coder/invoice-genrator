"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildInvoiceAdjustmentPayload } from "./adjustments";
import {
  addInvoiceAdjustment,
  addInvoiceLineItem,
  assignEmployeeToInvoiceTeam,
  addInvoiceTeam,
  cashOutInvoice,
  createCompany,
  createEmployee,
  createInvoiceDraft,
  createTeam,
  deleteInvoiceAdjustment,
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

function buildFlashRedirect(path: string, status: "success" | "error", message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}flashStatus=${encodeURIComponent(status)}&flashMessage=${encodeURIComponent(message)}`;
}

function getDraftReturnPath(formData: FormData, invoiceId: string) {
  return getString(formData, "returnTo") || `/invoices/drafts/${invoiceId}`;
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
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
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
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to add team.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Team added to invoice."));
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

export async function assignInvoiceMemberAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
    const invoiceTeamId = getString(formData, "invoiceTeamId");
    const employeeId = getString(formData, "employeeId");
    if (!invoiceTeamId || !employeeId) {
      throw new Error("Select a team and member before adding.");
    }

    await assignEmployeeToInvoiceTeam({
      invoiceId,
      invoiceTeamId,
      employeeId,
    });

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to add member.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Member assigned to team."));
}

export async function deleteInvoiceTeamAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
    const invoiceTeamId = getString(formData, "invoiceTeamId");
    if (!invoiceTeamId) {
      throw new Error("Select a team before removing it.");
    }

    await deleteInvoiceTeam(invoiceId, invoiceTeamId);

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to remove team.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Team removed from invoice."));
}

export async function deleteInvoiceLineItemAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
    const lineItemId = getString(formData, "lineItemId");
    if (!lineItemId) {
      throw new Error("Select a member before removing it.");
    }

    await deleteInvoiceLineItem(invoiceId, lineItemId);

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to remove member.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Member removed from invoice."));
}

export async function updateInvoiceLineItemAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
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
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to update member.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Member details updated."));
}

export async function addInvoiceAdjustmentAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
    const type = getString(formData, "type") as
      | "onboarding"
      | "offboarding"
      | "reimbursement"
      | "appraisal";

    const payload =
      type === "reimbursement"
        ? buildInvoiceAdjustmentPayload({
            type,
            label: getString(formData, "label"),
            amountUsdCents: centsFromUsd(getString(formData, "amountUsd")),
          })
        : buildInvoiceAdjustmentPayload({
            type,
            employeeName: getString(formData, "employeeName"),
            rateUsdCents: centsFromUsd(getString(formData, "rateUsd")),
            hours: Number.parseFloat(getString(formData, "hours") || "0"),
          });

    await addInvoiceAdjustment({
      invoiceId,
      ...payload,
    });

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to add adjustment.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Adjustment added."));
}

export async function deleteInvoiceAdjustmentAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
    const adjustmentId = getString(formData, "adjustmentId");
    if (!adjustmentId) {
      throw new Error("Select an adjustment before removing it.");
    }

    await deleteInvoiceAdjustment(invoiceId, adjustmentId);

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to remove adjustment.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Adjustment removed."));
}

export async function updateInvoiceNoteAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
    await updateInvoiceNote(invoiceId, getString(formData, "noteText"));

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to save note.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Invoice note saved."));
}

export async function updateInvoiceStatusAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
    await updateInvoiceStatus(
      invoiceId,
      getString(formData, "status") as "draft" | "generated" | "sent" | "cashed_out",
    );

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/cashout");
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to update invoice status.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Invoice status updated."));
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
