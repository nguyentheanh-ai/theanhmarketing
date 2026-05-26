import { getCourses } from "@/services/courseService";
import { getLeads } from "@/services/leadService";
import { getPaymentOrders } from "@/services/orderService";
import { getStudentAccessRecords } from "@/services/studentAccessService";
import { invalidateAdminDataCache, readAdminDataCache } from "@/services/adminDataCache";

const adminCacheTtlMs = 30_000;

export const adminDataCacheKeys = {
  courses: "admin:courses",
  leads: "admin:leads",
  orders: "admin:orders",
  students: "admin:students",
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

export function invalidateAdminModules(modules: Array<keyof typeof adminDataCacheKeys>) {
  invalidateAdminDataCache(modules.map((module) => adminDataCacheKeys[module]));
}
