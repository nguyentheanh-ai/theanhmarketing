import { getCourses } from "@/services/courseService";
import { getLeads } from "@/services/leadService";
import { getPaymentOrders } from "@/services/orderService";
import { getStudentAccessRecords } from "@/services/studentAccessService";
import { invalidateAdminDataCache, readAdminDataCache } from "@/services/adminDataCache";
import { getRecentLeadActivities } from "@/services/leadActivityService";

const adminCacheTtlMs = 30_000;
const adminActivityCacheTtlMs = 15_000;

export const adminDataCacheKeys = {
  courses: "admin:courses",
  leads: "admin:leads",
  orders: "admin:orders",
  students: "admin:students",
  activities: "admin:activities",
} as const;

export function getAdminCourses() {
  return readAdminDataCache(adminDataCacheKeys.courses, () => getCourses(), adminCacheTtlMs);
}

export function getAdminLeads() {
  return readAdminDataCache(adminDataCacheKeys.leads, () => getLeads({ includeFallback: false }), adminCacheTtlMs);
}

export function getAdminPaymentOrders() {
  return readAdminDataCache(adminDataCacheKeys.orders, () => getPaymentOrders({ includeFallback: false }), adminCacheTtlMs);
}

export function getAdminStudentAccessRecords() {
  return readAdminDataCache(adminDataCacheKeys.students, () => getStudentAccessRecords(), adminCacheTtlMs);
}

export function getAdminLeadActivities() {
  return readAdminDataCache(adminDataCacheKeys.activities, () => getRecentLeadActivities(10), adminActivityCacheTtlMs);
}

export function invalidateAdminActivities() {
  invalidateAdminModules(["activities"]);
}

export function invalidateAdminModules(modules: Array<keyof typeof adminDataCacheKeys>) {
  invalidateAdminDataCache(modules.map((module) => adminDataCacheKeys[module]));
}
