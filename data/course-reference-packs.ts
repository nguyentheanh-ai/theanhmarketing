export type CourseReferencePack = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  downloadUrl: string;
  actionLabel: string;
  external: boolean;
  formats: string[];
};

const packsByCourseSlug: Record<string, CourseReferencePack[]> = {
  "facebook-ads-2026": [
    {
      id: "competitor-research-prompt",
      eyebrow: "01 · Master Prompt",
      title: "Nghiên cứu đối thủ Facebook",
      description:
        "Khung nghiên cứu evidence-first từ ngành hàng hoặc fanpage, tách rõ quan sát, suy luận và giả định.",
      downloadUrl: "/course-resources/facebook-ads-2026/master-prompts/01_MASTER_PROMPT_NGHIEN_CUU_DOI_THU_FACEBOOK.txt",
      actionLabel: "Tải prompt TXT ↓",
      external: false,
      formats: ["TXT", "Meta Ad Library", "Evidence-first"],
    },
    {
      id: "batch-image-prompt",
      eyebrow: "02 · Master Prompt",
      title: "Tạo hình ảnh hàng loạt bằng ChatGPT",
      description:
        "Brief và quy trình tạo poster, ảnh quảng cáo, carousel hoặc thumbnail theo lô, có biến thể để test.",
      downloadUrl: "/course-resources/facebook-ads-2026/master-prompts/02_MASTER_PROMPT_TAO_HINH_ANH_HANG_LOAT_CHATGPT.txt",
      actionLabel: "Tải prompt TXT ↓",
      external: false,
      formats: ["TXT", "Ảnh theo lô", "Creative testing"],
    },
    {
      id: "visual-analysis-prompt",
      eyebrow: "03 · Master Prompt",
      title: "Phân tích và tái tạo visual",
      description:
        "Mổ xẻ bố cục, màu sắc, chữ và cơ chế thuyết phục để phát triển hướng mới mà không sao chép nguyên bản.",
      downloadUrl: "/course-resources/facebook-ads-2026/master-prompts/03_MASTER_PROMPT_PHAN_TICH_VA_TAI_TAO_VISUAL.txt",
      actionLabel: "Tải prompt TXT ↓",
      external: false,
      formats: ["TXT", "Visual analysis", "Reconstruction brief"],
    },
    {
      id: "ads-metrics-prompt",
      eyebrow: "04 · Master Prompt",
      title: "Xuất và phân tích chỉ số quảng cáo",
      description:
        "Chuẩn hóa file Meta Ads, kiểm tra phạm vi dữ liệu, tính KPI và xuất bảng phân tích có nguồn.",
      downloadUrl: "/course-resources/facebook-ads-2026/master-prompts/04_MASTER_PROMPT_XUAT_TOAN_BO_CHI_SO_QUANG_CAO.txt",
      actionLabel: "Tải prompt TXT ↓",
      external: false,
      formats: ["TXT", "Meta Ads", "KPI & QA"],
    },
    {
      id: "content-plan-prompt",
      eyebrow: "05 · Master Prompt",
      title: "Lập kế hoạch content",
      description:
        "Xây content pillars, góc khai thác, lịch 7/14/30 ngày, workflow sản xuất và QA giọng viết.",
      downloadUrl: "/course-resources/facebook-ads-2026/master-prompts/05_MASTER_PROMPT_LAP_KE_HOACH_CONTENT.txt",
      actionLabel: "Tải prompt TXT ↓",
      external: false,
      formats: ["TXT", "Content plan", "7/14/30 ngày"],
    },
    {
      id: "ads-plan-prompt",
      eyebrow: "06 · Master Prompt",
      title: "Lập kế hoạch quảng cáo",
      description:
        "Lập campaign, ad set, creative, ngân sách, KPI, test plan, decision rules và tracking trước khi triển khai.",
      downloadUrl: "/course-resources/facebook-ads-2026/master-prompts/06_MASTER_PROMPT_LAP_KE_HOACH_QUANG_CAO.txt",
      actionLabel: "Tải prompt TXT ↓",
      external: false,
      formats: ["TXT", "Ads plan", "Testing & tracking"],
    },
    {
      id: "video-script-sheet",
      eyebrow: "07 · Kịch bản mẫu",
      title: "Demo kịch bản quảng cáo trên Google Sheet",
      description:
        "Kịch bản video quảng cáo 11 scene, có voice off, hướng dẫn hình ảnh và nguồn asset để tham khảo cách triển khai.",
      downloadUrl:
        "https://docs.google.com/spreadsheets/d/1LJHiGtwN3f_fj4AVhrKKTuT3dNHPVNGMYEh-3DpOBTc/edit?gid=1007#gid=1007",
      actionLabel: "Mở Google Sheet ↗",
      external: true,
      formats: ["Google Sheet", "11 scene", "Voice off + visual"],
    },
  ],
};

export function getCourseReferencePacks(courseSlug: string) {
  return packsByCourseSlug[courseSlug] ?? [];
}
