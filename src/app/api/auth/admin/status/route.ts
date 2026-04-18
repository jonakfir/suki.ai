import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminCookie, ADMIN_COOKIE_NAME } from "@/lib/admin-cookie";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const isAdmin = await verifyAdminCookie(raw);
  return NextResponse.json({ isAdmin });
}
