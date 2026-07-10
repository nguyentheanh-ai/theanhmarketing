import type { SegmentCondition, SegmentRules } from "./types";

type SegmentSubject = Record<string, unknown>;

function getValue(subject: SegmentSubject, field: string) {
  return field.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) {
      return (value as Record<string, unknown>)[key];
    }
    return undefined;
  }, subject);
}

function compare(condition: SegmentCondition, actual: unknown) {
  switch (condition.operator) {
    case "eq":
      return actual === condition.value;
    case "neq":
      return actual !== condition.value;
    case "gt":
      return Number(actual) > Number(condition.value);
    case "gte":
      return Number(actual) >= Number(condition.value);
    case "lt":
      return Number(actual) < Number(condition.value);
    case "lte":
      return Number(actual) <= Number(condition.value);
    case "contains":
      return Array.isArray(actual) ? actual.includes(condition.value) : String(actual ?? "").includes(String(condition.value ?? ""));
    case "not_contains":
      return Array.isArray(actual) ? !actual.includes(condition.value) : !String(actual ?? "").includes(String(condition.value ?? ""));
    case "in":
      return Array.isArray(condition.value) && condition.value.includes(actual);
    case "exists":
      return actual !== undefined && actual !== null && actual !== "";
    default:
      return false;
  }
}

export function evaluateSegmentRules(rules: SegmentRules, subject: SegmentSubject) {
  const results = rules.conditions.map((condition) => compare(condition, getValue(subject, condition.field)));
  if (rules.combinator === "or") return results.some(Boolean);
  return results.every(Boolean);
}

export function estimateSegmentPreview<T extends SegmentSubject>(rules: SegmentRules, rows: T[]) {
  return rows.filter((row) => evaluateSegmentRules(rules, row)).length;
}
