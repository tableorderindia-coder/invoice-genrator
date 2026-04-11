export function hasMissingSchemaColumn(
  error: unknown,
  tableName: string,
  columnName: string,
) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code =
    "code" in error && typeof error.code === "string" ? error.code : undefined;
  const message =
    "message" in error && typeof error.message === "string"
      ? error.message
      : undefined;

  if (!message) {
    return false;
  }

  if (code === "PGRST204") {
    return message.includes(
      `Could not find the '${columnName}' column of '${tableName}'`,
    );
  }

  if (code === "42703") {
    return message.includes(`column ${tableName}.${columnName} does not exist`);
  }

  return false;
}
