import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { whoAdapter } from "@/lib/ingestion/adapters/who-adapter";
import { niceAdapter } from "@/lib/ingestion/adapters/nice-adapter";
import { cdcAdapter } from "@/lib/ingestion/adapters/cdc-adapter";

function mockFetch(data: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => data,
      text: async () => (typeof data === "string" ? data : JSON.stringify(data)),
    }),
  );
}

function mockFetchSequential(responses: Array<{ data: unknown; ok?: boolean; status?: number }>) {
  let callIndex = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async () => {
      const res = responses[Math.min(callIndex++, responses.length - 1)];
      return {
        ok: res.ok ?? true,
        status: res.status ?? 200,
        json: async () => res.data,
        text: async () => (typeof res.data === "string" ? res.data : JSON.stringify(res.data)),
      };
    }),
  );
}

describe("WHO Adapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has correct metadata", () => {
    expect(whoAdapter.id).toBe("who");
    expect(whoAdapter.requiresApiKey).toBe(false);
    expect(whoAdapter.rateLimit).toBe(2);
  });

  it("searches and normalizes indicator data", async () => {
    mockFetch({
      value: [{ IndicatorCode: "MORT_100", IndicatorName: "Adult mortality rate" }],
    });

    mockFetchSequential([
      {
        data: {
          value: [
            {
              SpatialDim: "India",
              TimeDim: 2020,
              NumericValue: 123.4,
              Low: 110.0,
              High: 140.0,
              Value: "123.4",
            },
          ],
        },
      },
    ]);

    const result = await whoAdapter.search({ term: "mortality", limit: 5 });
    expect(result.sourceId).toBe("who");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].sourceId).toBe("who");
    expect(result.items[0].sourceName).toBe("World Health Organization");
    expect(result.items[0].year).toBe(2020);
  });

  it("healthCheck succeeds when API is reachable", async () => {
    mockFetch({ value: [] });
    const healthy = await whoAdapter.healthCheck();
    expect(healthy).toBe(true);
  });

  it("healthCheck fails on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const healthy = await whoAdapter.healthCheck();
    expect(healthy).toBe(false);
  });
});

describe("NICE Adapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has correct metadata", () => {
    expect(niceAdapter.id).toBe("nice");
    expect(niceAdapter.requiresApiKey).toBe(false);
    expect(niceAdapter.rateLimit).toBe(2);
  });

  it("searches and normalizes guidance documents", async () => {
    mockFetch({
      totalResults: 2,
      documents: [
        {
          id: "CG181",
          title: "Hypertension in adults: diagnosis and management",
          type: "Guidance",
          published: "2019-08-29",
          lastUpdated: "2022-01-01",
          documentType: "clinical guideline",
          topics: [{ name: "Cardiovascular diseases" }],
          url: "/cg181",
        },
        {
          id: "TA583",
          title: "Rivaroxaban for preventing stroke",
          type: "Technology appraisal",
          published: "2018-06-01",
          lastUpdated: null,
          documentType: "technology appraisal",
          topics: [{ name: "Stroke" }],
          url: "/ta583",
        },
      ],
    });

    const result = await niceAdapter.search({ term: "hypertension", limit: 10 });
    expect(result.sourceId).toBe("nice");
    expect(result.items.length).toBe(2);
    expect(result.items[0].title).toBe("Hypertension in adults: diagnosis and management");
    expect(result.items[0].id).toBe("NICE-CG181");
    expect(result.items[0].sourceId).toBe("nice");
    expect(result.items[0].year).toBe(2019);
    expect(result.items[0].conditions).toEqual(["Cardiovascular diseases"]);
  });

  it("returns empty on API failure", async () => {
    mockFetch(null, false, 500);
    const result = await niceAdapter.search({ term: "test", limit: 5 });
    expect(result.items).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("healthCheck succeeds", async () => {
    mockFetch({ totalResults: 0, documents: [] });
    const healthy = await niceAdapter.healthCheck();
    expect(healthy).toBe(true);
  });
});

describe("CDC Adapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has correct metadata", () => {
    expect(cdcAdapter.id).toBe("cdc");
    expect(cdcAdapter.requiresApiKey).toBe(false);
    expect(cdcAdapter.rateLimit).toBe(1);
  });

  it("search returns items from MMWR", async () => {
    // Mock WONDER POST response (no data)
    mockFetchSequential([
      { data: "<html><table><tr><td>No data</td></tr></table></html>" },
      // Mock MMWR search response
      {
        data: `<html>
          <div class="results">
            <h3><a href="/mmwr/volumes/72/wr/mm7215a1.htm">COVID-19 Vaccination Coverage</a></h3>
            <h3><a href="/mmwr/volumes/72/wr/mm7214a2.htm">Influenza Surveillance Report</a></h3>
          </div>
        </html>`,
      },
    ]);

    const result = await cdcAdapter.search({ term: "vaccination", limit: 10 });
    expect(result.sourceId).toBe("cdc");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].sourceId).toBe("cdc");
  });

  it("healthCheck succeeds", async () => {
    mockFetch(null, true, 200);
    const healthy = await cdcAdapter.healthCheck();
    expect(healthy).toBe(true);
  });

  it("healthCheck fails on error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const healthy = await cdcAdapter.healthCheck();
    expect(healthy).toBe(false);
  });
});
