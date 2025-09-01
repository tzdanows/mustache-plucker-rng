import { Events, type MessageReaction, type User, type PartialMessageReaction, type PartialUser } from "../deps.ts";
import { logger } from "../utils/logger.ts";
import { addParticipant } from "../db/giveawayRepository.ts";

export default {
  name: Events.MessageReactionAdd,
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
        
        // Add participant to the giveaway
        const added = await addParticipant(messageId, userId);
        
        if (added) {
          logger.info(`User ${user.tag} entered giveaway on message ${messageId}`);
        }
      } catch (error) {
        logger.error("Failed to add participant:", error);
      }
    }
  },
};