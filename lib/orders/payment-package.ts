import type {Course} from '@/data/courses';
import {formatVnd,parseVndAmount} from '@/lib/payments/sepay';
import {CONSULTATION_PAYMENT_PLAN,CONSULTATION_PRICE_VND,CONSULTATION_PRODUCT_SLUG,CONSULTATION_PRODUCT_TITLE} from '@/lib/consultation/constants';
import {AGENT_KIT_OFFICIAL_PAYMENT_PLAN,AGENT_KIT_OFFICIAL_PRICE_VND,AGENT_KIT_PREORDER_DEPOSIT_VND,AGENT_KIT_PREORDER_PAYMENT_PLAN,AGENT_KIT_PREORDER_PRICE_VND,AGENT_KIT_PREORDER_REMAINING_VND,AGENT_KIT_SLUG} from '@/lib/agent-kit-preorder';
type OrderItem={slug:string;title:string;price:number};
export type PaymentPackageCourse=Pick<Course,'slug'|'title'|'price'>;
export type PaymentPackageInput={courseSlug?:string;paymentPlan?:string};
// Shared server pricing. No database client, provider request or caller-supplied amount.
type CoursePaymentPlan = {
  title: string;
  amount: number;
  orderItems?: OrderItem[];
};

const VIETNAM_THANG_THAI_LAN_PROMOTION_PLAN = "zoom-kit-ebook-vietnam-thang-thai-lan-20";
const VIETNAM_THANG_THAI_LAN_PROMOTION_START = "2026-08-26";
const VIETNAM_THANG_THAI_LAN_PROMOTION_END = "2026-08-31";

function getVietnamDateKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function isVietnamThangThaiLanPromotionActive(now = new Date()) {
  const today = getVietnamDateKey(now);
  return today >= VIETNAM_THANG_THAI_LAN_PROMOTION_START && today <= VIETNAM_THANG_THAI_LAN_PROMOTION_END;
}

function getFixedPaymentPackage(input: PaymentPackageInput) {
  if (input.courseSlug !== CONSULTATION_PRODUCT_SLUG || input.paymentPlan !== CONSULTATION_PAYMENT_PLAN) {
    return null;
  }

  return {
    amount: CONSULTATION_PRICE_VND,
    courseSlug: CONSULTATION_PRODUCT_SLUG,
    courseTitle: CONSULTATION_PRODUCT_TITLE,
    orderItems: [{ slug: CONSULTATION_PRODUCT_SLUG, title: CONSULTATION_PRODUCT_TITLE, price: CONSULTATION_PRICE_VND }],
  };
}

