import type { ShareCardModule } from "../../types";
import { ContactsCard } from "./card";
import {
  computeContacts,
  computeContactsShareability,
  type ContactsCardProps,
} from "./compute";

export const contactsCard: ShareCardModule<ContactsCardProps> = {
  meta: {
    id: "contacts",
    title: "The Contacts",
    tagline: "Your phone book, uploaded to X",
    category: "headline",
    slug: "contacts",
  },
  compute: computeContacts,
  shareabilityScore: computeContactsShareability,
  Component: ContactsCard,
};
