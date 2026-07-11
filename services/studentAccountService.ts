import { createClient } from "@supabase/supabase-js";
import { buildAutoStudentAccountCredentials } from "@/lib/auth/student-account";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logStudentActivity } from "@/services/activityLogService";
import type { PaymentOrder } from "@/services/orderService";

type EnsureStudentAccountOptions = {
  temporaryPassword?: string;
  forcePasswordUpdate?: boolean;
  preserveExistingAuth?: boolean;
  provisioningOperationId?: string;
};

export type StudentAccountProvisionResult = {
  ok: boolean;
  skipped: boolean;
  created: boolean;
  email: string;
  temporaryPassword: string | null;
  reason: string | null;
  userId: string | null;
  loginVerified?: boolean;
  authNormalization?: AuthNormalizationResult;
};

type SupabaseAdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

type AuthNormalizationResult = {
  attempted: boolean;
  ok: boolean;
  reason: string | null;
};

const AUTH_USER_PASSWORD_LOGIN_NORMALIZATION = {
  aud: "authenticated",
  role: "authenticated",
  confirmation_token: "",
  recovery_token: "",
  email_change_token_current: "",
  email_change_token_new: "",
  email_change: "",
  phone_change: "",
  phone_change_token: "",
  reauthentication_token: "",
};

function isExistingUserError(message: string) {
  return /already|registered|exists|exist/i.test(message);
}

async function findAuthUserByEmail(
  supabase: SupabaseAdminClient,
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
  supabase: SupabaseAdminClient,
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

async function normalizeAuthUserForPasswordLogin(
  supabase: SupabaseAdminClient,
  userId: string | null,
): Promise<AuthNormalizationResult> {
  if (!userId) {
    return { attempted: false, ok: false, reason: "Missing Auth user id for login normalization." };
  }

  try {
    const { error } = await supabase
      .schema("auth")
      .from("users")
      .update(AUTH_USER_PASSWORD_LOGIN_NORMALIZATION)
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (error) {
      return { attempted: true, ok: false, reason: error.message };
    }

    return { attempted: true, ok: true, reason: null };
  } catch (error) {
    return {
      attempted: true,
      ok: false,
      reason: error instanceof Error ? error.message : "Could not normalize Auth user login fields.",
    };
  }
}

async function verifyStudentPasswordLogin(email: string, password: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { ok: false, reason: "Missing Supabase anon configuration for password login verification." };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { ok: false, reason: error?.message ?? "Could not verify student password login." };
  }

  await supabase.auth.signOut();

  return { ok: true, reason: null };
}

async function completeProvisionedPasswordLogin(
  supabase: SupabaseAdminClient,
  input: {
    email: string;
    password: string;
    userId: string | null;
    created: boolean;
    successReason: string | null;
  },
): Promise<StudentAccountProvisionResult> {
  const authNormalization = await normalizeAuthUserForPasswordLogin(supabase, input.userId);
  const loginVerification = await verifyStudentPasswordLogin(input.email, input.password);

  if (!loginVerification.ok) {
    const normalizationDetail = authNormalization.ok
      ? null
      : ` Auth normalization ${authNormalization.attempted ? "failed" : "was skipped"}: ${
          authNormalization.reason ?? "unknown reason"
        }.`;

    return {
      ok: false,
      skipped: false,
      created: false,
      email: input.email,
      temporaryPassword: null,
      reason: `Password login verification failed after account provisioning: ${
        loginVerification.reason ?? "unknown reason"
      }.${normalizationDetail ?? ""}`,
      userId: input.userId,
      loginVerified: false,
      authNormalization,
    };
  }

  return {
    ok: true,
    skipped: false,
    created: input.created,
    email: input.email,
    temporaryPassword: input.password,
    reason: input.successReason,
    userId: input.userId,
    loginVerified: true,
    authNormalization,
  };
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

      return completeProvisionedPasswordLogin(supabase, {
        email: credentials.email,
        password: credentials.password,
        userId: existingUser.id,
        created: false,
        successReason: "Student account password updated.",
      });
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
      provisioning_operation_id: options.provisioningOperationId,
    },
  });

  if (error) {
    if (isExistingUserError(error.message)) {
      const existingUser = await findAuthUserByEmail(supabase, credentials.email);

      if (existingUser) {
        if (options.preserveExistingAuth && !options.forcePasswordUpdate) {
          if (
            options.provisioningOperationId
            && existingUser.user_metadata?.provisioning_operation_id === options.provisioningOperationId
          ) {
            return completeProvisionedPasswordLogin(supabase, {
              email: credentials.email,
              password: credentials.password,
              userId: existingUser.id,
              created: false,
              successReason: "Student account provisioning resumed.",
            });
          }
          return {
            ...baseResult,
            ok: true,
            skipped: true,
            created: false,
            reason: "Student account already exists; existing authentication method was preserved.",
            userId: existingUser.id,
          };
        }
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

        return completeProvisionedPasswordLogin(supabase, {
          email: credentials.email,
          password: credentials.password,
          userId: existingUser.id,
          created: false,
          successReason: "Student account password updated.",
        });
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

  const provisionResult = await completeProvisionedPasswordLogin(supabase, {
    email: credentials.email,
    password: credentials.password,
    userId: data.user?.id ?? null,
    created: true,
    successReason: null,
  });

  if (!provisionResult.ok) {
    return provisionResult;
  }

  await logStudentActivity({
    userId: provisionResult.userId,
    studentEmail: credentials.email,
    studentPhone: order.phone,
    eventType: "student_account_created",
    eventTitle: "Đã tạo tài khoản học viên",
    eventDescription: `Tài khoản được tạo sau khi đơn ${order.orderCode} đã thanh toán.`,
    status: "success",
    actorType: "system",
    metadata: { orderCode: order.orderCode, courseSlug: order.courseSlug, courseTitle: order.courseTitle },
  });

  return provisionResult;
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
      if (
        options.preserveExistingAuth
        && options.provisioningOperationId
        && existingUser.user_metadata?.provisioning_operation_id === options.provisioningOperationId
      ) {
        return completeProvisionedPasswordLogin(supabase, {
          email: credentials.email,
          password: credentials.password,
          userId: existingUser.id,
          created: false,
          successReason: "Student account provisioning resumed.",
        });
      }
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

    return completeProvisionedPasswordLogin(supabase, {
      email: credentials.email,
      password: credentials.password,
      userId: existingUser.id,
      created: false,
      successReason: "Student account password updated.",
    });
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
      provisioning_operation_id: options.provisioningOperationId,
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

  const provisionResult = await completeProvisionedPasswordLogin(supabase, {
    email: credentials.email,
    password: credentials.password,
    userId: data.user?.id ?? null,
    created: true,
    successReason: null,
  });

  if (!provisionResult.ok) {
    return provisionResult;
  }

  await logStudentActivity({
    userId: provisionResult.userId,
    studentEmail: credentials.email,
    studentPhone: input.phone,
    eventType: "student_account_created",
    eventTitle: "Đã tạo tài khoản học viên",
    eventDescription: "Tài khoản được tạo từ thao tác cấp quyền của admin.",
    status: "success",
    actorType: "system",
    metadata: { sourceOrderCode: input.sourceOrderCode ?? null, courseSlug: input.courseSlug, courseTitle: input.courseTitle },
  });

  return provisionResult;
}
