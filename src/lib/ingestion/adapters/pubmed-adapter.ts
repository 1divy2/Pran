// ─────────────────────────────────────────────────────────────────────────────
// PubMed Adapter — ingests from NCBI E-utilities
// Docs: https://www.ncbi.nlm.nih.gov/books/NBK25501/
// ─────────────────────────────────────────────────────────────────────────────

import type { DataSourceAdapter } from "../adapter";
import type { IngestionQuery, IngestionResult, NormalizedEvidence } from "../types";
import { classifyTier } from "@/lib/evidence";

const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const API_KEY = import.meta.env.VITE_NCBI_API_KEY as string | undefined;

function apiKeyParam(): string {
  return API_KEY ? `&api_key=${API_KEY}` : "";
}

interface ESearchResult {
  esearchresult: { count: string; idlist: string[] };
}

interface ESummaryResult {
  result: Record<
    string,
    {
      uid: string;
      title: string;
      authors: { name: string }[];
      fulljournalname: string;
      pubdate: string;
      source: string;
    }
  >;
}

interface EFetchArticle {
  PubmedArticle: {
    MedlineCitation: {
      PMID: { _: string };
      Article: {
        ArticleTitle: { _: string } | string;
        Abstract?: {
          AbstractText?: { _: string; $: { Label?: string } }[] | string;
        };
        AuthorList?: {
          Author: { ForeName?: string; LastName?: string }[];
        };
        Journal?: { Title: string; JournalIssue?: { PubDate?: { Year?: string } } };
      };
    };
  };
}

export const pubmedAdapter: DataSourceAdapter = {
  id: "pubmed",
  name: "PubMed / NCBI E-utilities",
  baseUrl: BASE,
  requiresApiKey: false,
  rateLimit: 3,

  async search(query: IngestionQuery): Promise<IngestionResult> {
    const warnings: string[] = [];
    const ingestedAt = new Date().toISOString();

    try {
      // Step 1: Search for IDs
      const searchUrl =
        `${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query.term)}` +
        `&retmax=${query.limit}&sort=relevance&retmode=json${apiKeyParam()}`;

      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        return {
          sourceId: "pubmed",
          items: [],
          totalCount: 0,
          ingestedAt,
          warnings: [`PubMed esearch failed: ${searchRes.status}`],
        };
      }

      const searchData = (await searchRes.json()) as ESearchResult;
      const total = parseInt(searchData.esearchresult.count, 10);
      const ids = searchData.esearchresult.idlist;

      if (ids.length === 0) {
        return { sourceId: "pubmed", items: [], totalCount: total, ingestedAt, warnings };
      }

      // Step 2: Fetch summaries
      const summaryUrl =
        `${BASE}/esummary.fcgi?db=pubmed&id=${ids.join(",")}` + `&retmode=json${apiKeyParam()}`;

      const summaryRes = await fetch(summaryUrl);
      if (!summaryRes.ok) {
        return {
          sourceId: "pubmed",
          items: [],
          totalCount: total,
          ingestedAt,
          warnings: [`PubMed esummary failed: ${summaryRes.status}`],
        };
      }

      const summaryData = (await summaryRes.json()) as ESummaryResult;

      // Step 3: Fetch abstracts via efetch (XML)
      const abstracts = new Map<string, string>();
      try {
        const efetchUrl =
          `${BASE}/efetch.fcgi?db=pubmed&id=${ids.join(",")}&rettype=abstract&retmode=xml${apiKeyParam()}`;
        const efetchRes = await fetch(efetchUrl);
        if (efetchRes.ok) {
          const xmlText = await efetchRes.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(xmlText, "text/xml");
          const articles = doc.querySelectorAll("PubmedArticle");
          for (const article of articles) {
            const pmidEl = article.querySelector("PMID");
            const pmid = pmidEl?.textContent;
            if (!pmid) continue;
            const abstractEls = article.querySelectorAll("AbstractText");
            const parts: string[] = [];
            for (const el of abstractEls) {
              const label = el.getAttribute("Label");
              if (label) parts.push(`${label}: ${el.textContent ?? ""}`);
              else parts.push(el.textContent ?? "");
            }
            if (parts.length > 0) {
              abstracts.set(pmid, parts.join(" "));
            }
          }
        }
      } catch {
        // Abstract fetch is best-effort
      }

      const items: NormalizedEvidence[] = ids
        .filter((id) => summaryData.result[id])
        .map((id) => {
          const r = summaryData.result[id];
          const yearMatch = r.pubdate?.match(/\d{4}/);
          const year = yearMatch ? parseInt(yearMatch[0], 10) : null;
          const title = r.title ?? "Untitled";
          const tier = classifyTier(title, "paper");

          return {
            id,
            title,
            tier,
            year,
            sourceId: "pubmed",
            sourceName: "PubMed",
            authors: (r.authors ?? [])
              .slice(0, 6)
              .map((a) => a.name)
              .join("; "),
            journal: r.fulljournalname ?? r.source ?? "Unknown journal",
            sampleSize: null,
            effect: null,
            abstract: abstracts.get(id) ?? "",
            url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
            conditions: [query.term],
            interventions: [],
            status: null,
            rawMetadata: { pubdate: r.pubdate, source: r.source },
            ingestedAt,
          };
        });

      return { sourceId: "pubmed", items, totalCount: total, ingestedAt, warnings };
    } catch (e) {
      return {
        sourceId: "pubmed",
        items: [],
        totalCount: 0,
        ingestedAt,
        warnings: [`PubMed ingestion error: ${e instanceof Error ? e.message : String(e)}`],
      };
    }
  },

  async fetchById(id: string): Promise<NormalizedEvidence | null> {
    try {
      const url = `${BASE}/esummary.fcgi?db=pubmed&id=${id}&retmode=json${apiKeyParam()}`;
      const res = await fetch(url);
      if (!res.ok) return null;

      const data = (await res.json()) as ESummaryResult;
      const r = data.result[id];
      if (!r) return null;

      const yearMatch = r.pubdate?.match(/\d{4}/);
      const year = yearMatch ? parseInt(yearMatch[0], 10) : null;
      const title = r.title ?? "Untitled";
      const tier = classifyTier(title, "paper");

      return {
        id,
        title,
        tier,
        year,
        sourceId: "pubmed",
        sourceName: "PubMed",
        authors: (r.authors ?? [])
          .slice(0, 6)
          .map((a) => a.name)
          .join("; "),
        journal: r.fulljournalname ?? r.source ?? "Unknown journal",
        sampleSize: null,
        effect: null,
        abstract: "",
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        conditions: [],
        interventions: [],
        status: null,
        rawMetadata: { pubdate: r.pubdate },
        ingestedAt: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  },

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE}/esearch.fcgi?db=pubmed&term=test&retmax=1&retmode=json`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
