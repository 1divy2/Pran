// ─────────────────────────────────────────────────────────────────────────────
// Team Workspaces — shared environments for collaborative evidence analysis.
// Members can share collections, leave annotations, and track activity.
// Simulates team collaboration via localStorage (single-user device model).
// ─────────────────────────────────────────────────────────────────────────────

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export interface WorkspaceMember {
  /** Display name */
  name: string;
  /** Role in the workspace */
  role: WorkspaceRole;
  /** When the member joined */
  joinedAt: string;
  /** Optional avatar color */
  color: string;
}

export interface WorkspaceActivity {
  /** Unique activity ID */
  id: string;
  /** Type of activity */
  type: "collection_created" | "collection_shared" | "annotation_added" | "member_joined" | "member_removed" | "report_generated";
  /** Who performed the action */
  actor: string;
  /** Human-readable description */
  description: string;
  /** ISO timestamp */
  timestamp: string;
  /** Associated entity ID */
  entityId?: string;
}

export interface Workspace {
  /** Unique workspace ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Optional description */
  description: string;
  /** Members with their roles */
  members: WorkspaceMember[];
  /** Shared collection IDs */
  sharedCollections: string[];
  /** Activity log */
  activity: WorkspaceActivity[];
  /** When the workspace was created */
  createdAt: string;
  /** When the workspace was last active */
  updatedAt: string;
  /** Workspace color */
  color: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  sharedCollectionCount: number;
  activityCount: number;
  createdAt: string;
  updatedAt: string;
  color: string;
}

const STORAGE_KEY = "pran-workspaces";
const MAX_WORKSPACES = 20;
const MEMBER_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
  "#f43f5e", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1",
];

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

function loadWorkspaces(): Workspace[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Workspace[];
  } catch {
    return [];
  }
}

function saveWorkspaces(workspaces: Workspace[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
  } catch {
    // Storage full — fail silently
  }
}

