import type { Course } from "@/data/courses";

const courseNames = [
  "AI Fullstack Marketing System",
  "Performance Marketing & Growth Ads",
  "Content Traffic Engine",
  "Marketing Data Analytics",
  "Brandformance Foundation",
  "Founder Marketing Blueprint",
  "AI Content & Automation Workflow",
  "Full Funnel Campaign Strategy",
  "Marketing Operation Management",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function createMarketingCourse(title: string, index: number): Course {
  const slug = slugify(title);
  const focus = title.replace("AI ", "").replace("Marketing ", "");

  return {
    slug,
    title,
    eyebrow: "Marketing & AI ứng dụng",
    description:
      `Khóa học giúp bạn xây hệ thống ${focus} theo hướng thực chiến: hiểu chiến lược, biết cách triển khai, dùng AI đúng chỗ và đo lường hiệu quả trong công việc marketing thật.`,
    shortDescription:
      `Học ${focus} có hệ thống, có workflow, có tài liệu áp dụng và phù hợp cho đội ngũ marketing hiện đại.`,
    price: index < 3 ? "1.490.000đ" : "990.000đ",
    originalPrice: index < 3 ? "3.990.000đ" : "2.490.000đ",
    status: "open",
    statusLabel: "Đang mở đăng ký",
    ctaText: "Tạo tài khoản",
    duration: index < 3 ? "6 giờ" : "4 giờ",
    level: "Cơ bản đến thực chiến",
    updatedAt: "13/05/2026",
    format: "Video bài học + tài liệu + workflow + cộng đồng hỏi đáp",
    bannerImageUrl: "",
    thumbnailImageUrl: "",
    videoPreviewUrl: "",
    videoPreviewEmbedUrl: "",
    thumbnailLabel: `Preview khóa ${title}`,
    previewNote:
      "Bạn có thể bổ sung thumbnail, banner hoặc video preview từ CMS khóa học.",
    topics: ["Marketing System", "AI ứng dụng", "Growth", "Data"],
    audience: [
      "Chủ doanh nghiệp nhỏ muốn tự hiểu hệ thống marketing.",
      "Marketer cần lộ trình thực chiến để triển khai công việc tốt hơn.",
      "Founder hoặc team nhỏ muốn ứng dụng AI vào vận hành marketing.",
    ],
    outcomes: [
      "Biết cách nhìn marketing như một hệ thống gồm chiến lược, nội dung, traffic, dữ liệu và vận hành.",
      "Có workflow triển khai thực tế để áp dụng vào công việc hoặc doanh nghiệp đang làm.",
      "Biết dùng AI để tăng tốc nghiên cứu, sản xuất nội dung, phân tích và tối ưu.",
    ],
    benefits: [
      "Học theo module ngắn, dễ xem lại và dễ áp dụng.",
      "Có tài liệu, checklist và workflow đi kèm từng bài học.",
      "Có khu vực hỏi đáp để học viên đặt câu hỏi theo bài.",
    ],
    includes: [
      "Quyền học trọn đời theo tài khoản học viên.",
      "Tài liệu cập nhật khi khóa học được bổ sung nội dung mới.",
      "Dashboard học viên để xem bài học, tài liệu và tiến độ.",
    ],
    requirements: [
      "Không cần kinh nghiệm chuyên sâu trước đó.",
      "Nên có sản phẩm, dự án hoặc công việc thực tế để áp dụng.",
      "Sẵn sàng làm bài tập và thử nghiệm workflow sau mỗi module.",
    ],
    modules: [
      {
        id: `${slug}-foundation`,
        title: "Nền tảng hệ thống",
        description:
          "Hiểu vai trò của khóa học trong bức tranh Marketing & AI ứng dụng.",
        order: 1,
        lessons: [
          {
            id: `${slug}-lesson-1`,
            title: `Tư duy cốt lõi của ${title}`,
            duration: "18 phút",
            order: 1,
            youtubeUrl: "",
            embedUrl: "",
            access: "free",
            resources: [
              {
                title: "Workbook định hướng",
                url: "/tai-lieu",
              },
            ],
            allowComments: true,
          },
          {
            id: `${slug}-lesson-2`,
            title: "Khung triển khai trong công việc thật",
            duration: "24 phút",
            order: 2,
            youtubeUrl: "",
            embedUrl: "",
            access: "paid",
            resources: [
              {
                title: "Checklist triển khai",
                url: "/tai-lieu",
              },
            ],
            allowComments: true,
          },
        ],
      },
      {
        id: `${slug}-workflow`,
        title: "Workflow thực hành",
        description:
          "Biến kiến thức thành quy trình có thể lặp lại cho cá nhân hoặc team.",
        order: 2,
        lessons: [
          {
            id: `${slug}-lesson-3`,
            title: "Ứng dụng AI vào nghiên cứu và sản xuất",
            duration: "26 phút",
            order: 1,
            youtubeUrl: "",
            embedUrl: "",
            access: "paid",
            resources: [
              {
                title: "Prompt workflow",
                url: "/tai-lieu",
              },
            ],
            allowComments: true,
          },
          {
            id: `${slug}-lesson-4`,
            title: "Đo lường, tối ưu và cập nhật hệ thống",
            duration: "22 phút",
            order: 2,
            youtubeUrl: "",
            embedUrl: "",
            access: "paid",
            resources: [],
            allowComments: true,
          },
        ],
      },
    ],
    instructor: {
      name: "The Anh",
      title: "Founder The Anh Marketing",
      bio: "Đào tạo Marketing & Kinh doanh Online theo hướng thực chiến, dễ hiểu và có thể áp dụng.",
    },
    reviews: [
      {
        name: "Học viên The Anh Marketing",
        role: "Marketing team",
        quote:
          "Cách học theo hệ thống giúp mình biết nên bắt đầu từ đâu và áp dụng AI vào việc thật rõ hơn.",
      },
    ],
    relatedSlugs: courseNames
      .map(slugify)
      .filter((item) => item !== slug)
      .slice(0, 3),
  };
}

export const marketingCourses = courseNames.map(createMarketingCourse);