const coursePaymentPlans: Record<string, Record<string, CoursePaymentPlan>> = {
  "facebook-ads-2026": {
    "industry-expert-1290": {
      title: "Khóa học quảng cáo chuyển đổi dành cho chuyên gia",
      amount: 1290000,
      orderItems: [{
        slug: "facebook-ads-2026",
        title: "Khóa học quảng cáo chuyển đổi dành cho chuyên gia",
        price: 1290000,
      }],
    },
    video: {
      title: "Gói Cơ Bản 399K",
      amount: 399000,
    },
    "zoom-kit": {
      title: "Gói AI Agent 799K - Tặng AI Agent lên kế hoạch quảng cáo",
      amount: 799000,
    },
    "zoom-kit-ebook-299": {
      title: "Gói AI Agent 799K + Ebook Facebook Ads 299K",
      amount: 1098000,
      orderItems: [
        {
          slug: "facebook-ads-2026",
          title: "Quảng cáo Facebook Master 2026 - Gói AI Agent 799K - Tặng AI Agent lên kế hoạch quảng cáo",
          price: 799000,
        },
        {
          slug: "ebook-facebook-ads-2026",
          title: "Ebook Facebook Ads 2026 - Mua kèm ưu đãi 299K",
          price: 299000,
        },
      ],
    },
    [VIETNAM_THANG_THAI_LAN_PROMOTION_PLAN]: {
      title: "Combo hệ thống Facebook Ads + Ebook - Ưu đãi Việt Nam Thắng Thái Lan giảm 20%",
      amount: 878400,
      orderItems: [
        {
          slug: "facebook-ads-2026",
          title: "Quảng cáo Facebook Master 2026 - Combo ưu đãi Việt Nam Thắng Thái Lan",
          price: 639200,
        },
        {
          slug: "ebook-facebook-ads-2026",
          title: "Ebook Facebook Ads 2026 - Combo ưu đãi Việt Nam Thắng Thái Lan",
          price: 239200,
        },
      ],
    },
    "zoom-kit-ebook-20": {
      title: "Combo hệ thống Facebook Ads + Ebook - Ưu đãi combo giảm 20%",
      amount: 878400,
      orderItems: [
        {
          slug: "facebook-ads-2026",
          title: "Quảng cáo Facebook Master 2026 - Combo giảm 20%",
          price: 639200,
        },
        {
          slug: "ebook-facebook-ads-2026",
          title: "Ebook Facebook Ads 2026 - Combo giảm 20%",
          price: 239200,
        },
      ],
    },
    "advanced-zoom": {
      title: "Gói AI Agent 799K + 1 buổi Zoom chuyên sâu",
      amount: 1299000,
    },
  },
  "ebook-facebook-ads-2026": {
    "full-access-399": {
      title: "Mở khóa thư viện Facebook Ads 2026",
      amount: 399000,
    },
    "full-access-399-course-699": {
      title: "Ebook 399K + khóa Facebook Ads Master 2026 ưu đãi 699K",
      amount: 1098000,
      orderItems: [
        {
          slug: "ebook-facebook-ads-2026",
          title: "Ebook Facebook Ads 2026",
          price: 399000,
        },
        {
          slug: "facebook-ads-2026",
          title: "Khóa Facebook Ads Master 2026 - Mua kèm ưu đãi 699K",
          price: 699000,
        },
      ],
    },
  },
  [AGENT_KIT_SLUG]: {
    "agent-kit-offer-990": {
      title: "Đội ngũ nhân sự AI - Ưu đãi trọn bộ",
      amount: 990000,
    },
    [AGENT_KIT_PREORDER_PAYMENT_PLAN]: {
      title: `Cọc preorder trước ngày mở bán - tổng ${formatVnd(AGENT_KIT_PREORDER_PRICE_VND)}, còn lại ${formatVnd(AGENT_KIT_PREORDER_REMAINING_VND)} khi mở bán`,
      amount: AGENT_KIT_PREORDER_DEPOSIT_VND,
    },
    [AGENT_KIT_OFFICIAL_PAYMENT_PLAN]: {
      title: "Đội ngũ nhân sự AI - Giá chính thức",
      amount: AGENT_KIT_OFFICIAL_PRICE_VND,
    },
  },
};

function buildOrderPackage(
  selectedCourses: readonly PaymentPackageCourse[],
  paymentPlan?: string,
) {
  if (paymentPlan) {
    const selectedCourse = selectedCourses[0];
    const plan = selectedCourse ? coursePaymentPlans[selectedCourse.slug]?.[paymentPlan] : undefined;

    if (paymentPlan === VIETNAM_THANG_THAI_LAN_PROMOTION_PLAN && !isVietnamThangThaiLanPromotionActive()) {
      throw new Error("Ưu đãi Việt Nam Thắng Thái Lan đã kết thúc.");
    }

    if (selectedCourses.length !== 1 || !selectedCourse || !plan) {
      throw new Error("Gói thanh toán không hợp lệ.");
    }

    const title = `${selectedCourse.title} - ${plan.title}`;

    if (plan.orderItems?.length) {
      return {
        amount: plan.amount,
        courseSlug: plan.orderItems.map((item) => item.slug).join(","),
        courseTitle: plan.orderItems.map((item) => item.title).join(" | "),
        orderItems: plan.orderItems.map((item) => ({ ...item })),
      };
    }

    return {
      amount: plan.amount,
      courseSlug: selectedCourse.slug,
      courseTitle: title,
      orderItems: [
        {
          slug: selectedCourse.slug,
          title,
          price: plan.amount,
        },
      ],
    };
  }

  const amount = selectedCourses.reduce((sum, course) => sum + parseVndAmount(course.price), 0);

  return {
    amount,
    courseSlug: selectedCourses.map((course) => course.slug).join(","),
    courseTitle: selectedCourses.map((course) => course.title).join(" | "),
    orderItems: selectedCourses.map((course) => ({
      slug: course.slug,
      title: course.title,
      price: parseVndAmount(course.price),
    })),
  };
}

export {getFixedPaymentPackage,buildOrderPackage};
