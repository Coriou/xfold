import type { ComputeContext, ShareabilityScore } from "../../types";

export interface ContactsCardProps {
  readonly username: string;
  readonly contactCount: number;
  readonly emailCount: number;
  readonly phoneCount: number;
}

export function computeContacts(ctx: ComputeContext): ContactsCardProps | null {
  const contacts = ctx.archive.contacts;
  if (contacts.length === 0) return null;

  let emailCount = 0;
  let phoneCount = 0;
  for (const c of contacts) {
    emailCount += c.emails.length;
    phoneCount += c.phoneNumbers.length;
  }

  return {
    username: ctx.archive.meta.username,
    contactCount: contacts.length,
    emailCount,
    phoneCount,
  };
}

export function computeContactsShareability(
  props: ContactsCardProps,
): ShareabilityScore {
  const magnitude = Math.min(100, (props.contactCount / 1000) * 100);
  const specificity = Math.min(
    100,
    ((props.emailCount + props.phoneCount) / 1500) * 100,
  );
  // Very unique — most people forgot they uploaded contacts
  const uniqueness = 80;

  return { magnitude, specificity, uniqueness };
}
