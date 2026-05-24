import { describe, expect, it } from "vitest";

import { workspaceNavigation, workspaceTabs } from "./workspace-navigation";

describe("workspace navigation", () => {
  it("maps every sidebar item to an available tab", () => {
    const tabValues = new Set(workspaceTabs.map((tab) => tab.value));

    for (const item of workspaceNavigation) {
      expect(tabValues.has(item.tab), `${item.label} points to a missing tab`).toBe(true);
    }
  });

  it("keeps the old student and course menu inside the LMS workspace", () => {
    expect(workspaceNavigation.find((item) => item.id === "students")?.tab).toBe("lms");
    expect(workspaceNavigation.find((item) => item.id === "courses")?.tab).toBe("lms");
  });
});
