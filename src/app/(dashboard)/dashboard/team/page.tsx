"use client";

import { useEffect, useState } from "react";
import { UserPlus, Trash2, Shield, Eye } from "lucide-react";
import { useToast } from "@/lib/toast";

type Member = { id: string; name: string; email: string; role: string; createdAt: string };

export default function TeamPage() {
  const toast = useToast();
  const [role, setRole] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setRole(d.role));
    fetchMembers();
  }, []);

  function fetchMembers() {
    fetch("/api/team")
      .then((r) => r.json())
      .then((d) => setMembers(d.members || []));
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const toastId = toast.show("Inviting team member...", "loading");

    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role: memberRole }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      const msg = data.error?.formErrors?.join(", ") || data.error || "Failed to invite";
      setError(msg);
      toast.update(toastId, msg, "error");
      return;
    }

    toast.update(toastId, "Team member invited successfully", "success");
    setName("");
    setEmail("");
    setPassword("");
    fetchMembers();
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this team member?")) return;
    const toastId = toast.show("Removing team member...", "loading");
    await fetch(`/api/team/${id}`, { method: "DELETE" });
    toast.update(toastId, "Team member removed", "success");
    fetchMembers();
  }

  if (role === "member") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-8 text-center max-w-md mx-auto mt-12">
        <Shield className="mx-auto text-gray-300 mb-3" size={32} />
        <p className="text-sm text-gray-500">Team management is only available to admins.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Team</h1>
      <p className="text-sm text-gray-500 mb-6">
        Invite teammates to view leads and update statuses. Members can't delete leads, manage campaigns,
        or invite others.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Invite a team member</h3>
        <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <input
            type="password"
            placeholder="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
          <select
            value={memberRole}
            onChange={(e) => setMemberRole(e.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="member">Member (view + update status only)</option>
            <option value="admin">Admin (full access)</option>
          </select>
          {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-brand-gradient text-white text-sm font-medium py-2.5 rounded-xl sm:col-span-2 hover:opacity-90 transition-opacity"
          >
            <UserPlus size={15} /> {loading ? "Inviting..." : "Invite"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-card overflow-hidden">
        {members.length === 0 ? (
          <p className="text-sm text-gray-400 p-5">No team members yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-medium text-sm">
                    {m.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{m.name}</div>
                    <div className="text-xs text-gray-400">{m.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    {m.role === "admin" ? <Shield size={12} /> : <Eye size={12} />}
                    {m.role}
                  </span>
                  <button onClick={() => handleRemove(m.id)} className="text-gray-300 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
