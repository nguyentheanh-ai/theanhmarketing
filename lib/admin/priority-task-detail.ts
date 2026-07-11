import type { CommandCenterRange, PriorityTask } from "@/lib/admin/solo-command-center";

const guidanceByKind: Record<PriorityTask["kind"], string> = {
  email: "Kiểm tra trạng thái gửi email, xử lý nguyên nhân thất bại và chỉ gửi lại sau khi xác nhận đúng người nhận.",
  account: "Kiểm tra trạng thái tài khoản học viên, sửa lỗi tạo tài khoản rồi xác nhận đăng nhập thành công.",
  access: "Kiểm tra quyền học và khóa học liên quan, thực hiện lại thao tác cấp quyền rồi xác nhận kết quả.",
  trial: "Liên hệ trước ngày hết hạn để xác nhận nhu cầu gia hạn, chuyển đổi hoặc kết thúc quyền dùng thử.",
  "pending-order": "Kiểm tra giao dịch và liên hệ xác nhận nhu cầu thanh toán trước khi thay đổi trạng thái đơn.",
};

export function buildPriorityTaskHref(
  taskId: string,
  range: CommandCenterRange,
  basePath = "/admin/dashboard",
  extraQuery: Record<string, string> = {},
) {
  const query = new URLSearchParams({
    from: range.from,
    to: range.to,
    ...extraQuery,
    task: taskId,
  });
  return `${basePath}?${query.toString()}#viec-can-xu-ly`;
}

export function getSelectedPriorityTaskDetail(
  tasks: PriorityTask[],
  selectedTaskId?: string,
  range?: CommandCenterRange,
  basePath = "/admin/dashboard",
  extraQuery: Record<string, string> = {},
) {
  if (!selectedTaskId) return null;
  const task = tasks.find((item) => item.id === selectedTaskId);
  if (!task) return null;
  const query = range ? `?${new URLSearchParams({ ...range, ...extraQuery }).toString()}` : "";
  return {
    task,
    guidance: guidanceByKind[task.kind],
    closeHref: `${basePath}${query}#viec-can-xu-ly`,
  };
}
