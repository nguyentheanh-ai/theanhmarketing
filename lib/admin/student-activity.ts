import type { ActivityLog, ActivityLogStatus } from "@/services/activityLogService";

export type SafeStudentActivity = {
  id: string;
  eventType: string;
  eventTitle: string;
  status: ActivityLogStatus;
  actorLabel: string;
  createdAt: string;
};

type StudentActivityDtoSource = Pick<
  ActivityLog,
  "id" | "eventType" | "status" | "actorType" | "createdAt"
>;

const allowedStatuses = new Set<ActivityLogStatus>(["success", "failed", "pending", "info"]);
const allowedEventTypes = new Set<string>([
  "payment_email_sent",
  "payment_email_failed",
  "payment_success_email_sent",
  "payment_success_email_failed",
  "student_account_created",
  "course_access_granted",
  "course_access_revoked",
  "student_login_success",
  "student_login_failed",
  "student_entered_learning",
  "lesson_completed",
  "password_changed",
  "password_reset_requested",
  "password_reset_completed",
  "profile_updated",
  "payment_status_updated",
  "sale_status_updated",
  "sheet_sync_success",
  "sheet_sync_failed",
]);

const controlledEventTitles = new Map<string, string>([
  ["payment_email_sent", "Đã gửi email thanh toán"],
  ["payment_email_failed", "Gửi email thanh toán thất bại"],
  ["payment_success_email_sent", "Đã gửi email xác nhận thanh toán"],
  ["payment_success_email_failed", "Gửi email xác nhận thanh toán thất bại"],
  ["student_account_created", "Đã tạo tài khoản học viên"],
  ["course_access_granted", "Đã cấp quyền khóa học"],
  ["course_access_revoked", "Đã thu quyền khóa học"],
  ["student_login_success", "Học viên đăng nhập thành công"],
  ["student_login_failed", "Học viên đăng nhập thất bại"],
  ["student_entered_learning", "Học viên vào bài học"],
  ["lesson_completed", "Học viên hoàn thành bài học"],
  ["password_changed", "Học viên đổi mật khẩu"],
  ["password_reset_requested", "Đã yêu cầu đặt lại mật khẩu"],
  ["password_reset_completed", "Đã đặt lại mật khẩu"],
  ["profile_updated", "Đã cập nhật hồ sơ"],
  ["payment_status_updated", "Đã cập nhật trạng thái thanh toán"],
  ["sale_status_updated", "Đã cập nhật trạng thái sale"],
  ["sheet_sync_success", "Đồng bộ dữ liệu thành công"],
  ["sheet_sync_failed", "Đồng bộ dữ liệu thất bại"],
]);

function cleanLabel(value: unknown, maxLength: number) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function getActorLabel(activity: Pick<ActivityLog, "actorType">) {
  if (activity.actorType === "student") return "Học viên";
  if (["admin", "sale", "support"].includes(activity.actorType)) return "Admin";
  return "Hệ thống";
}

export function normalizeStudentActivityTimelineLimit(value: number | undefined) {
  return Math.max(1, Math.min(Number.isFinite(value) ? Number(value) : 20, 20));
}

export function mapStudentActivityDto(activity: StudentActivityDtoSource): SafeStudentActivity {
  const eventType = cleanLabel(activity.eventType, 80).toLowerCase();
  const safeEventType = allowedEventTypes.has(eventType) ? eventType : "activity_updated";

  return {
    id: cleanLabel(activity.id, 120),
    eventType: safeEventType,
    eventTitle: controlledEventTitles.get(safeEventType) ?? "Hoạt động hệ thống",
    status: allowedStatuses.has(activity.status) ? activity.status : "info",
    actorLabel: getActorLabel(activity),
    createdAt: cleanLabel(activity.createdAt, 40),
  };
}
