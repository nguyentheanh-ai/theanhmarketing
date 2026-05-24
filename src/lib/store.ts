"use client";

import { create } from "zustand";

import type { Lead } from "./types";

type WorkspaceState = {
  sidebarCollapsed: boolean;
  selectedLead: Lead | null;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSelectedLead: (lead: Lead | null) => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  sidebarCollapsed: false,
  selectedLead: null,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setSelectedLead: (selectedLead) => set({ selectedLead }),
}));
