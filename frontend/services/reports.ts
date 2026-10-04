import { apiFetch, resolveMediaUrl } from './api';

export type ReportType = 'visit_photo' | 'avatar' | 'name';
export type ReportResolution = 'removed_photo' | 'removed_avatar' | 'renamed' | 'deleted_user' | 'dismissed';

export type ReportTarget =
  | { kind: 'photo'; photoId: number }
  | { kind: 'user'; userId: number; name: string; hasAvatar: boolean };

/** Reports content to the admins. Returns false when this user already reported the same thing. */
export async function reportContent(type: ReportType, target: ReportTarget, note: string): Promise<boolean> {
  const res = await apiFetch<{ data: { already_reported?: boolean } }>('reports', {
    method: 'POST',
    body: JSON.stringify({
      type,
      photo_id: target.kind === 'photo' ? target.photoId : undefined,
      user_id: target.kind === 'user' ? target.userId : undefined,
      note: note.trim() || undefined,
    }),
  });
  return !res.data?.already_reported;
}

// ---- Administration --------------------------------------------------------

export interface AdminReport {
  id: number;
  type: ReportType;
  reported_user_id: number;
  visits_photo_id: number | null;
  content_url: string | null;
  content_text: string | null;
  note: string | null;
  status: 'open' | 'resolved';
  resolution: ReportResolution | null;
  resolved_at: string | null;
  created_at: string;
  open_count: number;
  reporter: { id: number; name: string; email: string } | null;
  reported_user: { id: number; name: string; email: string; avatar_url: string | null; role: string } | null;
  photo: { id: number; photo_url: string; visit: { place: { name: string } | null } | null } | null;
}

export async function fetchReports(status: 'open' | 'resolved'): Promise<{ items: AdminReport[]; total: number }> {
  const res = await apiFetch<{ data: { items: AdminReport[]; total_items: number } }>(`reports?status=${status}`);
  const items = res.data.items.map((r) => ({
    ...r,
    content_url: r.content_url ? resolveMediaUrl(r.content_url) : null,
    reported_user: r.reported_user
      ? { ...r.reported_user, avatar_url: r.reported_user.avatar_url ? resolveMediaUrl(r.reported_user.avatar_url) : null }
      : null,
  }));
  return { items, total: res.data.total_items };
}

/** Closes the report together with every other open report about the same thing. */
export async function resolveReport(id: number, resolution: ReportResolution): Promise<void> {
  await apiFetch(`reports/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolution }) });
}

export async function deleteAvatar(userId: number): Promise<void> {
  await apiFetch(`users/${userId}/avatar`, { method: 'DELETE' });
}

export async function renameUser(userId: number, name: string): Promise<void> {
  await apiFetch(`users/${userId}`, { method: 'PATCH', body: JSON.stringify({ name }) });
}
