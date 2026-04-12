"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { buildInvoiceAdjustmentPayload } from "./adjustments";
import { parseInvoiceHeaderFormInput } from "./invoice-editor";
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
  deleteInvoice,
  deleteInvoiceAdjustment,
  deleteInvoiceLineItem,
  deleteInvoiceTeam,
  updateInvoiceLineItem,
  updateInvoiceLineItemTotal,
  updateInvoiceTeamTotal,
  updateInvoiceGrandTotal,
  updateInvoiceHeader,
  updateInvoiceAdjustmentAmount,
  updateInvoiceNote,
  updateInvoiceStatus,
  updateEmployee,
  addEmployeePayoutRow,
  updateEmployeePayout,
  markEmployeePayoutPaid,
  removeEmployeePayoutRow,
  upsertDashboardExpense,
} from "./store";
import type { EmployeeCashFlowEntryWriteInput } from "./employee-cash-flow-types";
import {
  replaceInvoicePaymentEmployeeEntries,
  updateDashboardEmployeeCashFlowEntry,
  upsertEmployeeSalaryPayment,
  upsertInvoicePayment,
} from "./employee-cash-flow-store";
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

function getPositiveNumberOrThrow(rawValue: string, fieldLabel: string) {
  const value = Number.parseFloat(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldLabel} must be greater than 0.`);
  }
  return value;
}

function wholeUsdCentsFromInput(input: string) {
  const normalized = Number.parseFloat(input || "0");
  if (Number.isNaN(normalized)) {
    return 0;
  }

  return Math.round(normalized) * 100;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return fallback;
}

function getNonNegativeNumberOrThrow(rawValue: string, fieldLabel: string) {
  const value = Number.parseFloat(rawValue);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldLabel} cannot be negative.`);
  }
  return value;
}

function parseEmployeeCashFlowEntriesJson(rawValue: string) {
  if (!rawValue) {
    return [] as EmployeeCashFlowEntryWriteInput[];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new Error("Employee cash flow rows could not be parsed.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Employee cash flow rows must be an array.");
  }

  return parsed as EmployeeCashFlowEntryWriteInput[];
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
    payoutMonthlyUsdCents: centsFromUsd(getString(formData, "payoutMonthlyUsd")),
    hrsPerWeek: Number.parseFloat(getString(formData, "hrsPerWeek")),
    activeFrom: getString(formData, "activeFrom"),
    activeTo: getString(formData, "activeTo") || undefined,
  });

  revalidatePath("/");
  revalidatePath("/employees");
  redirect("/employees");
}

export async function updateEmployeeAction(formData: FormData) {
  await updateEmployee({
    employeeId: getString(formData, "employeeId"),
    companyId: getString(formData, "companyId"),
    fullName: getString(formData, "fullName"),
    designation: getString(formData, "designation"),
    defaultTeam: getString(formData, "defaultTeam"),
    billingRateUsdCents: centsFromUsd(getString(formData, "billingRateUsd")),
    payoutMonthlyUsdCents: centsFromUsd(getString(formData, "payoutMonthlyUsd")),
    hrsPerWeek: Number.parseFloat(getString(formData, "hrsPerWeek")),
    activeFrom: getString(formData, "activeFrom"),
    activeTo: getString(formData, "activeTo") || undefined,
    isActive: getString(formData, "isActive") === "true",
  });

  revalidatePath("/employees");
  revalidatePath("/invoices");
  redirect("/employees");
}

