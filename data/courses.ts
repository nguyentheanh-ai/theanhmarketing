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

export const courses: Course[] = [
  {
    slug: "facebook-ads-2026",
    title: "Facebook Ads 2026",
    eyebrow: "Khóa học nổi bật",
    description:
      "Học cách tự triển khai Facebook Ads bài bản, hiểu đúng tư duy Marketing & Kinh doanh Online, biết đọc dữ liệu và tối ưu quảng cáo theo tình huống thực tế.",
    shortDescription:
      "Tự chạy quảng cáo, đọc dữ liệu và tối ưu chiến dịch Facebook Ads theo lộ trình thực chiến.",
    price: "799.000đ",
    originalPrice: "3.995.000đ",
    status: "open",
    statusLabel: "Đang mở đăng ký",
    ctaText: "Tạo tài khoản",
    duration: "3 module",
    level: "Người mới đến thực chiến",
    updatedAt: "13/05/2026",
    format: "Video bài học + tài liệu + cộng đồng hỗ trợ",
    bannerImageUrl: "",
    thumbnailImageUrl: "",
    videoPreviewUrl: "https://youtu.be/8xLstSFsHp8",
    videoPreviewEmbedUrl: "https://www.youtube.com/embed/8xLstSFsHp8",
    thumbnailLabel: "Video preview khóa Facebook Ads 2026",
    previewNote:
      "Khu vực này sẵn sàng để thay bằng thumbnail hoặc video học thử khi bạn bổ sung media.",
    topics: ["Facebook Ads", "Marketing Online", "AI Marketing"],
    audience: [
      "Người mới muốn học Facebook Ads từ nền tảng.",
      "Chủ shop/chủ doanh nghiệp nhỏ muốn tự chạy quảng cáo.",
      "Marketer muốn hệ thống lại tư duy đọc số liệu và tối ưu.",
    ],
    outcomes: [
      "Nắm nền tảng quảng cáo Facebook từ thuật toán, hành vi khách hàng đến tư duy ra quyết định bằng dữ liệu.",
      "Biết thiết lập chiến dịch, nhóm quảng cáo, mẫu quảng cáo và ngân sách theo mục tiêu kinh doanh thật.",
      "Có lộ trình tối ưu từ đo lường, đọc chỉ số, xử lý quảng cáo kém hiệu quả đến scale chiến dịch bền vững.",
    ],
    benefits: [
      "Học theo thứ tự từ tư duy, thiết lập, tracking đến tối ưu.",
      "Có tài liệu và checklist để áp dụng lại cho chiến dịch thật.",
      "Có dashboard học viên để xem bài học, tiến độ và tài liệu đi kèm.",
    ],
    includes: [
      "Quyền học trọn đời theo tài khoản học viên.",
      "Tài liệu checklist và khung triển khai đi kèm.",
      "Cộng đồng hỗ trợ trong quá trình thực hành.",
    ],
    requirements: [
      "Có sản phẩm/dịch vụ hoặc ý tưởng kinh doanh muốn chạy quảng cáo.",
      "Có thể dành thời gian thực hành sau mỗi module.",
      "Không cần kinh nghiệm chạy quảng cáo trước đó.",
    ],
    modules: [
      {
        id: "facebook-ads-foundation",
        title: "Tổng quan và nền tảng Facebook Ads",
        description:
          "Nắm tư duy chạy quảng cáo, thuật ngữ quan trọng, cách nhận diện khách hàng kém chất lượng và những lỗi thường gặp trước khi triển khai.",
        order: 1,
        lessons: [
          {
            id: "lesson-1",
            title: "CÁCH LOẠI TRỪ 90% TỆP KHÁCH RÁC ( không mua hàng) TRÊN QUẢNG CÁO FACEBOOK",
            duration: "Video bài học",
            order: 1,
            youtubeUrl: "https://youtu.be/8xLstSFsHp8",
            embedUrl: "https://www.youtube.com/embed/8xLstSFsHp8",
            access: "free",
          },
          {
            id: "lesson-2",
            title: "Quảng cáo FACEBOOK từ A tới Z | Cập nhật mới nhất 2025",
            duration: "Video bài học",
            order: 2,
            youtubeUrl: "https://youtu.be/xEDLxoS4um0",
            embedUrl: "https://www.youtube.com/embed/xEDLxoS4um0",
            access: "paid",
          },
          {
            id: "lesson-3",
            title: "HỌC CHẠY QUẢNG CÁO FACEBOOK - CẬP NHẬT MỚI NHẤT 2026",
            duration: "Video bài học",
            order: 3,
            youtubeUrl: "https://youtu.be/yRTveHLi9dQ",
            embedUrl: "https://www.youtube.com/embed/yRTveHLi9dQ",
            access: "paid",
          },
          {
            id: "lesson-4",
            title: "Bài 2 - Thuật ngữ chuyên ngành trong Quảng Cáo Facebook",
            duration: "Video bài học",
            order: 4,
            youtubeUrl: "https://youtu.be/rlPDU64iPEw",
            embedUrl: "https://www.youtube.com/embed/rlPDU64iPEw",
            access: "paid",
          },
          {
            id: "lesson-5",
            title: "Bài 3 - Những sai lầm phổ biến khi chạy Quảng cáo Facebook",
            duration: "Video bài học",
            order: 5,
            youtubeUrl: "https://youtu.be/aPDm4pBxkTo",
            embedUrl: "https://www.youtube.com/embed/aPDm4pBxkTo",
            access: "paid",
          }
        ],
      },
      {
        id: "facebook-assets-fanpage",
        title: "Tài sản Facebook, Fanpage và nội dung nền",
        description:
          "Chuẩn bị tài khoản, Fanpage, hình ảnh nhận diện và lịch đăng bài để quảng cáo có nền tảng vận hành rõ ràng.",
        order: 2,
        lessons: [
          {
            id: "lesson-6",
            title: "Bài 4 - Hướng dẫn mua VIA",
            duration: "Video bài học",
            order: 1,
            youtubeUrl: "https://youtu.be/RVOZ6mA6uj4",
            embedUrl: "https://www.youtube.com/embed/RVOZ6mA6uj4",
            access: "paid",
          },
          {
            id: "lesson-7",
            title: "Bài 5 - Tất tần tật về Fanpage Facebook P.1",
            duration: "Video bài học",
            order: 2,
            youtubeUrl: "https://youtu.be/J_wK-2oVOlc",
            embedUrl: "https://www.youtube.com/embed/J_wK-2oVOlc",
            access: "paid",
          },
          {
            id: "lesson-8",
            title: "Bài 5 - Tất tần tật về Fanpage Facebook P.2",
            duration: "Video bài học",
            order: 3,
            youtubeUrl: "https://youtu.be/1lqGT1oXUWE",
            embedUrl: "https://www.youtube.com/embed/1lqGT1oXUWE",
            access: "paid",
          },
          {
            id: "lesson-9",
            title: "Bài 6 - Hướng dẫn nhanh thiết kế Poster - Cover - Avatar Facebook",
            duration: "Video bài học",
            order: 4,
            youtubeUrl: "https://youtu.be/77SD1NNfx9Y",
            embedUrl: "https://www.youtube.com/embed/77SD1NNfx9Y",
            access: "paid",
          },
          {
            id: "lesson-10",
            title: "Bài 8 - Đăng bài trên Facebook",
            duration: "Video bài học",
            order: 5,
            youtubeUrl: "https://youtu.be/rZgq1_VLXoU",
            embedUrl: "https://www.youtube.com/embed/rZgq1_VLXoU",
            access: "paid",
          }
        ],
      },
      {
        id: "facebook-campaign-optimization",
        title: "Triển khai, đo lường và tối ưu quảng cáo",
        description:
          "Lập kế hoạch, quản trị BM, thêm thanh toán, target, đọc chỉ số và scale ngân sách quảng cáo Facebook.",
        order: 3,
        lessons: [
          {
            id: "lesson-11",
            title: "Bài 9 - Tại sao content lại quan trọng, các dạng content phổ biến",
            duration: "Video bài học",
            order: 1,
            youtubeUrl: "https://youtu.be/EOoDp0yD3_M",
            embedUrl: "https://www.youtube.com/embed/EOoDp0yD3_M",
            access: "paid",
          },
          {
            id: "lesson-12",
            title: "Bài 10 - Hướng dẫn nghiên cứu đối thủ, lập kế hoạch quảng cáo",
            duration: "Video bài học",
            order: 2,
            youtubeUrl: "https://youtu.be/Wafs1qAU17w",
            embedUrl: "https://www.youtube.com/embed/Wafs1qAU17w",
            access: "paid",
          },
          {
            id: "lesson-13",
            title: "Bài 11 - Tổng quan về quảng cáo Facebook",
            duration: "Video bài học",
            order: 3,
            youtubeUrl: "https://youtu.be/DaDZlw5oHkw",
            embedUrl: "https://www.youtube.com/embed/DaDZlw5oHkw",
            access: "paid",
          },
          {
            id: "lesson-14",
            title: "Bài 12 -  Hướng dẫn quản trị tài khoản doanh nghiệp BM",
            duration: "Video bài học",
            order: 4,
            youtubeUrl: "https://youtu.be/hyBXCRsyyiw",
            embedUrl: "https://www.youtube.com/embed/hyBXCRsyyiw",
            access: "paid",
          },
          {
            id: "lesson-15",
            title: "Bài 13 - Hướng dẫn thêm thẻ thanh toán trên Facebook Ads",
            duration: "Video bài học",
            order: 5,
            youtubeUrl: "https://youtu.be/6zgdfns010s",
            embedUrl: "https://www.youtube.com/embed/6zgdfns010s",
            access: "paid",
          },
          {
            id: "lesson-16",
            title: "Bài 14 - Tất tần tật về Target trên Facebook Ads",
            duration: "Video bài học",
            order: 6,
            youtubeUrl: "https://youtu.be/VDjPx-X-JL0",
            embedUrl: "https://www.youtube.com/embed/VDjPx-X-JL0",
            access: "paid",
          },
          {
            id: "lesson-17",
            title: "Bài 15 - Thiết lập và đọc các chỉ số trên Facebook ADs",
            duration: "Video bài học",
            order: 7,
            youtubeUrl: "https://youtu.be/V5xlkhR2BaM",
            embedUrl: "https://www.youtube.com/embed/V5xlkhR2BaM",
            access: "paid",
          },
          {
            id: "lesson-18",
            title: "Bài 16 - Scale Ngân sách quảng cáo",
            duration: "Video bài học",
            order: 8,
            youtubeUrl: "https://youtu.be/CPQCVqHjjhk",
            embedUrl: "https://www.youtube.com/embed/CPQCVqHjjhk",
            access: "paid",
          }
        ],
      }
    ],
    instructor: {
      name: "The Anh",
      title: "Founder The Anh Marketing",
      bio: "Tập trung đào tạo Marketing & Kinh doanh Online theo hướng dễ hiểu, thực chiến và có khả năng áp dụng vào công việc thật.",
    },
    reviews: [
      {
        name: "Minh Anh",
        role: "Chủ shop mỹ phẩm",
        quote:
          "Mình hiểu rõ hơn vì sao quảng cáo không hiệu quả và biết cách sửa từng phần thay vì chỉ tăng ngân sách.",
      },
      {
        name: "Quốc Huy",
        role: "Freelance marketer",
        quote:
          "Nội dung dễ hiểu, đi thẳng vào việc cần làm. Phù hợp với người mới nhưng vẫn có tính thực chiến.",
      },
    ],
    relatedSlugs: ["marketing-online-nen-tang"],
  },
  {
    slug: "marketing-online-nen-tang",
    title: "Marketing Online Nền Tảng",
    eyebrow: "Sắp ra mắt",
    description:
      "Lộ trình nền tảng giúp người mới hiểu khách hàng, kênh bán hàng, nội dung và cách đo lường hiệu quả marketing.",
    shortDescription:
      "Nền tảng marketing cho người mới: khách hàng, offer, kênh bán hàng, nội dung và đo lường.",
    price: "Đang cập nhật",
    originalPrice: "",
    status: "coming-soon",
    statusLabel: "Sắp ra mắt",
    ctaText: "Nhận thông báo",
    duration: "6 giờ",
    level: "Người mới",
    updatedAt: "2026",
    format: "Video bài học + workbook",
    bannerImageUrl: "",
    thumbnailImageUrl: "",
    videoPreviewUrl: "",
    videoPreviewEmbedUrl: "",
    thumbnailLabel: "Preview khóa Marketing Online Nền Tảng",
    previewNote:
      "Khu vực thumbnail/video preview sẽ được thay bằng media thật khi khóa học ra mắt.",
    topics: ["Marketing Online", "Kinh doanh Online"],
    audience: [
      "Người mới chưa biết bắt đầu học marketing từ đâu.",
      "Chủ shop muốn tự xây hệ thống marketing cơ bản.",
      "Người đang làm nội dung/quảng cáo nhưng thiếu nền tảng.",
    ],
    outcomes: [
      "Hiểu cách xây hệ thống marketing đơn giản cho sản phẩm nhỏ.",
      "Biết chọn kênh phù hợp thay vì làm dàn trải.",
      "Có khung đo lường cơ bản để theo dõi hiệu quả.",
    ],
    benefits: [
      "Có lộ trình nhập môn rõ ràng.",
      "Tập trung vào tư duy ứng dụng thay vì thuật ngữ phức tạp.",
      "Có workbook để tự áp dụng cho sản phẩm của mình.",
    ],
    includes: [
      "Workbook định vị khách hàng và offer.",
      "Checklist chọn kênh marketing phù hợp.",
      "Khung đo lường hiệu quả cơ bản.",
    ],
    requirements: [
      "Phù hợp với người mới.",
      "Không cần nền tảng kỹ thuật.",
      "Nên có sản phẩm/dịch vụ cụ thể để thực hành.",
    ],
    modules: [
      {
        id: "market",
        title: "Hiểu thị trường và khách hàng",
        description:
          "Xác định khách hàng, vấn đề, mong muốn và bối cảnh mua hàng.",
        order: 1,
        lessons: [
          {
            id: "lesson-1",
            title: "Khách hàng mục tiêu là ai?",
            duration: "22 phút",
            order: 1,
            youtubeUrl: "",
            embedUrl: "",
            access: "free",
          },
          {
            id: "lesson-2",
            title: "Nỗi đau, mong muốn và rào cản mua hàng",
            duration: "25 phút",
            order: 2,
            youtubeUrl: "",
            embedUrl: "",
            access: "paid",
          },
        ],
      },
      {
        id: "channels",
        title: "Offer, nội dung và kênh bán hàng",
        description:
          "Tổ chức thông điệp và kênh triển khai để marketing bớt lan man.",
        order: 2,
        lessons: [
          {
            id: "lesson-3",
            title: "Cách viết offer dễ hiểu",
            duration: "24 phút",
            order: 1,
            youtubeUrl: "",
            embedUrl: "",
            access: "paid",
          },
          {
            id: "lesson-4",
            title: "Chọn kênh marketing phù hợp",
            duration: "20 phút",
            order: 2,
            youtubeUrl: "",
            embedUrl: "",
            access: "paid",
          },
        ],
      },
    ],
    instructor: {
      name: "The Anh",
      title: "Founder The Anh Marketing",
      bio: "Xây nội dung đào tạo theo hướng thực dụng: dễ hiểu, có thứ tự và áp dụng được cho kinh doanh nhỏ.",
    },
    reviews: [
      {
        name: "Thu Trang",
        role: "Founder local brand",
        quote:
          "Phần nền tảng giúp mình biết nên ưu tiên gì trước thay vì làm rất nhiều việc cùng lúc.",
      },
    ],
    relatedSlugs: ["facebook-ads-2026"],
  },
];

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
