"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Download, Users, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

type Lead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  campaignName: string;
  city: string | null;
  country: string | null;
  ipAddress: string | null;
  durationSeconds: number;
  trafficSource: string | null;
  utmCampaign: string | null;
};

const sourceLabels: Record<string, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
  organic_search: "Organic Search",
  organic_social: "Organic Social",
  direct: "Direct",
  other: "Other",
};

const statusStyles: Record<string, string> = {
  new: "bg-blue-50 text-blue-700",
  contacted: "bg-amber-50 text-amber-700",
  converted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-gray-100 text-gray-500",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [allSources, setAllSources] = useState<string[]>([]); // dynamic, derived from actual data
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.role === "admin"));
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (sourceFilter !== "all") params.set("source", sourceFilter);

    const res = await fetch(`/api/leads?${params.toString()}`);
    const data = await res.json();
    setLeads(data.leads || []);
    setSelected(new Set());
    setLoading(false);

    // Only recompute the available source list when unfiltered, so the
    // dropdown always reflects every source that's ever come in — not just
    // whatever matches the current filter (which would shrink the list).
    if (statusFilter === "all" && sourceFilter === "all" && !search) {
      const sources = Array.from(new Set((data.leads || []).map((l: Lead) => l.trafficSource || "direct")));
      setAllSources(sources as string[]);
    }
  }, [search, statusFilter, sourceFilter]);

  useEffect(() => {
    const timeout = setTimeout(fetchLeads, 300); // debounce search typing
    return () => clearTimeout(timeout);
  }, [fetchLeads]);

  async function updateStatus(id: string, status: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === leads.length ? new Set() : new Set(leads.map((l) => l.id))));
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} lead(s)? This cannot be undone.`)) return;

    await fetch("/api/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    });
    fetchLeads();
  }

  function exportToExcel(rows: Lead[], filenameSuffix: string) {
    const data = rows.map((r) => ({
      Name: r.name || "",
      Email: r.email || "",
      Phone: r.phone || "",
      Campaign: r.campaignName,
      Location: [r.city, r.country].filter(Boolean).join(", "),
      "IP Address": r.ipAddress || "",
      Source: sourceLabels[r.trafficSource || "direct"] || "Direct",
      "UTM Campaign": r.utmCampaign || "",
      "Time on Bot (s)": r.durationSeconds,
      Status: r.status,
      Date: new Date(r.createdAt).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");
    XLSX.writeFile(workbook, `leads-${filenameSuffix}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const rowsToExport = selected.size > 0 ? leads.filter((l) => selected.has(l.id)) : leads;
  const exportSuffix = selected.size > 0 ? "selected" : statusFilter === "all" && sourceFilter === "all" && !search ? "all" : "filtered";

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">{leads.length} lead{leads.length !== 1 ? "s" : ""} found</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && selected.size > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 bg-white border border-red-200 text-red-600 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} /> Delete ({selected.size})
            </button>
          )}
          <button
            onClick={() => exportToExcel(rowsToExport, exportSuffix)}
            className="flex items-center gap-2 bg-brand-gradient text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-card hover:opacity-90 transition-opacity"
          >
            <Download size={16} /> Export ({rowsToExport.length})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or phone..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="converted">Converted</option>
          <option value="rejected">Rejected</option>
        </select>

        {/* Dynamic — only shows sources that actually exist in this client's data */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="all">All sources</option>
          {allSources.map((s) => (
            <option key={s} value={s}>
              {sourceLabels[s] || s}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading...</p>}

      {!loading && leads.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-10 text-center">
          <Users className="mx-auto text-gray-300 mb-3" size={32} />
          <p className="text-sm text-gray-500">No leads match your filters.</p>
        </div>
      )}

      {!loading && leads.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500">
                <th className="p-3 w-8">
                  {isAdmin && (
                    <input
                      type="checkbox"
                      checked={selected.size === leads.length && leads.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  )}
                </th>
                <th className="p-3 font-medium">Contact</th>
                <th className="p-3 font-medium">Campaign</th>
                <th className="p-3 font-medium">Location</th>
                <th className="p-3 font-medium">IP Address</th>
                <th className="p-3 font-medium">Source</th>
                <th className="p-3 font-medium">Time on bot</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Date</th>
                {isAdmin && <th className="p-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {leads.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="p-3">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="rounded"
                      />
                    )}
                  </td>
                  <td className="p-3">
                    {r.email && <div>{r.email}</div>}
                    {r.phone && <div className="text-gray-500 text-xs">{r.phone}</div>}
                    {!r.email && !r.phone && "—"}
                  </td>
                  <td className="p-3">{r.campaignName}</td>
                  <td className="p-3">{[r.city, r.country].filter(Boolean).join(", ") || "—"}</td>
                  <td className="p-3 text-gray-500 text-xs">{r.ipAddress || "—"}</td>
                  <td className="p-3">
                    {sourceLabels[r.trafficSource || "direct"] || "Direct"}
                    {r.utmCampaign && <div className="text-gray-400 text-xs">{r.utmCampaign}</div>}
                  </td>
                  <td className="p-3">{r.durationSeconds}s</td>
                  <td className="p-3">
                    <select
                      value={r.status}
                      onChange={(e) => updateStatus(r.id, e.target.value)}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${statusStyles[r.status] || statusStyles.new}`}
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="converted">Converted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="p-3 text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
                  {isAdmin && (
                    <td className="p-3">
                      <button
                        onClick={async () => {
                          if (!confirm("Delete this lead?")) return;
                          await fetch("/api/leads", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ ids: [r.id] }),
                          });
                          fetchLeads();
                        }}
                        className="text-gray-300 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
