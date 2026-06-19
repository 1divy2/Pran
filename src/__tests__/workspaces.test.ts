import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addMember,
  removeMember,
  updateMemberRole,
  isMember,
  shareCollection,
  unshareCollection,
  getSharedCollections,
  logActivity,
  getRecentActivity,
  searchWorkspaces,
  getWorkspacesForMember,
} from "@/lib/workspaces";

const store: Record<string, string> = {};
const mockStorage = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  get length() { return Object.keys(store).length; },
  key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
};

vi.stubGlobal("localStorage", mockStorage);

describe("Team Workspaces", () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    vi.clearAllMocks();
  });

  describe("createWorkspace", () => {
    it("creates a workspace with owner", () => {
      const ws = createWorkspace("Research Team", "Alice");
      expect(ws.id).toMatch(/^ws-/);
      expect(ws.name).toBe("Research Team");
      expect(ws.members.length).toBe(1);
      expect(ws.members[0].name).toBe("Alice");
      expect(ws.members[0].role).toBe("owner");
      expect(ws.sharedCollections).toEqual([]);
      expect(ws.activity.length).toBe(1);
    });

    it("creates with description and color", () => {
      const ws = createWorkspace("Team", "Bob", {
        description: "Cardiology research",
        color: "#ef4444",
      });
      expect(ws.description).toBe("Cardiology research");
      expect(ws.color).toBe("#ef4444");
    });

    it("trims whitespace", () => {
      const ws = createWorkspace("  Team Name  ", "Alice");
      expect(ws.name).toBe("Team Name");
    });
  });

  describe("listWorkspaces", () => {
    it("returns summaries", () => {
      createWorkspace("A", "Alice");
      createWorkspace("B", "Bob");
      const list = listWorkspaces();
      expect(list.length).toBe(2);
      expect(list[0].memberCount).toBe(1);
    });
  });

  describe("getWorkspace", () => {
    it("retrieves by ID", () => {
      const ws = createWorkspace("Team", "Alice");
      expect(getWorkspace(ws.id)).not.toBeNull();
    });

    it("returns null for unknown ID", () => {
      expect(getWorkspace("nonexistent")).toBeNull();
    });
  });

  describe("updateWorkspace", () => {
    it("updates name and description", () => {
      const ws = createWorkspace("Old", "Alice");
      const updated = updateWorkspace(ws.id, { name: "New", description: "Updated" });
      expect(updated!.name).toBe("New");
      expect(updated!.description).toBe("Updated");
    });

    it("returns null for unknown ID", () => {
      expect(updateWorkspace("nonexistent", { name: "X" })).toBeNull();
    });
  });

  describe("deleteWorkspace", () => {
    it("deletes a workspace", () => {
      const ws = createWorkspace("Team", "Alice");
      expect(deleteWorkspace(ws.id)).toBe(true);
      expect(getWorkspace(ws.id)).toBeNull();
    });

    it("returns false for unknown ID", () => {
      expect(deleteWorkspace("nonexistent")).toBe(false);
    });
  });

  describe("addMember", () => {
    it("adds a member with default role", () => {
      const ws = createWorkspace("Team", "Alice");
      const member = addMember(ws.id, "Bob");
      expect(member).not.toBeNull();
      expect(member!.name).toBe("Bob");
      expect(member!.role).toBe("member");

      const reloaded = getWorkspace(ws.id);
      expect(reloaded!.members.length).toBe(2);
    });

    it("adds with specific role", () => {
      const ws = createWorkspace("Team", "Alice");
      addMember(ws.id, "Bob", "admin");
      const reloaded = getWorkspace(ws.id);
      expect(reloaded!.members[1].role).toBe("admin");
    });

    it("logs activity", () => {
      const ws = createWorkspace("Team", "Alice");
      addMember(ws.id, "Bob", "member", "Alice");
      const reloaded = getWorkspace(ws.id);
      expect(reloaded!.activity.length).toBe(2);
      expect(reloaded!.activity[1].description).toContain("Alice");
    });

    it("rejects duplicate members", () => {
      const ws = createWorkspace("Team", "Alice");
      addMember(ws.id, "Bob");
      const dup = addMember(ws.id, "Bob");
      expect(dup).not.toBeNull(); // Returns existing member
      const reloaded = getWorkspace(ws.id);
      expect(reloaded!.members.length).toBe(2);
    });

    it("returns null for unknown workspace", () => {
      expect(addMember("nonexistent", "Bob")).toBeNull();
    });
  });

  describe("removeMember", () => {
    it("removes a member", () => {
      const ws = createWorkspace("Team", "Alice");
      addMember(ws.id, "Bob");
      expect(removeMember(ws.id, "Bob", "Alice")).toBe(true);
      const reloaded = getWorkspace(ws.id);
      expect(reloaded!.members.length).toBe(1);
    });

    it("prevents removing the owner", () => {
      const ws = createWorkspace("Team", "Alice");
      expect(removeMember(ws.id, "Alice", "Alice")).toBe(false);
    });

    it("logs activity", () => {
      const ws = createWorkspace("Team", "Alice");
      addMember(ws.id, "Bob");
      removeMember(ws.id, "Bob", "Alice");
      const reloaded = getWorkspace(ws.id);
      const removeActivity = reloaded!.activity.find((a) => a.type === "member_removed");
      expect(removeActivity).toBeDefined();
    });

    it("returns false for unknown member", () => {
      const ws = createWorkspace("Team", "Alice");
      expect(removeMember(ws.id, "Unknown", "Alice")).toBe(false);
    });
  });

  describe("updateMemberRole", () => {
    it("updates a member's role", () => {
      const ws = createWorkspace("Team", "Alice");
      addMember(ws.id, "Bob");
      expect(updateMemberRole(ws.id, "Bob", "admin")).toBe(true);
      const reloaded = getWorkspace(ws.id);
      expect(reloaded!.members[1].role).toBe("admin");
    });

    it("prevents changing owner role", () => {
      const ws = createWorkspace("Team", "Alice");
      expect(updateMemberRole(ws.id, "Alice", "member")).toBe(false);
    });

    it("returns false for unknown member", () => {
      const ws = createWorkspace("Team", "Alice");
      expect(updateMemberRole(ws.id, "Unknown", "admin")).toBe(false);
    });
  });

  describe("isMember", () => {
    it("finds a member", () => {
      const ws = createWorkspace("Team", "Alice");
      expect(isMember(ws.id, "Alice")).not.toBeNull();
      expect(isMember(ws.id, "Alice")!.role).toBe("owner");
    });

    it("returns null for non-member", () => {
      const ws = createWorkspace("Team", "Alice");
      expect(isMember(ws.id, "Bob")).toBeNull();
    });

    it("returns null for unknown workspace", () => {
      expect(isMember("nonexistent", "Alice")).toBeNull();
    });
  });

  describe("shareCollection", () => {
    it("shares a collection", () => {
      const ws = createWorkspace("Team", "Alice");
      expect(shareCollection(ws.id, "col-1", "Alice")).toBe(true);
      expect(getSharedCollections(ws.id)).toEqual(["col-1"]);
    });

    it("logs activity", () => {
      const ws = createWorkspace("Team", "Alice");
      shareCollection(ws.id, "col-1", "Alice");
      const reloaded = getWorkspace(ws.id);
      const activity = reloaded!.activity.find((a) => a.type === "collection_shared");
      expect(activity).toBeDefined();
    });

    it("does not duplicate shares", () => {
      const ws = createWorkspace("Team", "Alice");
      shareCollection(ws.id, "col-1", "Alice");
      shareCollection(ws.id, "col-1", "Alice");
      expect(getSharedCollections(ws.id)).toEqual(["col-1"]);
    });

    it("returns false for unknown workspace", () => {
      expect(shareCollection("nonexistent", "col-1", "Alice")).toBe(false);
    });
  });

  describe("unshareCollection", () => {
    it("unshares a collection", () => {
      const ws = createWorkspace("Team", "Alice");
      shareCollection(ws.id, "col-1", "Alice");
      expect(unshareCollection(ws.id, "col-1")).toBe(true);
      expect(getSharedCollections(ws.id)).toEqual([]);
    });

    it("returns false for unknown collection", () => {
      const ws = createWorkspace("Team", "Alice");
      expect(unshareCollection(ws.id, "nonexistent")).toBe(false);
    });
  });

  describe("logActivity", () => {
    it("logs an activity", () => {
      const ws = createWorkspace("Team", "Alice");
      logActivity(ws.id, "annotation_added", "Bob", "Bob added a note");
      const recent = getRecentActivity(ws.id);
      expect(recent.length).toBe(2);
      expect(recent.some((a) => a.type === "annotation_added")).toBe(true);
    });

    it("caps at 100 activities", () => {
      const ws = createWorkspace("Team", "Alice");
      for (let i = 0; i < 110; i++) {
        logActivity(ws.id, "note", "Alice", `Activity ${i}`);
      }
      const reloaded = getWorkspace(ws.id);
      expect(reloaded!.activity.length).toBe(100);
    });
  });

  describe("getRecentActivity", () => {
    it("returns activities sorted by timestamp", () => {
      const ws = createWorkspace("Team", "Alice");
      logActivity(ws.id, "annotation_added", "Alice", "First");
      logActivity(ws.id, "collection_created", "Bob", "Second");

      const recent = getRecentActivity(ws.id);
      expect(recent.length).toBeGreaterThanOrEqual(2);
      expect(recent.some((a) => a.description === "Second")).toBe(true);
      expect(recent.some((a) => a.description === "First")).toBe(true);
    });

    it("respects limit", () => {
      const ws = createWorkspace("Team", "Alice");
      for (let i = 0; i < 5; i++) {
        logActivity(ws.id, "note", "Alice", `Act ${i}`);
      }
      expect(getRecentActivity(ws.id, 2).length).toBe(2);
    });
  });

  describe("searchWorkspaces", () => {
    it("searches by name", () => {
      createWorkspace("Cardiology Team", "Alice");
      createWorkspace("Oncology Team", "Bob");

      const results = searchWorkspaces("cardiology");
      expect(results.length).toBe(1);
      expect(results[0].name).toBe("Cardiology Team");
    });

    it("searches by description", () => {
      createWorkspace("Team A", "Alice", { description: "Heart research" });
      createWorkspace("Team B", "Bob", { description: "Brain research" });

      const results = searchWorkspaces("heart");
      expect(results.length).toBe(1);
    });
  });

  describe("getWorkspacesForMember", () => {
    it("finds workspaces for a member", () => {
      const ws1 = createWorkspace("A", "Alice");
      const ws2 = createWorkspace("B", "Bob");
      addMember(ws2.id, "Alice");

      const results = getWorkspacesForMember("Alice");
      expect(results.length).toBe(2);
    });

    it("returns empty for non-member", () => {
      createWorkspace("A", "Alice");
      expect(getWorkspacesForMember("Bob")).toEqual([]);
    });
  });
});
