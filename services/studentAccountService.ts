import { buildAutoStudentAccountCredentials } from "@/lib/auth/student-account";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PaymentOrder } from "@/services/orderService";

type EnsureStudentAccountOptions = {
  temporaryPassword?: string;
  forcePasswordUpdate?: boolean;
};

export type StudentAccountProvisionResult = {
  ok: boolean;
  skipped: boolean;
  created: boolean;
  email: string;
  temporaryPassword: string | null;
  reason: string | null;
  userId: string | null;
};

function isExistingUserError(message: string) {
  return /already|registered|exists|exist/i.test(message);
}

async function findAuthUserByEmail(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  email: string,
) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      throw error;
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === email);

    if (user) {
      return user;
    }

    if (data.users.length < 1000) {
      return null;
    }
  }

  return null;
}

async function updateExistingStudentPassword(
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  input: {
    userId: string;
    existingUserMetadata?: Record<string, unknown> | null;
    password: string;
    temporaryPasswordWasProvided: boolean;
    studentName: string;
    phone: string;
    orderCode: string;
    courseSlug: string;
    courseTitle: string;
  },
) {
  return supabase.auth.admin.updateUserById(input.userId, {
    password: input.password,
    email_confirm: true,
    user_metadata: {
      ...(input.existingUserMetadata ?? {}),
      full_name: input.studentName,
      phone: input.phone,
      must_change_password: true,
      password_set_by_admin: true,
      source_order_code: input.orderCode,
      enrolled_course_slug: input.courseSlug,
      enrolled_course_title: input.courseTitle,
      temporary_password_strategy: input.temporaryPasswordWasProvided ? "manual-admin" : "given_name_phone",
      temporary_password_created_at: new Date().toISOString(),
    },
  });
}

export async function ensureStudentAccountForPaidOrder(
  order: PaymentOrder,
  options: EnsureStudentAccountOptions = {},
): Promise<StudentAccountProvisionResult> {
  const generatedCredentials = buildAutoStudentAccountCredentials({
    studentName: order.studentName,
    email: order.email,
    phone: order.phone,
  });
  const credentials = {
    ...generatedCredentials,
    password: options.temporaryPassword?.trim() || generatedCredentials.password,
  };

  const baseResult = {
    email: credentials.email,
    temporaryPassword: null,
    userId: null,
  };

  if (order.status !== "paid") {
    return { ...baseResult, ok: true, skipped: true, created: false, reason: "Order is not paid." };
  }

  if (!credentials.email || !credentials.password) {
    return {
      ...baseResult,
      ok: false,
      skipped: false,
      created: false,
      reason: "Missing email or phone for auto account creation.",
    };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ...baseResult,
      ok: false,
      skipped: false,
      created: false,
      reason: "Missing SUPABASE_SERVICE_ROLE_KEY for auth admin.",
    };
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      ...baseResult,
      ok: false,
      skipped: false,
      created: false,
      reason: "Missing Supabase admin client.",
    };
  }

  if (options.forcePasswordUpdate) {
    const existingUser = await findAuthUserByEmail(supabase, credentials.email);

    if (existingUser) {
      const { error } = await updateExistingStudentPassword(supabase, {
        userId: existingUser.id,
        existingUserMetadata: existingUser.user_metadata,
        password: credentials.password,
        temporaryPasswordWasProvided: Boolean(options.temporaryPassword),
        studentName: order.studentName,
        phone: order.phone,
        orderCode: order.orderCode,
        courseSlug: order.courseSlug,
        courseTitle: order.courseTitle,
      });

      if (error) {
        return {
          ...baseResult,
          ok: false,
          skipped: false,
          created: false,
          reason: error.message,
        };
      }

      return {
        ok: true,
        skipped: false,
        created: false,
        email: credentials.email,
        temporaryPassword: credentials.password,
        reason: "Student account password updated.",
        userId: existingUser.id,
      };
    }
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: credentials.email,
    password: credentials.password,
    email_confirm: true,
    user_metadata: {
      full_name: order.studentName,
      phone: order.phone,
      must_change_password: true,
      auto_created_from_paid_order: true,
      password_set_by_admin: options.forcePasswordUpdate,
      source_order_code: order.orderCode,
      enrolled_course_slug: order.courseSlug,
      enrolled_course_title: order.courseTitle,
      temporary_password_strategy: options.temporaryPassword ? "manual-admin" : "given_name_phone",
      temporary_password_created_at: new Date().toISOString(),
    },
  });

  if (error) {
    if (isExistingUserError(error.message)) {
      const existingUser = await findAuthUserByEmail(supabase, credentials.email);

      if (existingUser) {
        const { error: updateError } = await updateExistingStudentPassword(supabase, {
          userId: existingUser.id,
          existingUserMetadata: existingUser.user_metadata,
          password: credentials.password,
          temporaryPasswordWasProvided: Boolean(options.temporaryPassword),
          studentName: order.studentName,
          phone: order.phone,
          orderCode: order.orderCode,
          courseSlug: order.courseSlug,
          courseTitle: order.courseTitle,
        });

        if (updateError) {
          return {
            ...baseResult,
            ok: false,
            skipped: false,
            created: false,
            reason: updateError.message,
          };
        }

        return {
          ok: true,
          skipped: false,
          created: false,
          email: credentials.email,
          temporaryPassword: credentials.password,
          reason: "Student account password updated.",
          userId: existingUser.id,
        };
      }

      return {
        ...baseResult,
        ok: true,
        skipped: true,
        created: false,
        reason: "Student account already exists.",
      };
    }

    return {
      ...baseResult,
      ok: false,
      skipped: false,
      created: false,
      reason: error.message,
    };
  }

  return {
    ok: true,
    skipped: false,
    created: true,
    email: credentials.email,
    temporaryPassword: credentials.password,
    reason: null,
    userId: data.user?.id ?? null,
  };
}

