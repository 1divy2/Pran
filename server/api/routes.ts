// ─────────────────────────────────────────────────────────────────────────────
// API Routes — server endpoints for data operations.
// Replaces client-side localStorage with database-backed operations.
// ─────────────────────────────────────────────────────────────────────────────

import type { QueryFunction } from "../db/dal";
import * as dal from "../db/dal";
import { submitIngestionJob, listRecentJobs, getJobStatus } from "../workers/ingestion-worker";

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export function createApiRoutes(query: QueryFunction) {
  return {
    // ─── Evidence ──────────────────────────────────────────────────────
    async searchEvidence(term: string, limit?: number): Promise<ApiResponse> {
      try {
        const results = await dal.searchEvidence(query, term, limit);
        return { success: true, data: results };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },

    async getEvidence(id: string): Promise<ApiResponse> {
      try {
        const evidence = await dal.getEvidenceById(query, id);
        if (!evidence) return { success: false, error: "Not found" };
        return { success: true, data: evidence };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },

    async getTopicEvidence(topicId: string, limit?: number): Promise<ApiResponse> {
      try {
        const evidence = await dal.getEvidenceByTopic(query, topicId, limit);
        return { success: true, data: evidence };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },

    // ─── Collections ──────────────────────────────────────────────────
    async listCollections(): Promise<ApiResponse> {
      try {
        const collections = await dal.listCollections(query);
        return { success: true, data: collections };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },

    async createCollection(data: {
      name: string;
      description?: string;
      color?: string;
    }): Promise<ApiResponse> {
      try {
        const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const collection = await dal.createCollection(query, {
          id,
          ...data,
        });
        return { success: true, data: collection };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },

    async deleteCollection(id: string): Promise<ApiResponse> {
      try {
        const deleted = await dal.deleteCollection(query, id);
        return { success: true, data: { deleted } };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },

    async addCollectionItem(
      collectionId: string,
      evidenceId: string,
      notes?: string,
      tags?: string[],
      rating?: number,
    ): Promise<ApiResponse> {
      try {
        await dal.addCollectionItem(query, collectionId, evidenceId, notes, tags, rating);
        return { success: true };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },

    // ─── Annotations ──────────────────────────────────────────────────
    async getAnnotations(evidenceId: string): Promise<ApiResponse> {
      try {
        const annotations = await dal.getAnnotationsForEvidence(query, evidenceId);
        return { success: true, data: annotations };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },

    async createAnnotation(data: {
      evidenceId: string;
      author: string;
      category: string;
      content: string;
      parentId?: string;
    }): Promise<ApiResponse> {
      try {
        const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const annotation = await dal.createAnnotation(query, {
          id,
          ...data,
        });
        return { success: true, data: annotation };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },

    // ─── Workspaces ──────────────────────────────────────────────────
    async createWorkspace(data: {
      name: string;
      description?: string;
      color?: string;
      owner: string;
    }): Promise<ApiResponse> {
      try {
        const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const workspace = await dal.createWorkspace(query, {
          id,
          name: data.name,
          description: data.description,
          color: data.color,
        });
        // Set owner
        await dal.addWorkspaceMember(query, id, data.owner, "owner");
        await dal.logWorkspaceActivity(query, id, "collection_created", data.owner, `${data.owner} created workspace ${data.name}`);
        return { success: true, data: workspace };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },

    // ─── Ingestion Jobs ──────────────────────────────────────────────
    async submitJob(queries: string[]): Promise<ApiResponse> {
      try {
        const job = await submitIngestionJob(query, queries);
        return { success: true, data: job };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },

    async getJob(id: string): Promise<ApiResponse> {
      try {
        const job = await getJobStatus(query, id);
        if (!job) return { success: false, error: "Job not found" };
        return { success: true, data: job };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },

    async listJobs(limit?: number): Promise<ApiResponse> {
      try {
        const jobs = await listRecentJobs(query, limit);
        return { success: true, data: jobs };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },

    // ─── Errors ──────────────────────────────────────────────────────
    async getErrors(limit?: number): Promise<ApiResponse> {
      try {
        const errors = await dal.getRecentErrors(query, limit);
        return { success: true, data: errors };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    },
  };
}
