export type CourseStatus = "open" | "coming-soon" | "closed";
export type LessonAccess = "free" | "paid";

export type CourseLesson = {
  id: string;
  title: string;
  duration: string;
  order: number;
  youtubeUrl: string;
  embedUrl: string;
  access: LessonAccess;
  resources?: {
    title: string;
    url: string;
  }[];
  allowComments?: boolean;
};

export type CourseModule = {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: CourseLesson[];
};

export type CourseReview = {
  name: string;
  role: string;
  quote: string;
};

export type CourseInstructor = {
  name: string;
  title: string;
  bio: string;
};

export type Course = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  shortDescription: string;
  price: string;
  originalPrice: string;
  status: CourseStatus;
  statusLabel: string;
  ctaText: string;
  duration: string;
  level: string;
  updatedAt: string;
  format: string;
  bannerImageUrl: string;
  thumbnailImageUrl: string;
  videoPreviewUrl: string;
  videoPreviewEmbedUrl: string;
  thumbnailLabel: string;
  previewNote: string;
  topics: string[];
  audience: string[];
  outcomes: string[];
  benefits: string[];
  includes: string[];
  requirements: string[];
  modules: CourseModule[];
  instructor: CourseInstructor;
  reviews: CourseReview[];
  relatedSlugs: string[];
};

type FunnelTier = "Cơ bản" | "Nâng cao" | "Chuyên sâu";

type FunnelCourseConfig = {
  tier: FunnelTier;
  role: string;
  slug: string;
  title: string;
  price: string;
  originalPrice: string;
  thumbnailImageUrl: string;
  eyebrow: string;
  shortDescription: string;
  description: string;
  outcomes: string[];
  topics: string[];
};

const commonInstructor: CourseInstructor = {
  name: "The Anh",
  title: "AI Growth Operator, Founder The Anh Marketing",
  bio: "Xây hệ thống tăng trưởng bằng AI, Performance Ads, Funnel, Automation và CRM/Data cho SME và Solopreneur.",
};

