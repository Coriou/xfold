// ---------------------------------------------------------------------------
// IP analysis — classification, clustering, pattern detection
// ---------------------------------------------------------------------------

import type { IpAuditEntry } from "@/lib/archive/types";
import { parseDate } from "@/lib/format";

// --- Classification ---------------------------------------------------------

export function isIpv6(ip: string): boolean {
  return ip.includes(":");
}

export function isPrivateIp(ip: string): boolean {
  if (isIpv6(ip)) return false;
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4) return false;
  const [a, b] = parts as [number, number, number, number];
  // 10.0.0.0/8
  if (a === 10) return true;
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  return false;
}

export function isLoopback(ip: string): boolean {
  if (ip === "::1") return true;
  return ip.startsWith("127.");
}

export function classifyIp(
  ip: string,
): "private" | "public" | "loopback" | "ipv6" {
  if (isLoopback(ip)) return "loopback";
  if (isIpv6(ip)) return "ipv6";
  if (isPrivateIp(ip)) return "private";
  return "public";
}

/** Extract subnet prefix: /24 for IPv4, /48 for IPv6. */
export function getSubnet(ip: string): string {
  if (isIpv6(ip)) {
    return ip.split(":").slice(0, 3).join(":") + "::/48";
  }
  return ip.split(".").slice(0, 3).join(".") + ".0/24";
}

// --- Clustering -------------------------------------------------------------

export interface SubnetCluster {
  prefix: string;
  ips: Map<string, number>; // ip → login count
  totalLogins: number;
  firstSeen: string;
  lastSeen: string;
}

export function clusterBySubnet(entries: IpAuditEntry[]): SubnetCluster[] {
  const clusters = new Map<string, SubnetCluster>();

  for (const entry of entries) {
    const prefix = getSubnet(entry.loginIp);
    let cluster = clusters.get(prefix);
    if (!cluster) {
      cluster = {
        prefix,
        ips: new Map(),
        totalLogins: 0,
        firstSeen: entry.createdAt,
        lastSeen: entry.createdAt,
      };
      clusters.set(prefix, cluster);
    }

    cluster.ips.set(
      entry.loginIp,
      (cluster.ips.get(entry.loginIp) ?? 0) + 1,
    );
    cluster.totalLogins++;

    // Update date range
    if (entry.createdAt < cluster.firstSeen) cluster.firstSeen = entry.createdAt;
    if (entry.createdAt > cluster.lastSeen) cluster.lastSeen = entry.createdAt;
  }

  return [...clusters.values()].sort((a, b) => b.totalLogins - a.totalLogins);
}

// --- Timeline ---------------------------------------------------------------

export interface IpTimelineBucket {
  month: string; // YYYY-MM
  loginCount: number;
  uniqueIps: number;
  newIps: string[];
}

export function buildIpTimeline(entries: IpAuditEntry[]): IpTimelineBucket[] {
  const sorted = [...entries].sort((a, b) => {
    const da = parseDate(a.createdAt)?.getTime() ?? 0;
    const db = parseDate(b.createdAt)?.getTime() ?? 0;
    return da - db;
  });

  const seenIps = new Set<string>();
  const buckets = new Map<
    string,
    { loginCount: number; ips: Set<string>; newIps: string[] }
  >();

  for (const entry of sorted) {
    const d = parseDate(entry.createdAt);
    if (!d) continue;
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    let bucket = buckets.get(month);
    if (!bucket) {
      bucket = { loginCount: 0, ips: new Set(), newIps: [] };
      buckets.set(month, bucket);
    }

    bucket.loginCount++;
    bucket.ips.add(entry.loginIp);

    if (!seenIps.has(entry.loginIp)) {
      seenIps.add(entry.loginIp);
      bucket.newIps.push(entry.loginIp);
    }
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      loginCount: data.loginCount,
      uniqueIps: data.ips.size,
      newIps: data.newIps,
    }));
}

// --- New IP events ----------------------------------------------------------

export interface NewIpEvent {
  date: string;
  ip: string;
  subnet: string;
  type: ReturnType<typeof classifyIp>;
}

export function findNewIpEvents(entries: IpAuditEntry[]): NewIpEvent[] {
  const sorted = [...entries].sort((a, b) => {
    const da = parseDate(a.createdAt)?.getTime() ?? 0;
    const db = parseDate(b.createdAt)?.getTime() ?? 0;
    return da - db;
  });

  const seen = new Set<string>();
  const events: NewIpEvent[] = [];

  for (const entry of sorted) {
    if (!seen.has(entry.loginIp)) {
      seen.add(entry.loginIp);
      events.push({
        date: entry.createdAt,
        ip: entry.loginIp,
        subnet: getSubnet(entry.loginIp),
        type: classifyIp(entry.loginIp),
      });
    }
  }

  return events;
}

// --- Aggregation helpers ----------------------------------------------------

export interface IpStats {
  ip: string;
  subnet: string;
  type: ReturnType<typeof classifyIp>;
  loginCount: number;
  firstSeen: string;
  lastSeen: string;
}

export function aggregateIps(entries: IpAuditEntry[]): IpStats[] {
  const map = new Map<
    string,
    { count: number; firstSeen: string; lastSeen: string }
  >();

  for (const entry of entries) {
    const existing = map.get(entry.loginIp);
    if (!existing) {
      map.set(entry.loginIp, {
        count: 1,
        firstSeen: entry.createdAt,
        lastSeen: entry.createdAt,
      });
    } else {
      existing.count++;
      if (entry.createdAt < existing.firstSeen)
        existing.firstSeen = entry.createdAt;
      if (entry.createdAt > existing.lastSeen)
        existing.lastSeen = entry.createdAt;
    }
  }

  return [...map.entries()]
    .map(([ip, data]) => ({
      ip,
      subnet: getSubnet(ip),
      type: classifyIp(ip),
      loginCount: data.count,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
    }))
    .sort((a, b) => b.loginCount - a.loginCount);
}
