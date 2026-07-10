export type CrmV2OperationalEmailTemplateKey =
  | "registration_payment"
  | "payment_success_access"
  | "pending_payment_reminder";

export type CrmV2OperationalEmailTemplate = {
  key: CrmV2OperationalEmailTemplateKey;
  name: string;
  badge: string;
  description: string;
  source: string;
  goal: string;
  campaignType: string;
  audience: {
    label: string;
    paymentStatus: "new_or_pending" | "pending" | "paid";
    courseScope: "course_specific";
    defaultSegmentHint: string;
    filters: string[];
  };
  subject: string;
  preheader: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  footer: string;
  variables: string[];
};

const footer =
  "The Anh Marketing gửi email này vì anh/chị đã đăng ký khóa học hoặc có đơn hàng tại The Anh Marketing. Nếu thông tin chưa đúng, anh/chị có thể phản hồi email này để được hỗ trợ.";

export function buildCrmV2OperationalEmailTemplates(): CrmV2OperationalEmailTemplate[] {
  return [
    {
      key: "registration_payment",
      name: "Mail báo thanh toán",
      badge: "Đăng ký khóa học",
      description:
        "Gửi tự động sau khi khách đăng ký khóa học hoặc tạo đơn mới. Mục tiêu là xác nhận thông tin, nhắc đúng khóa học, số tiền, mã đơn và đưa khách tới trang thanh toán.",
      source: "Lấy form từ legacy registration + pending-payment flow",
      goal: "payment_recovery",
      campaignType: "transactional_order",
      audience: {
        label: "Khách vừa đăng ký / đơn mới chưa thanh toán",
        paymentStatus: "new_or_pending",
        courseScope: "course_specific",
        defaultSegmentHint: "Segment gợi ý: đơn mới, status pending/new, theo từng course_slug.",
        filters: ["status = pending hoặc new", "có order_code", "có email hợp lệ", "course_slug cụ thể"],
      },
      subject: "{{courseTitle}} - Thông tin thanh toán đơn {{orderCode}}",
      preheader: "The Anh Marketing đã nhận đăng ký của anh/chị. Đây là thông tin thanh toán và mã đơn.",
      body: [
        "Xin chào {{studentName}},",
        "The Anh Marketing đã nhận thông tin đăng ký khóa học {{courseTitle}} bằng email {{customerEmail}} và số điện thoại {{customerPhone}}.",
        "Đơn hàng của anh/chị đang ở trạng thái {{paymentStatus}}. Để hệ thống kích hoạt quyền học, anh/chị vui lòng thanh toán đúng số tiền và đúng nội dung chuyển khoản bên dưới.",
        "Chi tiết đơn hàng:",
        "- Mã đơn: {{orderCode}}",
        "- Khóa học/sản phẩm: {{courseTitle}}",
        "- Số tiền: {{amountLabel}}",
        "- Trạng thái: {{paymentStatus}}",
        "Thông tin chuyển khoản:",
        "- Ngân hàng: {{bankName}}",
        "- Số tài khoản: {{bankAccountNumber}}",
        "- Chủ tài khoản: {{bankAccountName}}",
        "- Nội dung chuyển khoản: {{transferContent}}",
        "Link thanh toán/QR của đơn: {{paymentUrl}}",
        "Sau khi thanh toán thành công, hệ thống sẽ tự động gửi email xác nhận và thông tin truy cập khóa học. Nếu anh/chị đã chuyển khoản nhưng chưa thấy email sau vài phút, hãy phản hồi email này hoặc nhắn Fanpage The Anh Marketing kèm ảnh giao dịch để được kiểm tra thủ công.",
        "Lưu ý nhỏ: anh/chị nên kiểm tra cả mục Spam, Promotions hoặc Quảng cáo trong hộp thư nếu chưa thấy email hướng dẫn.",
      ].join("\n\n"),
      ctaText: "Mở trang thanh toán",
      ctaUrl: "{{paymentUrl}}",
      footer,
      variables: [
        "studentName",
        "customerEmail",
        "customerPhone",
        "courseTitle",
        "amountLabel",
        "orderCode",
        "paymentStatus",
        "paymentUrl",
        "bankName",
        "bankAccountNumber",
        "bankAccountName",
        "transferContent",
      ],
    },
    {
      key: "payment_success_access",
      name: "Mail thanh toán thành công + khóa học",
      badge: "Đã thanh toán",
      description:
        "Gửi sau khi đơn được xác nhận paid. Email này xác nhận thanh toán, nhắc khóa học đã mua, gửi tài khoản học, link vào khu học viên và các tài nguyên đi kèm.",
      source: "Lấy form từ legacy payment-success-email flow",
      goal: "student_activation",
      campaignType: "transactional_order",
      audience: {
        label: "Khách đã thanh toán thành công",
        paymentStatus: "paid",
        courseScope: "course_specific",
        defaultSegmentHint: "Segment gợi ý: orders paid, có enrollment hoặc access marker, theo từng course_slug.",
        filters: ["status = paid", "có email hợp lệ", "course_slug cụ thể", "không gửi trùng theo order_code"],
      },
      subject: "{{courseTitle}} - Thanh toán thành công - {{orderCode}}",
      preheader: "Thanh toán đã được ghi nhận. Đây là thông tin truy cập khóa học của anh/chị.",
      body: [
        "Xin chào {{studentName}},",
        "The Anh Marketing xác nhận đơn {{orderCode}} của anh/chị đã thanh toán thành công.",
        "Thông tin đơn hàng:",
        "- Khóa học/sản phẩm: {{courseTitle}}",
        "- Số tiền đã thanh toán: {{amountLabel}}",
        "- Email đăng ký: {{customerEmail}}",
        "- Số điện thoại: {{customerPhone}}",
        "Tài khoản học:",
        "- Email đăng nhập: {{accountEmail}}",
        "- Mật khẩu tạm: {{temporaryPassword}}",
        "- Link vào khu học viên: {{courseAccessUrl}}",
        "Nếu hệ thống yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên, anh/chị hãy đặt mật khẩu mới để bảo vệ tài khoản.",
        "Anh/chị sẽ nhận được:",
        "- Quyền truy cập khóa học {{courseTitle}}",
        "- Tài liệu, checklist, prompt hoặc agent đi kèm theo gói đã mua",
        "- Hướng dẫn học và kênh hỗ trợ khi cần",
        "Link dashboard học viên: {{studentDashboardUrl}}",
        "Nếu chưa thấy tài khoản hoạt động hoặc không đăng nhập được, anh/chị phản hồi email này kèm mã đơn {{orderCode}} để The Anh Marketing kiểm tra tức thì.",
        "Lưu ý: nếu email nằm trong Spam/Promotions, anh/chị kéo email về Inbox để các thông báo học sau này không bị bỏ lỡ.",
      ].join("\n\n"),
      ctaText: "Vào khu học viên",
      ctaUrl: "{{courseAccessUrl}}",
      footer,
      variables: [
        "studentName",
        "customerEmail",
        "customerPhone",
        "accountEmail",
        "temporaryPassword",
        "courseTitle",
        "amountLabel",
        "orderCode",
        "courseAccessUrl",
        "studentDashboardUrl",
      ],
    },
    {
      key: "pending_payment_reminder",
      name: "Mail nhắc thanh toán",
      badge: "Chưa thanh toán",
      description:
        "Gửi cho khách đã tạo đơn nhưng chưa thanh toán. Email nhắc lại đúng mã đơn, khóa học, số tiền, thông tin chuyển khoản và link thanh toán để giảm rơi rớt.",
      source: "Lấy form từ legacy pending-payment-email flow",
      goal: "payment_recovery",
      campaignType: "cart_recovery",
      audience: {
        label: "Khách có đơn pending/expired/chưa paid",
        paymentStatus: "pending",
        courseScope: "course_specific",
        defaultSegmentHint: "Segment gợi ý: orders pending hoặc expired, chưa có paid_at, theo từng course_slug.",
        filters: ["status != paid", "có order_code", "có email hợp lệ", "course_slug cụ thể"],
      },
      subject: "Nhắc thanh toán {{courseTitle}} - đơn {{orderCode}}",
      preheader: "Đơn của anh/chị vẫn đang chờ thanh toán. Mở lại link để hoàn tất và nhận quyền học.",
      body: [
        "Xin chào {{studentName}},",
        "The Anh Marketing thấy đơn đăng ký khóa học {{courseTitle}} của anh/chị vẫn đang ở trạng thái {{paymentStatus}}.",
        "Nếu anh/chị vẫn muốn tham gia khóa học này, anh/chị có thể hoàn tất thanh toán theo thông tin dưới đây:",
        "- Mã đơn: {{orderCode}}",
        "- Khóa học/sản phẩm: {{courseTitle}}",
        "- Số tiền: {{amountLabel}}",
        "- Link thanh toán/QR: {{paymentUrl}}",
        "Thông tin chuyển khoản để copy:",
        "- Ngân hàng: {{bankName}}",
        "- Số tài khoản: {{bankAccountNumber}}",
        "- Chủ tài khoản: {{bankAccountName}}",
        "- Nội dung chuyển khoản: {{transferContent}}",
        "Sau khi thanh toán thành công, hệ thống sẽ gửi email xác nhận và thông tin truy cập khóa học về đúng email {{customerEmail}}.",
        "Nếu anh/chị đã thanh toán rồi nhưng chưa nhận email, hãy phản hồi email này kèm ảnh giao dịch hoặc mã đơn {{orderCode}} để The Anh Marketing kiểm tra thủ công.",
        "Nếu anh/chị chưa chắc khóa học có phù hợp không, cứ phản hồi email này với câu hỏi hiện tại. Đội ngũ sẽ hỗ trợ trước khi anh/chị quyết định thanh toán.",
      ].join("\n\n"),
      ctaText: "Hoàn tất thanh toán",
      ctaUrl: "{{paymentUrl}}",
      footer,
      variables: [
        "studentName",
        "customerEmail",
        "courseTitle",
        "amountLabel",
        "orderCode",
        "paymentStatus",
        "paymentUrl",
        "bankName",
        "bankAccountNumber",
        "bankAccountName",
        "transferContent",
      ],
    },
  ];
}
