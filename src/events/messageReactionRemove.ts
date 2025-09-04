import {
  Events,
  type MessageReaction,
  type PartialMessageReaction,
  type PartialUser,
  type User,
} from "../deps.ts";
import { logger } from "../utils/logger.ts";
import { removeParticipant } from "../db/giveawayRepository.ts";

export default {
  name: Events.MessageReactionRemove,
  async execute(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    // Ignore bot reactions
    if (user.bot) return;

    // Fetch partial data if needed
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        logger.error("Failed to fetch partial reaction:", error);
        return;
      }
    }

    // Check if this reaction is for a giveaway
    if (reaction.emoji.name === "🌙") {
      try {
        const messageId = reaction.message.id;
        const userId = user.id;

        // Remove participant from the giveaway
        const removed = await removeParticipant(messageId, userId);

        if (removed) {
          logger.info(`User ${user.tag} left giveaway on message ${messageId}`);
        }
      } catch (error) {
        logger.error("Failed to remove participant:", error);
      }
    }
  },
};
