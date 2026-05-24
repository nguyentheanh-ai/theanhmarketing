import { describe, expect, it } from "vitest";

import { workspaceNavigation, workspaceTabs } from "./workspace-navigation";

describe("workspace navigation", () => {
  it("maps every sidebar item to an available tab", () => {
    const tabValues = new Set(workspaceTabs.map((tab) => tab.value));

    for (const item of workspaceNavigation) {
      expect(tabValues.has(item.tab), `${item.label} points to a missing tab`).toBe(true);
    }
  });

  it("opens students and courses as separate workspaces", () => {
    const students = workspaceNavigation.find((item) => item.id === "students");
    const courses = workspaceNavigation.find((item) => item.id === "courses");

    expect(students?.tab).toBe("students");
    expect(courses?.tab).toBe("courses");
    expect(students?.tab).not.toBe(courses?.tab);
  });
});