export async function createInvoiceDraftAction(formData: FormData) {
  const selectedTeamNames = formData
    .getAll("selectedTeamNames")
    .map((value) => String(value).trim())
    .filter(Boolean);

  let redirectTo = "/invoices/create";
  try {
    const invoice = await createInvoiceDraft({
      companyId: getString(formData, "companyId"),
      month: Number.parseInt(getString(formData, "month"), 10),
      year: Number.parseInt(getString(formData, "year"), 10),
      invoiceNumber: getString(formData, "invoiceNumber"),
      billingDate: getString(formData, "billingDate"),
      billingDuration: getString(formData, "billingDuration") || undefined,
      dueDate: getString(formData, "dueDate"),
      duplicateSourceId: getString(formData, "duplicateSourceId") || undefined,
      selectedTeamNames,
    });

    revalidatePath("/");
    revalidatePath("/invoices");
    revalidatePath("/invoices/create");
    redirectTo = `/invoices/drafts/${invoice.id}`;
  } catch (error) {
    redirectTo = buildFlashRedirect(
      "/invoices/create",
      "error",
      getErrorMessage(error, "Unable to create draft invoice."),
    );
  }

  redirect(redirectTo);
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
    hrsPerWeek: Number.parseFloat(getString(formData, "hrsPerWeek")),
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
    const daysWorked = Number.parseFloat(getString(formData, "daysWorked"));
    if (!Number.isFinite(daysWorked) || daysWorked <= 0) {
      throw new Error("Days worked must be greater than 0.");
    }

    await updateInvoiceLineItem({
      invoiceId,
      lineItemId,
      hrsPerWeek: Number.parseFloat(getString(formData, "hrsPerWeek")),
      daysWorked,
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

export async function updateInvoiceLineItemTotalAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
    const lineItemId = getString(formData, "lineItemId");
    if (!lineItemId) {
      throw new Error("Select a member before updating total.");
    }

    await updateInvoiceLineItemTotal({
      invoiceId,
      lineItemId,
      billedTotalUsdCents: wholeUsdCentsFromInput(getString(formData, "billedTotalUsd")),
    });

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/cashout");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to update line total.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Line total updated."));
}

export async function updateInvoiceTeamTotalAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
    const invoiceTeamId = getString(formData, "invoiceTeamId");
    if (!invoiceTeamId) {
      throw new Error("Select a team before updating total.");
    }

    await updateInvoiceTeamTotal({
      invoiceId,
      invoiceTeamId,
      totalUsdCents: wholeUsdCentsFromInput(getString(formData, "teamTotalUsd")),
    });

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/cashout");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to update team total.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Team total updated."));
}

export async function updateInvoiceGrandTotalAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
    await updateInvoiceGrandTotal({
      invoiceId,
      grandTotalUsdCents: wholeUsdCentsFromInput(getString(formData, "grandTotalUsd")),
    });

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/cashout");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to update grand total.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Grand total updated."));
}

