import { NextResponse } from "next/server";
import { resolveAuth } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PATCH /api/profile/face-photo
 *
 * Body: { face_photo_storage_path: string }
 *
 * Updates the user's face-photo pointer after a re-upload from the
 * `/skin-profile` page. Deletes the previous object from the
 * `face-photos` bucket so we don't accumulate orphans.
 *
 * Re-uploading invalidates the cached `skin_analysis_json` — the next
 * call to /api/skin-analysis will regenerate against the new photo.
 */

// `<uuid>/<filename>.<ext>` — same shape onboard/page.tsx uploads.
// We only accept paths under the caller's own user folder to prevent a
// malicious caller from pointing the profile at someone else's file.
const PATH_REGEX = /^[0-9a-f-]{8,40}\/[A-Za-z0-9_.-]+\.[a-z0-9]{2,5}$/;

export async function PATCH(request: Request) {
  const auth = await resolveAuth();
  if ("error" in auth) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    body && typeof body === "object" && "face_photo_storage_path" in body
      ? (body as { face_photo_storage_path?: unknown }).face_photo_storage_path
      : null;

  if (typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json(
      { error: "face_photo_storage_path must be a non-empty string" },
      { status: 400 }
    );
  }

  const newPath = raw.trim();
  if (!PATH_REGEX.test(newPath)) {
    return NextResponse.json(
      { error: "face_photo_storage_path has an unexpected shape." },
      { status: 400 }
    );
  }

  // For real users we require the path's owner-folder to equal the
  // caller's userId. Admin sessions can re-point the admin stub freely.
  if (!auth.isAdmin) {
    const folder = newPath.split("/", 1)[0];
    if (folder !== auth.userId) {
      return NextResponse.json(
        { error: "face_photo_storage_path must live under your own folder." },
        { status: 403 }
      );
    }
  }

  // Read the previous path so we can clean it up after the swap.
  const { data: existing } = await auth.supabase
    .from("users_profile")
    .select("face_photo_storage_path")
    .eq("user_id", auth.userId)
    .maybeSingle();

  const previousPath =
    (existing?.face_photo_storage_path as string | null) ?? null;

  const { error } = await auth.supabase
    .from("users_profile")
    .upsert(
      {
        user_id: auth.userId,
        face_photo_storage_path: newPath,
        // Invalidate the cached analysis — the next /api/skin-analysis
        // call will regenerate against the new photo.
        skin_analysis_json: null,
        skin_analysis_generated_at: null,
      },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Best-effort cleanup of the old object. Service-role client bypasses
  // RLS on Storage so we can remove any path under face-photos. If the
  // delete fails we don't surface it — the new pointer is already saved.
  if (previousPath && previousPath !== newPath) {
    try {
      const admin = createAdminClient();
      const rm = await admin.storage
        .from("face-photos")
        .remove([previousPath]);
      if (rm.error) {
        console.warn(
          "[face-photo] failed to remove previous object:",
          rm.error.message
        );
      }
    } catch (e) {
      console.warn(
        "[face-photo] storage cleanup threw:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  return NextResponse.json({
    success: true,
    face_photo_storage_path: newPath,
  });
}