const courseFunnel: FunnelCourseConfig[] = [
  {
    tier: "Cơ bản",
    role: "Sản phẩm mồi, kéo khách mới, dễ chốt qua quảng cáo/livestream/inbox",
    slug: "facebook-ads-2026",
    title: "Quảng cáo Facebook Master 2026",
    price: "399K",
    originalPrice: "799K",
    thumbnailImageUrl: "/course-thumbnails/quang-cao-facebook-master-2026.webp",
    eyebrow: "Facebook Ads",
    shortDescription: "Khóa nhập môn giúp bạn hiểu cách chạy Facebook Ads 2026 theo dữ liệu, offer và funnel thay vì chỉ tăng ngân sách.",
    description:
      "Quảng cáo Facebook Master 2026 là sản phẩm đầu phễu cho người mới muốn nắm nền tảng quảng cáo, biết cách chuẩn bị tài sản, đọc chỉ số, lọc khách kém chất lượng và tối ưu chiến dịch theo mục tiêu kinh doanh.",
    topics: ["Facebook Ads", "Performance Marketing", "Funnel"],
    outcomes: [
      "Hiểu cấu trúc chiến dịch, nhóm quảng cáo, mẫu quảng cáo và ngân sách test.",
      "Biết chuẩn bị fanpage, content, offer và tracking trước khi đổ tiền.",
      "Có checklist đọc chỉ số và tối ưu lead theo từng giai đoạn funnel.",
    ],
  },
  {
    tier: "Cơ bản",
    role: "Sản phẩm mồi nhóm AI",
    slug: "tao-ai-agent-ca-nhan-x10-hieu-suat",
    title: "Tạo AI Agent cá nhân X10 hiệu suất",
    price: "99K",
    originalPrice: "499K",
    thumbnailImageUrl: "/course-thumbnails/tao-ai-agent-ca-nhan-x10-hieu-suat.webp",
    eyebrow: "AI Agent",
    shortDescription: "Tạo agent cá nhân để xử lý research, viết nội dung, phân tích dữ liệu và tự động hóa việc lặp lại hằng ngày.",
    description:
      "Khóa học giúp bạn thiết kế AI Agent cá nhân theo vai trò công việc, từ prompt, dữ liệu đầu vào, quy trình xử lý đến cách kiểm tra đầu ra để tăng hiệu suất thật.",
    topics: ["AI Agent", "Prompt Workflow", "Productivity"],
    outcomes: [
      "Thiết kế agent theo mục tiêu công việc cụ thể.",
      "Tạo workflow research, content, phân tích và báo cáo nhanh hơn.",
      "Biết cách kiểm soát chất lượng đầu ra để dùng AI an toàn hơn.",
    ],
  },
  {
    tier: "Cơ bản",
    role: "Bước đệm lên sản phẩm AI cao hơn",
    slug: "ai-marketing-x5-hieu-suat-cong-viec",
    title: "AI Marketing x5 hiệu suất công việc",
    price: "199K",
    originalPrice: "799K",
    thumbnailImageUrl: "/course-thumbnails/ai-marketing-x5-hieu-suat-cong-viec.webp",
    eyebrow: "AI Marketing",
    shortDescription: "Ứng dụng AI vào nghiên cứu khách hàng, content, offer, quảng cáo và tối ưu công việc marketing hằng ngày.",
    description:
      "AI Marketing x5 hiệu suất công việc là bước đệm giúp marketer và chủ doanh nghiệp dùng AI đúng việc: nghiên cứu insight, viết content, dựng funnel, phân tích dữ liệu và ra quyết định nhanh hơn.",
    topics: ["AI Marketing", "Content", "Research"],
    outcomes: [
      "Có bộ workflow AI cho research, content và phân tích chiến dịch.",
      "Biết biến một ý tưởng thành thông điệp, offer và nội dung triển khai.",
      "Giảm thời gian làm việc lặp lại trong marketing mà vẫn giữ chất lượng.",
    ],
  },
  {
    tier: "Nâng cao",
    role: "Sản phẩm chính để tạo doanh thu",
    slug: "ai-agent-master-2026",
    title: "AI Agent Master 2026",
    price: "799K",
    originalPrice: "2.499K",
    thumbnailImageUrl: "/course-thumbnails/ai-agent-master-2026.webp",
    eyebrow: "AI Agent Master",
    shortDescription: "Chương trình chính giúp bạn xây hệ thống AI Agent bài bản cho cá nhân, đội nhóm hoặc hoạt động kinh doanh.",
    description:
      "AI Agent Master 2026 đi sâu vào kiến trúc agent, quy trình giao việc, bộ nhớ, công cụ, tiêu chuẩn kiểm tra và cách triển khai agent vào workflow thật.",
    topics: ["AI Agent", "Automation", "Operations"],
    outcomes: [
      "Xây agent theo vai trò và quy trình rõ ràng.",
      "Biết kết nối agent với tài liệu, SOP và dữ liệu đầu vào.",
      "Tạo hệ thống làm việc có thể lặp lại cho cá nhân hoặc team.",
    ],
  },
  {
    tier: "Nâng cao",
    role: "Sản phẩm chính nhóm ads/performance",
    slug: "performance-marketing-with-ai",
    title: "Performance Marketing With AI",
    price: "799K",
    originalPrice: "2.499K",
    thumbnailImageUrl: "/course-thumbnails/performance-marketing-with-ai.webp",
    eyebrow: "Performance Marketing",
    shortDescription: "Kết hợp AI với quảng cáo, tracking, landing page và dữ liệu để tối ưu hiệu suất marketing.",
    description:
      "Performance Marketing With AI giúp bạn nhìn marketing như một hệ thống đo lường: từ traffic, offer, landing page, lead, chăm sóc đến chuyển đổi và lợi nhuận.",
    topics: ["Performance Marketing", "Tracking", "AI Ads"],
    outcomes: [
      "Thiết kế chiến dịch theo mục tiêu đo lường rõ ràng.",
      "Biết đọc tín hiệu từ ads, landing page, CRM và doanh thu.",
      "Dùng AI để phân tích, tối ưu và tăng tốc vòng lặp thử nghiệm.",
    ],
  },
  {
    tier: "Nâng cao",
    role: "Bộ công cụ/agent kit để upsell",
    slug: "bo-agent-kit-x10-hieu-suat-cong-viec",
    title: "Bộ Agent Kit X10 hiệu suất công việc",
    price: "799K",
    originalPrice: "2.499K",
    thumbnailImageUrl: "/course-thumbnails/bo-agent-kit-x10-hieu-suat-cong-viec.webp",
    eyebrow: "Agent Kit",
    shortDescription: "Bộ agent kit thực dụng để triển khai nhanh các workflow làm việc, marketing, bán hàng và vận hành.",
    description:
      "Bộ Agent Kit X10 hiệu suất công việc tập trung vào template, prompt, SOP và cách dùng agent cho những tác vụ lặp lại trong marketing, sales và quản trị.",
    topics: ["Agent Kit", "SOP", "Automation"],
    outcomes: [
      "Có bộ khung agent dùng lại cho nhiều nhóm việc.",
      "Rút ngắn thời gian dựng workflow AI từ đầu.",
      "Biết tùy biến agent kit theo ngành, sản phẩm và đội nhóm.",
    ],
  },
  {
    tier: "Nâng cao",
    role: "Sản phẩm nâng cấp, giá trị cao hơn",
    slug: "bien-tri-thuc-thanh-tien",
    title: "Biến tri thức thành tiền",
    price: "1.299K",
    originalPrice: "3.999K",
    thumbnailImageUrl: "/course-thumbnails/bien-tri-thuc-thanh-tien.webp",
    eyebrow: "Knowledge Business",
    shortDescription: "Biến kinh nghiệm, chuyên môn và tri thức cá nhân thành sản phẩm số, offer và phễu bán hàng.",
    description:
      "Khóa học giúp bạn đóng gói tri thức thành tài sản có thể bán: định vị, chọn ngách, xây offer, dựng nội dung, tạo sản phẩm số và thiết kế phễu chuyển đổi.",
    topics: ["Knowledge Business", "Offer", "Funnel"],
    outcomes: [
      "Xác định tài sản tri thức có thể thương mại hóa.",
      "Đóng gói thành sản phẩm, khóa học, workshop hoặc tư vấn.",
      "Xây phễu nội dung và bán hàng cho sản phẩm tri thức.",
    ],
  },
  {
    tier: "Nâng cao",
    role: "Sản phẩm nâng cấp nhóm AI tổng quát",
    slug: "ai-master-x10-hieu-suat",
    title: "AI Master x10 hiệu suất",
    price: "1.299K",
    originalPrice: "3.999K",
    thumbnailImageUrl: "/course-thumbnails/ai-master-x10-hieu-suat.webp",
    eyebrow: "AI Mastery",
    shortDescription: "Làm chủ AI để tăng hiệu suất tổng thể: tư duy, workflow, công cụ, agent và ứng dụng vào công việc thật.",
    description:
      "AI Master x10 hiệu suất là chương trình nâng cấp giúp bạn dùng AI như một hệ điều hành công việc: lập kế hoạch, nghiên cứu, sản xuất, phân tích, tự động hóa và quản trị tri thức.",
    topics: ["AI Productivity", "Workflow", "Agent"],
    outcomes: [
      "Thiết kế hệ điều hành AI cá nhân cho công việc.",
      "Biết chọn công cụ và workflow theo mục tiêu thay vì chạy theo trend.",
      "Tăng tốc nghiên cứu, sản xuất nội dung, phân tích và ra quyết định.",
    ],
  },
  {
    tier: "Chuyên sâu",
    role: "Flagship, bán cho người muốn kiếm tiền thật từ marketing",
    slug: "marketing-gioi-phai-kiem-duoc-tien",
    title: "Marketing giỏi phải kiếm được tiền",
    price: "2.199K",
    originalPrice: "5.999K",
    thumbnailImageUrl: "/course-thumbnails/marketing-gioi-phai-kiem-duoc-tien.webp",
    eyebrow: "Flagship Program",
    shortDescription: "Chương trình flagship giúp bạn nhìn marketing bằng doanh thu, lợi nhuận, offer, hệ thống bán hàng và dữ liệu.",
    description:
      "Marketing giỏi phải kiếm được tiền dành cho người muốn đi xa hơn việc biết chạy ads hay làm content. Trọng tâm là tư duy tạo doanh thu: thị trường, offer, định vị, phễu, chuyển đổi, dữ liệu và vận hành tăng trưởng.",
    topics: ["Revenue Marketing", "Offer", "Growth System"],
    outcomes: [
      "Biết đo marketing bằng doanh thu, lợi nhuận và dòng tiền.",
      "Xây offer, funnel và hệ thống chuyển đổi có khả năng bán hàng thật.",
      "Có khung ra quyết định để tối ưu marketing theo mục tiêu kinh doanh.",
    ],
  },
];

