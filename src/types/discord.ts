import type {
  ChatInputCommandInteraction,
  Client,
  Collection,
  CommandInteraction,
  PermissionResolvable,
  SlashCommandBuilder,
} from "../deps.ts";

export interface SlashCommand {
  data: SlashCommandBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  permissions?: PermissionResolvable[];
  guildOnly?: boolean;
}

export interface BotClient extends Client {
  commands: Collection<string, SlashCommand>;
}

export interface GiveawayData {
  id: string;
  guild_id: string;
  channel_id: string;
  message_id?: string;
  creator_id: string;
  item_name: string;
  item_quantity: number;
  item_price?: string;
  winner_count: number;
  ends_at: Date;
  status: "active" | "ended" | "cancelled";
  created_at?: Date;
  updated_at?: Date;
}

export interface Participant {
  giveaway_id: string;
  user_id: string;
  entered_at: Date;
}

export interface Winner {
  giveaway_id: string;
  user_id: string;
  position: number;
  selected_at: Date;
}