export async function updateInvoiceHeaderAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
    const parsed = parseInvoiceHeaderFormInput({
      companyId: getString(formData, "companyId"),
      companyName: getString(formData, "companyName"),
      invoiceNumber: getString(formData, "invoiceNumber"),
      month: getString(formData, "month"),
      year: getString(formData, "year"),
      billingDate: getString(formData, "billingDate"),
      dueDate: getString(formData, "dueDate"),
      status: getString(formData, "status"),
    });

    await updateInvoiceHeader({
      invoiceId,
      ...parsed,
    });

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
        error instanceof Error ? error.message : "Unable to update invoice header.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Invoice header updated."));
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
            rateUsdCents: centsFromUsd(getString(formData, "rateUsd")),
            hrsPerWeek: Number.parseFloat(getString(formData, "hrsPerWeek") || "0"),
            daysWorked: Number.parseInt(getString(formData, "daysWorked") || "0", 10),
            amountUsdCents: wholeUsdCentsFromInput(getString(formData, "amountUsd")),
          })
        : buildInvoiceAdjustmentPayload({
            type,
            employeeName: getString(formData, "employeeName"),
            rateUsdCents: centsFromUsd(getString(formData, "rateUsd")),
            hrsPerWeek: Number.parseFloat(getString(formData, "hrsPerWeek") || "0"),
            daysWorked: Number.parseInt(getString(formData, "daysWorked") || "0", 10),
            amountUsdCents: wholeUsdCentsFromInput(getString(formData, "amountUsd")),
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

export async function updateInvoiceAdjustmentAmountAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getDraftReturnPath(formData, invoiceId);

  try {
    const adjustmentId = getString(formData, "adjustmentId");
    if (!adjustmentId) {
      throw new Error("Select an adjustment before updating amount.");
    }

    await updateInvoiceAdjustmentAmount({
      invoiceId,
      adjustmentId,
      amountUsdCents: wholeUsdCentsFromInput(getString(formData, "amountUsd")),
    });

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/cashout");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Unable to update adjustment amount.",
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Adjustment amount updated."));
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

export async function deleteInvoiceAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getString(formData, "returnTo") || "/invoices";

  try {
    if (!invoiceId) {
      throw new Error("Invoice id is required.");
    }

    await deleteInvoice(invoiceId);

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
    revalidatePath("/invoices");
    revalidatePath("/cashout");
    revalidatePath("/employee-payout");
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        getErrorMessage(error, "Unable to delete invoice."),
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Invoice deleted."));
}

export async function cashOutInvoiceAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getString(formData, "returnTo") || "/cashout";

  try {
    const realizedAt = getString(formData, "realizedAt");
    if (!realizedAt) {
      throw new Error("Select a cashout date.");
    }

    const dollarInboundUsdCents = centsFromUsd(getString(formData, "dollarInboundUsd"));
    if (dollarInboundUsdCents <= 0) {
      throw new Error("Dollar inbound must be greater than 0.");
    }

    const usdInrRate = getPositiveNumberOrThrow(
      getString(formData, "usdInrRate"),
      "USD/INR rate",
    );

    await cashOutInvoice(invoiceId, realizedAt, dollarInboundUsdCents, usdInrRate);

    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath(`/invoices/drafts/${invoiceId}`);
    revalidatePath("/dashboard");
    revalidatePath("/invoices");
    revalidatePath("/cashout");
    revalidatePath("/employee-payout");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        getErrorMessage(error, "Unable to mark cashout."),
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Invoice marked as cashed out."));
}

export async function updateEmployeePayoutAction(formData: FormData) {
  const payoutId = getString(formData, "payoutId");
  const returnTo = getString(formData, "returnTo") || "/employee-payout";

  try {
    const employeeMonthlyUsdCents = centsFromUsd(getString(formData, "employeeMonthlyUsd"));
    if (employeeMonthlyUsdCents <= 0) {
      throw new Error("Employee monthly dollars must be greater than 0.");
    }
    const dollarInwardUsdCents = centsFromUsd(getString(formData, "dollarInwardUsd"));
    if (dollarInwardUsdCents < 0) {
      throw new Error("Dollars inward cannot be negative.");
    }

    const cashoutUsdInrRate = Number.parseFloat(getString(formData, "cashoutUsdInrRate"));
    if (!Number.isFinite(cashoutUsdInrRate) || cashoutUsdInrRate < 0) {
      throw new Error("Cashout USD/INR rate cannot be negative.");
    }

    const paidUsdInrRateRaw = getString(formData, "paidUsdInrRate");
    const paidUsdInrRate = paidUsdInrRateRaw
      ? Number.parseFloat(paidUsdInrRateRaw)
      : 0;
    if (!Number.isFinite(paidUsdInrRate) || paidUsdInrRate < 0) {
      throw new Error("Paid USD/INR rate cannot be negative.");
    }
    const pfInrCents = centsFromUsd(getString(formData, "pfInr"));
    if (pfInrCents < 0) {
      throw new Error("PF cannot be negative.");
    }

    const tdsInrCents = centsFromUsd(getString(formData, "tdsInr"));
    if (tdsInrCents < 0) {
      throw new Error("TDS cannot be negative.");
    }

    const actualPaidInrCents = centsFromUsd(getString(formData, "actualPaidInr"));
    if (actualPaidInrCents < 0) {
      throw new Error("Actual paid cannot be negative.");
    }

    await updateEmployeePayout({
      payoutId,
      dollarInwardUsdCents,
      employeeMonthlyUsdCents,
      cashoutUsdInrRate,
      paidUsdInrRate,
      pfInrCents,
      tdsInrCents,
      actualPaidInrCents,
    });

    revalidatePath("/employee-payout");
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        getErrorMessage(error, "Unable to update employee payout."),
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Employee payout updated."));
}

export async function updateDashboardEmployeeCashFlowEntryAction(formData: FormData) {
  const entryId = getString(formData, "payoutId");
  const returnTo = getString(formData, "returnTo") || "/dashboard";

  try {
    const employeeMonthlyUsdCents = centsFromUsd(getString(formData, "employeeMonthlyUsd"));
    if (employeeMonthlyUsdCents <= 0) {
      throw new Error("Employee monthly dollars must be greater than 0.");
    }
    const dollarInwardUsdCents = centsFromUsd(getString(formData, "dollarInwardUsd"));
    if (dollarInwardUsdCents < 0) {
      throw new Error("Dollars inward cannot be negative.");
    }

    const cashoutUsdInrRate = Number.parseFloat(getString(formData, "cashoutUsdInrRate"));
    if (!Number.isFinite(cashoutUsdInrRate) || cashoutUsdInrRate < 0) {
      throw new Error("Cashout USD/INR rate cannot be negative.");
    }

    const paidUsdInrRateRaw = getString(formData, "paidUsdInrRate");
    const paidUsdInrRate = paidUsdInrRateRaw
      ? Number.parseFloat(paidUsdInrRateRaw)
      : 0;
    if (!Number.isFinite(paidUsdInrRate) || paidUsdInrRate < 0) {
      throw new Error("Paid USD/INR rate cannot be negative.");
    }
    const pfInrCents = centsFromUsd(getString(formData, "pfInr"));
    if (pfInrCents < 0) {
      throw new Error("PF cannot be negative.");
    }

    const tdsInrCents = centsFromUsd(getString(formData, "tdsInr"));
    if (tdsInrCents < 0) {
      throw new Error("TDS cannot be negative.");
    }

    const actualPaidInrCents = centsFromUsd(getString(formData, "actualPaidInr"));
    if (actualPaidInrCents < 0) {
      throw new Error("Actual paid cannot be negative.");
    }

    await updateDashboardEmployeeCashFlowEntry({
      entryId,
      dollarInwardUsdCents,
      employeeMonthlyUsdCents,
      cashoutUsdInrRate,
      paidUsdInrRate,
      pfInrCents,
      tdsInrCents,
      actualPaidInrCents,
    });

    revalidatePath("/dashboard");
    revalidatePath("/employee-cash-flow");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        getErrorMessage(error, "Unable to update dashboard cash flow row."),
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Dashboard cash flow row updated."));
}

export async function markEmployeePayoutPaidAction(formData: FormData) {
  const payoutId = getString(formData, "payoutId");
  const returnTo = getString(formData, "returnTo") || "/employee-payout";

  try {
    await markEmployeePayoutPaid({
      payoutId,
      paidAt: getString(formData, "paidAt") || new Date().toISOString().slice(0, 10),
    });

    revalidatePath("/employee-payout");
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        getErrorMessage(error, "Unable to mark employee payout as paid."),
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Employee payout marked as paid."));
}

export async function addEmployeePayoutRowAction(formData: FormData) {
  const invoiceId = getString(formData, "invoiceId");
  const returnTo = getString(formData, "returnTo") || "/employee-payout";

  try {
    const employeeId = getString(formData, "employeeId");
    if (!employeeId) {
      throw new Error("Select an employee to add.");
    }

    await addEmployeePayoutRow({
      invoiceId,
      employeeId,
    });

    revalidatePath("/employee-payout");
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        getErrorMessage(error, "Unable to add employee payout row."),
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Employee added to payout list."));
}

export async function removeEmployeePayoutRowAction(formData: FormData) {
  const payoutId = getString(formData, "payoutId");
  const returnTo = getString(formData, "returnTo") || "/employee-payout";

  try {
    await removeEmployeePayoutRow({ payoutId });

    revalidatePath("/employee-payout");
    revalidatePath("/dashboard");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        getErrorMessage(error, "Unable to remove employee payout."),
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Employee payout removed."));
}

export async function saveDashboardExpenseAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/dashboard";

  try {
    const companyId = getString(formData, "companyId");
    if (!companyId) {
      throw new Error("Select a company first.");
    }
    const periodType = getString(formData, "periodType") as "monthly" | "yearly";
    if (periodType !== "monthly" && periodType !== "yearly") {
      throw new Error("Invalid period type.");
    }

    const year = Number.parseInt(getString(formData, "year"), 10);
    if (!Number.isFinite(year) || year <= 0) {
      throw new Error("Invalid year.");
    }

    const monthRaw = getString(formData, "month");
    const month = monthRaw ? Number.parseInt(monthRaw, 10) : undefined;
    if (periodType === "monthly" && (!month || month < 1 || month > 12)) {
      throw new Error("Invalid month for monthly expense.");
    }

    const amountInrCents = centsFromUsd(getString(formData, "amountInr"));
    if (amountInrCents < 0) {
      throw new Error("Expenses cannot be negative.");
    }

    await upsertDashboardExpense({
      companyId,
      periodType,
      year,
      month,
      amountInrCents,
    });

    revalidatePath("/dashboard");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        getErrorMessage(error, "Unable to save expense."),
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Expense saved."));
}

export async function saveInvoicePaymentAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/employee-cash-flow";

  try {
    const invoiceId = getString(formData, "invoiceId");
    if (!invoiceId) {
      throw new Error("Select an invoice first.");
    }

    const companyId = getString(formData, "companyId");
    if (!companyId) {
      throw new Error("Select a company first.");
    }

    const paymentMonth = getString(formData, "paymentMonth");
    if (!/^\d{4}-\d{2}$/.test(paymentMonth)) {
      throw new Error("Select a valid payment month.");
    }

    const paymentDate = getString(formData, "paymentDate");
    if (!paymentDate) {
      throw new Error("Select a payment date.");
    }

    const usdInrRate = getNonNegativeNumberOrThrow(
      getString(formData, "usdInrRate"),
      "USD/INR rate",
    );

    const invoicePaymentId = await upsertInvoicePayment({
      invoicePaymentId: getString(formData, "invoicePaymentId") || undefined,
      invoiceId,
      companyId,
      paymentDate,
      paymentMonth,
      usdInrRate,
      notes: getString(formData, "notes") || undefined,
    });

    revalidatePath("/employee-cash-flow");
    redirect(
      buildFlashRedirect(
        `${returnTo}${returnTo.includes("?") ? "&" : "?"}invoicePaymentId=${encodeURIComponent(invoicePaymentId)}`,
        "success",
        "Invoice payment saved.",
      ),
    );
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        getErrorMessage(error, "Unable to save invoice payment."),
      ),
    );
  }
}

export async function saveInvoicePaymentEmployeeEntriesAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/employee-cash-flow";

  try {
    const invoiceId = getString(formData, "invoiceId");
    if (!invoiceId) {
      throw new Error("Invoice is required.");
    }

    const companyId = getString(formData, "companyId");
    if (!companyId) {
      throw new Error("Company is required.");
    }

    const paymentMonth = getString(formData, "paymentMonth");
    if (!/^\d{4}-\d{2}$/.test(paymentMonth)) {
      throw new Error("Payment month is invalid.");
    }

    const entries = parseEmployeeCashFlowEntriesJson(getString(formData, "entriesJson"));

    const invoicePaymentId =
      getString(formData, "invoicePaymentId") ||
      (await upsertInvoicePayment({
        invoiceId,
        companyId,
        paymentDate: `${paymentMonth}-01`,
        paymentMonth,
        usdInrRate: entries[0]?.cashoutUsdInrRate ?? 0,
      }));

    await replaceInvoicePaymentEmployeeEntries({
      invoicePaymentId,
      invoiceId,
      companyId,
      paymentMonth,
      entries,
    });

    for (const entry of entries) {
      await upsertEmployeeSalaryPayment({
        employeeId: entry.employeeId,
        companyId,
        month: paymentMonth,
        salaryUsdCents: entry.monthlyPaidUsdCents,
        paidUsdInrRate: entry.paidUsdInrRate,
        paidStatus: entry.isPaid,
        paidDate: entry.paidAt,
        notes: entry.notes,
      });
    }

    revalidatePath("/employee-cash-flow");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        getErrorMessage(error, "Unable to save employee cash flow rows."),
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Employee cash flow rows saved."));
}

export async function saveEmployeeSalaryPaymentAction(formData: FormData) {
  const returnTo = getString(formData, "returnTo") || "/employee-cash-flow";

  try {
    const employeeId = getString(formData, "employeeId");
    if (!employeeId) {
      throw new Error("Employee is required.");
    }

    const companyId = getString(formData, "companyId");
    if (!companyId) {
      throw new Error("Company is required.");
    }

    const month = getString(formData, "month");
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new Error("Month is invalid.");
    }

    const salaryUsdCents = centsFromUsd(getString(formData, "salaryUsd"));
    if (salaryUsdCents < 0) {
      throw new Error("Salary USD cannot be negative.");
    }

    const paidUsdInrRate = getNonNegativeNumberOrThrow(
      getString(formData, "paidUsdInrRate"),
      "Paid USD/INR rate",
    );

    await upsertEmployeeSalaryPayment({
      employeeId,
      companyId,
      month,
      salaryUsdCents,
      paidUsdInrRate,
      paidStatus: getString(formData, "paidStatus") === "true",
      paidDate: getString(formData, "paidDate") || undefined,
      notes: getString(formData, "notes") || undefined,
    });

    revalidatePath("/employee-cash-flow");
  } catch (error) {
    redirect(
      buildFlashRedirect(
        returnTo,
        "error",
        getErrorMessage(error, "Unable to save salary payment."),
      ),
    );
  }

  redirect(buildFlashRedirect(returnTo, "success", "Salary payment saved."));
}