function makeLessons(slug: string, title: string): CourseLesson[] {
  if (slug === "facebook-ads-2026") {
    return [
      {
        id: "lesson-1",
        title: "Nền tảng Facebook Ads 2026 và tư duy phễu",
        duration: "Video bài học",
        order: 1,
        youtubeUrl: "https://youtu.be/yRTveHLi9dQ",
        embedUrl: "https://www.youtube.com/embed/yRTveHLi9dQ",
        access: "free",
        allowComments: true,
      },
      {
        id: "lesson-2",
        title: "Thiết lập chiến dịch, đọc chỉ số và tối ưu lead",
        duration: "Video bài học",
        order: 2,
        youtubeUrl: "",
        embedUrl: "",
        access: "paid",
        allowComments: true,
      },
    ];
  }

  return [
    {
      id: "lesson-1",
      title: `Bản đồ triển khai ${title}`,
      duration: "Video bài học",
      order: 1,
      youtubeUrl: "",
      embedUrl: "",
      access: "free",
      allowComments: true,
    },
    {
      id: "lesson-2",
      title: "Workflow áp dụng vào công việc thật",
      duration: "Video bài học",
      order: 2,
      youtubeUrl: "",
      embedUrl: "",
      access: "paid",
      allowComments: true,
    },
  ];
}