export async function ensureStudentAccountForAccessGrant(
  input: {
    studentName: string;
    email: string;
    phone: string;
    courseSlug: string;
    courseTitle: string;
    sourceOrderCode?: string;
  },
  options: EnsureStudentAccountOptions = {},
): Promise<StudentAccountProvisionResult> {
  const generatedCredentials = buildAutoStudentAccountCredentials({
    studentName: input.studentName,
    email: input.email,
    phone: input.phone,
  });
  const credentials = {
    ...generatedCredentials,
    password: options.temporaryPassword?.trim() || generatedCredentials.password,
  };

  const baseResult = {
    email: credentials.email,
    temporaryPassword: null,
    userId: null,
  };

  if (!credentials.email || !credentials.password) {
    return {
      ...baseResult,
      ok: false,
      skipped: false,
      created: false,
      reason: "Missing email or phone for account creation.",
    };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      ...baseResult,
      ok: false,
      skipped: false,
      created: false,
      reason: "Missing SUPABASE_SERVICE_ROLE_KEY for auth admin.",
    };
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      ...baseResult,
      ok: false,
      skipped: false,
      created: false,
      reason: "Missing Supabase admin client.",
    };
  }

  const existingUser = await findAuthUserByEmail(supabase, credentials.email);

  if (existingUser) {
    if (!options.forcePasswordUpdate) {
      return {
        ...baseResult,
        ok: true,
        skipped: true,
        created: false,
        reason: "Student account already exists.",
      };
    }

    const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: credentials.password,
      email_confirm: true,
      user_metadata: {
        ...(existingUser.user_metadata ?? {}),
        full_name: input.studentName,
        phone: input.phone,
        must_change_password: true,
        password_set_by_admin: true,
        source_order_code: input.sourceOrderCode ?? existingUser.user_metadata?.source_order_code,
        enrolled_course_slug: input.courseSlug,
        enrolled_course_title: input.courseTitle,
        temporary_password_strategy: options.temporaryPassword ? "manual-admin" : "given_name_phone",
        temporary_password_created_at: new Date().toISOString(),
      },
    });

    if (error) {
      return {
        ...baseResult,
        ok: false,
        skipped: false,
        created: false,
        reason: error.message,
      };
    }

    return {
      ok: true,
      skipped: false,
      created: false,
      email: credentials.email,
      temporaryPassword: credentials.password,
      reason: "Student account password updated.",
      userId: existingUser.id,
    };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: credentials.email,
    password: credentials.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.studentName,
      phone: input.phone,
      must_change_password: true,
      auto_created_from_admin_access_grant: true,
      password_set_by_admin: options.forcePasswordUpdate,
      source_order_code: input.sourceOrderCode,
      enrolled_course_slug: input.courseSlug,
      enrolled_course_title: input.courseTitle,
      temporary_password_strategy: options.temporaryPassword ? "manual-admin" : "given_name_phone",
      temporary_password_created_at: new Date().toISOString(),
    },
  });

  if (error) {
    if (isExistingUserError(error.message)) {
      return {
        ...baseResult,
        ok: true,
        skipped: true,
        created: false,
        reason: "Student account already exists.",
      };
    }

    return {
      ...baseResult,
      ok: false,
      skipped: false,
      created: false,
      reason: error.message,
    };
  }

  return {
    ok: true,
    skipped: false,
    created: true,
    email: credentials.email,
    temporaryPassword: credentials.password,
    reason: null,
    userId: data.user?.id ?? null,
  };
}
