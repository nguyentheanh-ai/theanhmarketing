import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  try {
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) {
        continue;
      }
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // Optional local env file.
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env.production");

const email = process.env.ADMIN_EDITOR_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_EDITOR_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !password || !supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing ADMIN_EDITOR_EMAIL, ADMIN_EDITOR_PASSWORD, or Supabase admin environment.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function findUserByEmail(targetEmail) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      throw error;
    }

    const user = data.users.find((item) => item.email?.toLowerCase() === targetEmail);
    if (user) {
      return user;
    }

    if (data.users.length < 1000) {
      return null;
    }
  }

  return null;
}

const existingUser = await findUserByEmail(email);

if (existingUser) {
  const { error } = await supabase.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
    app_metadata: {
      ...existingUser.app_metadata,
      admin_role: "editor",
    },
  });

  if (error) {
    throw error;
  }

  console.log(`updated:${email}:editor`);
} else {
  const { error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      admin_role: "editor",
    },
  });

  if (error) {
    throw error;
  }

  console.log(`created:${email}:editor`);
}
