import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMemberInvite } from "@/lib/email";
import { env } from "@/lib/env";

/**
 * Generate a Supabase invite link for a member and email it via Resend.
 * The member sets a password, the handle_new_user trigger creates their profile
 * (role=member), and linkMemberToProfile() wires the member row to it.
 */
export async function inviteMember(params: {
  memberId: string;
  email: string;
  fullName: string;
  gymName: string;
}) {
  const admin = createAdminClient();

  // The member sets a password, then lands in the onboarding wizard.
  const next = encodeURIComponent("/auth/set-password?next=/member/onboarding");
  const confirmUrl = (hashedToken: string, verificationType: string) =>
    `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm?token_hash=${hashedToken}&type=${verificationType}&next=${next}`;

  // Try an invite link (creates the auth user). If the user already exists,
  // fall back to a recovery (set-password) link.
  const invite = await admin.auth.admin.generateLink({
    type: "invite",
    email: params.email,
    options: { data: { role: "member", full_name: params.fullName } },
  });
  let props = invite.data?.properties ?? null;

  if (invite.error || !props?.hashed_token) {
    const recovery = await admin.auth.admin.generateLink({ type: "recovery", email: params.email });
    props = recovery.data?.properties ?? null;
  }

  if (!props?.hashed_token) {
    console.error("[invite] could not generate confirmation token for", params.email);
    return { sent: false };
  }

  await sendMemberInvite(params.email, params.fullName, params.gymName, confirmUrl(props.hashed_token, props.verification_type));
  return { sent: true };
}

/**
 * Link a just-authenticated member's auth user to their gym member row
 * (matched by email) and mark them active. Called from the auth callback.
 */
export async function linkMemberToProfile(userId: string, email: string) {
  const admin = createAdminClient();

  const { data: member } = await admin
    .from("members")
    .select("id, gym_id")
    .eq("email", email)
    .is("profile_id", null)
    .maybeSingle();
  if (!member) return;

  await admin
    .from("members")
    .update({ profile_id: userId, status: "active", joined_at: new Date().toISOString() })
    .eq("id", member.id);

  // sync_member_profile_link trigger stamps profiles.member_id + role,
  // but set it explicitly too in case the trigger is bypassed.
  await admin.from("profiles").update({ member_id: member.id, role: "member" }).eq("id", userId);
}
