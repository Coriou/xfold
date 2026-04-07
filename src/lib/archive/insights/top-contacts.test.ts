import { describe, expect, it } from "vitest";
import { topContacts } from "@/lib/archive/insights/top-contacts";
import {
  buildSyntheticArchive,
  syntheticAccount,
  syntheticDMConversation,
  syntheticDMMessage,
  syntheticTweet,
} from "@/lib/archive/__fixtures/synthetic-archive";

describe("topContacts", () => {
  it("returns empty list when nothing relevant exists", () => {
    expect(topContacts(buildSyntheticArchive(), 5)).toEqual([]);
  });

  it("returns empty list when n <= 0", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount(),
      tweets: [
        syntheticTweet({
          mentions: [{ id: "2000", screenName: "alice", name: "Alice" }],
        }),
      ],
    });
    expect(topContacts(archive, 0)).toEqual([]);
    expect(topContacts(archive, -1)).toEqual([]);
  });

  it("ranks contacts by total interactions and slices to N", () => {
    const archive = buildSyntheticArchive({
      account: syntheticAccount({ accountId: "1000" }),
      tweets: [
        syntheticTweet({
          id: "t1",
          mentions: [{ id: "2000", screenName: "alice", name: "Alice" }],
        }),
        syntheticTweet({
          id: "t2",
          mentions: [{ id: "2000", screenName: "alice", name: "Alice" }],
        }),
        syntheticTweet({
          id: "t3",
          mentions: [{ id: "3000", screenName: "bob", name: "Bob" }],
        }),
      ],
      directMessages: [
        syntheticDMConversation({
          conversationId: "1000-2000",
          messages: [
            syntheticDMMessage({
              senderId: "1000",
              recipientId: "2000",
            }),
          ],
        }),
      ],
    });
    const top = topContacts(archive, 1);
    expect(top).toHaveLength(1);
    expect(top[0]?.accountId).toBe("2000");
  });
});