function createCourse(config: FunnelCourseConfig, index: number): Course {
  const relatedSlugs = courseFunnel
    .filter((item) => item.slug !== config.slug)
    .slice(Math.max(0, index - 1), Math.max(0, index - 1) + 3)
    .map((item) => item.slug);

  return {
    slug: config.slug,
    title: config.title,
    eyebrow: config.eyebrow,
    description: config.description,
    shortDescription: config.shortDescription,
    price: config.price,
    originalPrice: config.originalPrice,
    status: "open",
    statusLabel: "Đang mở đăng ký",
    ctaText: "Vào khóa học",
    duration: "2 module",
    level: config.tier,
    updatedAt: "22/05/2026",
    format: "Video bài học + checklist + AI workflow + dashboard học viên",
    bannerImageUrl: config.thumbnailImageUrl,
    thumbnailImageUrl: config.thumbnailImageUrl,
    videoPreviewUrl: "",
    videoPreviewEmbedUrl: "",
    thumbnailLabel: `Thumbnail khóa ${config.title}`,
    previewNote: "Thumbnail đã tối ưu WebP để tải nhanh hơn trên web.",
    topics: config.topics,
    audience: [
      "Người muốn có lộ trình học rõ ràng theo phễu sản phẩm của The Anh Marketing.",
      "SME, solopreneur, marketer hoặc creator muốn ứng dụng AI/marketing vào doanh thu thật.",
      "Học viên cần bài học gọn, dễ áp dụng và có workflow đi kèm.",
    ],
    outcomes: config.outcomes,
    benefits: [
      "Bài học được đóng gói theo mục tiêu rõ ràng, không lan man.",
      "Có checklist/workflow để áp dụng ngay sau khi học.",
      "Có dashboard học viên để xem khóa đã mua, bài học và tài liệu liên quan.",
    ],
    includes: [
      "Quyền học theo tài khoản học viên.",
      "Tài liệu và workflow cập nhật theo khóa.",
      "Hỗ trợ câu hỏi trong khu vực học tập.",
    ],
    requirements: [
      "Có mục tiêu học hoặc dự án thực tế để áp dụng.",
      "Không cần nền tảng kỹ thuật sâu.",
      "Nên hoàn thành bài học theo đúng thứ tự trong phễu.",
    ],
    modules: [
      {
        id: `${config.slug}-foundation`,
        title: "Nền tảng và bản đồ triển khai",
        description: `Hiểu vai trò của khóa trong phễu: ${config.role}.`,
        order: 1,
        lessons: makeLessons(config.slug, config.title),
      },
      {
        id: `${config.slug}-workflow`,
        title: "Workflow áp dụng",
        description: "Biến kiến thức thành quy trình có thể lặp lại trong công việc thật.",
        order: 2,
        lessons: [
          {
            id: "lesson-3",
            title: "Checklist triển khai và tối ưu",
            duration: "Tài liệu thực hành",
            order: 1,
            youtubeUrl: "",
            embedUrl: "",
            access: "paid",
            resources: [{ title: "AI Growth Toolkit", url: "/blog#tai-lieu" }],
            allowComments: true,
          },
        ],
      },
    ],
    instructor: commonInstructor,
    reviews: [
      {
        name: "Học viên The Anh Marketing",
        role: config.eyebrow,
        quote: "Khóa học đi thẳng vào việc cần làm, có workflow rõ nên dễ áp dụng hơn là chỉ xem lý thuyết.",
      },
    ],
    relatedSlugs,
  };
}

export const courses: Course[] = courseFunnel.map(createCourse);

export const featuredCourse = courses[0];

export function getCourseLessonCount(course: Course) {
  return course.modules.reduce((total, module) => total + module.lessons.length, 0);
}

export function getCourseModuleCount(course: Course) {
  return course.modules.length;
}

export function getRelatedCourses(course: Course) {
  return courses.filter((item) => course.relatedSlugs.includes(item.slug));
}