function generateId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateActivityId(): string {
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspace CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new workspace with the current user as owner.
 */
export function createWorkspace(
  name: string,
  ownerName: string,
  opts: {
    description?: string;
    color?: string;
  } = {},
): Workspace {
  const workspaces = loadWorkspaces();
  if (workspaces.length >= MAX_WORKSPACES) {
    throw new Error(`Maximum ${MAX_WORKSPACES} workspaces reached`);
  }

  const now = new Date().toISOString();
  const workspace: Workspace = {
    id: generateId(),
    name: name.trim(),
    description: opts.description?.trim() ?? "",
    members: [
      {
        name: ownerName.trim(),
        role: "owner",
        joinedAt: now,
        color: MEMBER_COLORS[0],
      },
    ],
    sharedCollections: [],
    activity: [
      {
        id: generateActivityId(),
        type: "member_joined",
        actor: ownerName.trim(),
        description: `${ownerName.trim()} created the workspace`,
        timestamp: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
    color: opts.color ?? MEMBER_COLORS[0],
  };

  workspaces.push(workspace);
  saveWorkspaces(workspaces);
  return workspace;
}

/**
 * List all workspaces (summary view).
 */
export function listWorkspaces(): WorkspaceSummary[] {
  return loadWorkspaces().map(({ members, activity, sharedCollections, ...rest }) => ({
    ...rest,
    memberCount: members.length,
    sharedCollectionCount: sharedCollections.length,
    activityCount: activity.length,
  }));
}

/**
 * Get a workspace by ID.
 */
export function getWorkspace(id: string): Workspace | null {
  return loadWorkspaces().find((w) => w.id === id) ?? null;
}

/**
 * Update workspace metadata.
 */
export function updateWorkspace(
  id: string,
  updates: Partial<Pick<Workspace, "name" | "description" | "color">>,
): Workspace | null {
  const workspaces = loadWorkspaces();
  const idx = workspaces.findIndex((w) => w.id === id);
  if (idx === -1) return null;

  if (updates.name !== undefined) workspaces[idx].name = updates.name.trim();
  if (updates.description !== undefined) workspaces[idx].description = updates.description.trim();
  if (updates.color !== undefined) workspaces[idx].color = updates.color;
  workspaces[idx].updatedAt = new Date().toISOString();

  saveWorkspaces(workspaces);
  return workspaces[idx];
}

/**
 * Delete a workspace.
 */
export function deleteWorkspace(id: string): boolean {
  const workspaces = loadWorkspaces();
  const filtered = workspaces.filter((w) => w.id !== id);
  if (filtered.length === workspaces.length) return false;
  saveWorkspaces(filtered);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Member management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a member to a workspace.
 */
export function addMember(
  workspaceId: string,
  name: string,
  role: WorkspaceRole = "member",
  addedBy: string,
): WorkspaceMember | null {
  const workspaces = loadWorkspaces();
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return null;

  // Check for duplicate
  if (workspace.members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
    return workspace.members.find((m) => m.name.toLowerCase() === name.toLowerCase())!;
  }

  const colorIdx = workspace.members.length % MEMBER_COLORS.length;
  const member: WorkspaceMember = {
    name: name.trim(),
    role,
    joinedAt: new Date().toISOString(),
    color: MEMBER_COLORS[colorIdx],
  };

  workspace.members.push(member);
  workspace.activity.push({
    id: generateActivityId(),
    type: "member_joined",
    actor: addedBy,
    description: `${addedBy} added ${name.trim()} as ${role}`,
    timestamp: new Date().toISOString(),
  });
  workspace.updatedAt = new Date().toISOString();

  saveWorkspaces(workspaces);
  return member;
}

/**
 * Remove a member from a workspace.
 */
export function removeMember(
  workspaceId: string,
  memberName: string,
  removedBy: string,
): boolean {
  const workspaces = loadWorkspaces();
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return false;

  const member = workspace.members.find(
    (m) => m.name.toLowerCase() === memberName.toLowerCase(),
  );
  if (!member || member.role === "owner") return false;

  workspace.members = workspace.members.filter(
    (m) => m.name.toLowerCase() !== memberName.toLowerCase(),
  );
  workspace.activity.push({
    id: generateActivityId(),
    type: "member_removed",
    actor: removedBy,
    description: `${removedBy} removed ${memberName}`,
    timestamp: new Date().toISOString(),
  });
  workspace.updatedAt = new Date().toISOString();

  saveWorkspaces(workspaces);
  return true;
}

/**
 * Update a member's role.
 */
export function updateMemberRole(
  workspaceId: string,
  memberName: string,
  newRole: WorkspaceRole,
): boolean {
  const workspaces = loadWorkspaces();
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return false;

  const member = workspace.members.find(
    (m) => m.name.toLowerCase() === memberName.toLowerCase(),
  );
  if (!member || member.role === "owner") return false;

  member.role = newRole;
  workspace.updatedAt = new Date().toISOString();

  saveWorkspaces(workspaces);
  return true;
}

/**
 * Check if a user is a member of a workspace.
 */
export function isMember(workspaceId: string, name: string): WorkspaceMember | null {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) return null;
  return (
    workspace.members.find((m) => m.name.toLowerCase() === name.toLowerCase()) ?? null
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared collections
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Share a collection with a workspace.
 */
export function shareCollection(
  workspaceId: string,
  collectionId: string,
  sharedBy: string,
): boolean {
  const workspaces = loadWorkspaces();
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return false;

  if (workspace.sharedCollections.includes(collectionId)) return true;

  workspace.sharedCollections.push(collectionId);
  workspace.activity.push({
    id: generateActivityId(),
    type: "collection_shared",
    actor: sharedBy,
    description: `${sharedBy} shared collection with the workspace`,
    timestamp: new Date().toISOString(),
    entityId: collectionId,
  });
  workspace.updatedAt = new Date().toISOString();

  saveWorkspaces(workspaces);
  return true;
}

/**
 * Unshare a collection from a workspace.
 */
export function unshareCollection(
  workspaceId: string,
  collectionId: string,
): boolean {
  const workspaces = loadWorkspaces();
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return false;

  const before = workspace.sharedCollections.length;
  workspace.sharedCollections = workspace.sharedCollections.filter(
    (id) => id !== collectionId,
  );
  if (workspace.sharedCollections.length === before) return false;

  workspace.updatedAt = new Date().toISOString();
  saveWorkspaces(workspaces);
  return true;
}

/**
 * Get shared collection IDs for a workspace.
 */
export function getSharedCollections(workspaceId: string): string[] {
  const workspace = getWorkspace(workspaceId);
  return workspace?.sharedCollections ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity log
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log an activity in a workspace.
 */
export function logActivity(
  workspaceId: string,
  type: WorkspaceActivity["type"],
  actor: string,
  description: string,
  entityId?: string,
): void {
  const workspaces = loadWorkspaces();
  const workspace = workspaces.find((w) => w.id === workspaceId);
  if (!workspace) return;

  workspace.activity.push({
    id: generateActivityId(),
    type,
    actor,
    description,
    timestamp: new Date().toISOString(),
    entityId,
  });

  // Keep only last 100 activities
  if (workspace.activity.length > 100) {
    workspace.activity = workspace.activity.slice(-100);
  }

  workspace.updatedAt = new Date().toISOString();
  saveWorkspaces(workspaces);
}

/**
 * Get recent activity for a workspace.
 */
export function getRecentActivity(
  workspaceId: string,
  limit: number = 20,
): WorkspaceActivity[] {
  const workspace = getWorkspace(workspaceId);
  if (!workspace) return [];
  return workspace.activity
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// Workspace search
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search workspaces by name or description.
 */
export function searchWorkspaces(query: string): WorkspaceSummary[] {
  const lower = query.toLowerCase();
  return loadWorkspaces()
    .filter(
      (w) =>
        w.name.toLowerCase().includes(lower) ||
        w.description.toLowerCase().includes(lower),
    )
    .map(({ members, activity, sharedCollections, ...rest }) => ({
      ...rest,
      memberCount: members.length,
      sharedCollectionCount: sharedCollections.length,
      activityCount: activity.length,
    }));
}

/**
 * Get all workspaces a user belongs to.
 */
export function getWorkspacesForMember(memberName: string): WorkspaceSummary[] {
  const lower = memberName.toLowerCase();
  return loadWorkspaces()
    .filter((w) => w.members.some((m) => m.name.toLowerCase() === lower))
    .map(({ members, activity, sharedCollections, ...rest }) => ({
      ...rest,
      memberCount: members.length,
      sharedCollectionCount: sharedCollections.length,
      activityCount: activity.length,
    }));
}
