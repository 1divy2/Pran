// ─────────────────────────────────────────────────────────────────────────────
// PubMed E-utilities client
// Docs: https://www.ncbi.nlm.nih.gov/books/NBK25501/
// No API key needed for <3 req/s. Free NCBI key raises limit to 10 req/s.
// All endpoints support CORS — safe to call from the browser.
// ─────────────────────────────────────────────────────────────────────────────

import type { Paper } from "./types";
import { cacheGet, cacheSet, cacheKey } from "./cache";
import { logError } from "../error-monitor";

const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
// Set VITE_NCBI_API_KEY in .env for higher rate limits (optional)
const API_KEY = import.meta.env.VITE_NCBI_API_KEY as string | undefined;

function apiKeyParam(): string {
  return API_KEY ? `&api_key=${API_KEY}` : "";
}

interface ESearchResult {
  esearchresult: {
    count: string;
    idlist: string[];
  };
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

/**
 * Search PubMed for papers matching a condition query.
 * Returns the total count and structured Paper objects for the top results.
 */
export async function searchPapers(
  query: string,
  limit = 10,
): Promise<{ total: number; papers: Paper[] }> {
  const key = cacheKey("pubmed", query, String(limit));
  const cached = cacheGet<{ total: number; papers: Paper[] }>(key);
  if (cached) return cached;

  // Step 1: Get IDs + total count
  const searchUrl =
    `${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}` +
    `&retmax=${limit}&sort=relevance&retmode=json${apiKeyParam()}`;

  let searchRes: Response;
  try {
    searchRes = await fetch(searchUrl);
  } catch (e) {
    logError(e, "api", { source: "pubmed-search", query });
    return { total: 0, papers: [] };
  }
  if (!searchRes.ok) {
    logError(new Error(`PubMed esearch failed: ${searchRes.status}`), "api", {
      source: "pubmed-search",
      query,
      status: searchRes.status,
    });
    return { total: 0, papers: [] };
  }
  const searchData = (await searchRes.json()) as ESearchResult;

  const total = parseInt(searchData.esearchresult.count, 10);
  const ids = searchData.esearchresult.idlist;

  if (ids.length === 0) {
    const result = { total, papers: [] };
    cacheSet(key, result);
    return result;
  }

  // Step 2: Fetch summaries for those IDs
  const summaryUrl =
    `${BASE}/esummary.fcgi?db=pubmed&id=${ids.join(",")}` + `&retmode=json${apiKeyParam()}`;

  let summaryRes: Response;
  try {
    summaryRes = await fetch(summaryUrl);
  } catch (e) {
    logError(e, "api", { source: "pubmed-summary", query });
    return { total, papers: [] };
  }
  if (!summaryRes.ok) {
    logError(new Error(`PubMed esummary failed: ${summaryRes.status}`), "api", {
      source: "pubmed-summary",
      query,
      status: summaryRes.status,
    });
    return { total, papers: [] };
  }
  const summaryData = (await summaryRes.json()) as ESummaryResult;

  const papers: Paper[] = ids
    .filter((id) => summaryData.result[id])
    .map((id) => {
      const r = summaryData.result[id];
      const yearMatch = r.pubdate?.match(/\d{4}/);
      return {
        pmid: id,
        title: r.title ?? "Untitled",
        authors: (r.authors ?? []).slice(0, 4).map((a) => a.name),
        journal: r.fulljournalname ?? r.source ?? "Unknown journal",
        year: yearMatch ? parseInt(yearMatch[0], 10) : null,
        abstract: "", // Fetched on demand via fetchAbstract()
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      };
    });

  const result = { total, papers };
  cacheSet(key, result);
  return result;
}

interface EFetchResult {
  PubmedArticleSet?: {
    PubmedArticle?: Array<{
      MedlineCitation?: {
        Article?: {
          Abstract?: {
            AbstractText?: string | string[];
          };
        };
      };
    }>;
  };
}

/**
 * Fetch the abstract text for a single PubMed paper by PMID.
 */
export async function fetchAbstract(pmid: string): Promise<string> {
  const key = cacheKey("pubmed-abstract", pmid);
  const cached = cacheGet<string>(key);
  if (cached) return cached;

  const url = `${BASE}/efetch.fcgi?db=pubmed&id=${pmid}&retmode=json${apiKeyParam()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return "";
    const data = (await res.json()) as EFetchResult;
    const abstractText =
      data.PubmedArticleSet?.PubmedArticle?.[0]?.MedlineCitation?.Article?.Abstract?.AbstractText;

    const text = Array.isArray(abstractText) ? abstractText.join(" ") : (abstractText ?? "");

    cacheSet(key, text);
    return text;
  } catch (e) {
    const { logError } = await import("../error-monitor");
    logError(e, "api", { source: "pubmed-abstract", pmid });
    return "";
  }
}
