type EmployeePayoutRemovalInput = {
  isPaid: boolean;
};

export function canRemoveEmployeePayoutRow(input: EmployeePayoutRemovalInput) {
  return !input.isPaid;
}

export function assertEmployeePayoutRemovable(input: EmployeePayoutRemovalInput) {
  if (!canRemoveEmployeePayoutRow(input)) {
    throw new Error("Paid payout rows cannot be removed.");
  }
}
