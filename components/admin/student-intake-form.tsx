"use client";

import { StudentProvisioningWizard } from "@/components/admin/student-provisioning-wizard";
import type { Course } from "@/data/courses";

/** @deprecated Use StudentProvisioningWizard directly. Kept as a compatibility boundary. */
export function StudentIntakeForm({ courses }: { courses: Course[]; onSuccess?: () => void }) {
  return <StudentProvisioningWizard courses={courses} />;
}
