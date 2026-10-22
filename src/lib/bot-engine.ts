/** Built-in OpenCircle bot command handler (pure logic, no server deps) */

export const SYSTEM_BOT_ID = "00000000-0000-0000-0000-0000000000b0";

const EIGHT_BALL = [
  "Yes.",
  "No.",
  "Maybe.",
  "Ask again later.",
  "Definitely.",
  "I wouldn't count on it.",
  "Absolutely.",
  "Signs point to yes.",
  "Outlook not so good.",
  "Without a doubt.",
];

export function parseCommand(content: string): { cmd: string; args: string } | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("!") && !trimmed.startsWith("/")) return null;
  const body = trimmed.slice(1).trim();
  const space = body.indexOf(" ");
  if (space === -1) return { cmd: body.toLowerCase(), args: "" };
  return {
    cmd: body.slice(0, space).toLowerCase(),
    args: body.slice(space + 1).trim(),
  };
}

export function runBuiltinCommand(
  cmd: string,
  args: string,
  ctx: {
    username: string;
    serverName?: string;
    isOwner?: boolean;
  }
): string | null {
  switch (cmd) {
    case "help":
      return [
        "**OpenCircle Bot** — prefix commands with `!` or `/`",
        "",
        "**Utility**",
        "`!help` — this list",
        "`!ping` — latency check",
        "`!serverinfo` — server name",
        "`!userinfo` — your info",
        "",
        "**Games**",
        "`!roll [NdN]` — dice (default 1d6)",
        "`!coinflip` — heads or tails",
        "`!8ball <question>` — magic 8-ball",
        "",
        "**AI**",
        "`!summarize` — use the Summarize button for full AI summaries",
        "",
        "**Moderation** (owner)",
        "`!purge <n>` — note: use message delete for now",
        "",
        "Build your own bot in the **Developer Portal** (bottom of sidebar).",
      ].join("\n");

    case "ping":
      return `Pong, ${ctx.username}! 🏓`;

    case "serverinfo":
      return ctx.serverName
        ? `**Server:** ${ctx.serverName}`
        : "You're not in a server context.";

    case "userinfo":
      return `**You:** ${ctx.username}${ctx.isOwner ? " · Server owner" : ""}`;

    case "coinflip":
    case "flip":
      return Math.random() < 0.5 ? "🪙 **Heads**" : "🪙 **Tails**";

    case "8ball":
    case "eightball": {
      if (!args) return "Ask a yes/no question: `!8ball will it work?`";
      const ans = EIGHT_BALL[Math.floor(Math.random() * EIGHT_BALL.length)];
      return `🎱 ${ans}`;
    }

    case "roll":
    case "dice": {
      let count = 1;
      let sides = 6;
      const m = args.match(/^(\d+)?d(\d+)$/i) || args.match(/^(\d+)$/);
      if (m) {
        if (m[2]) {
          count = Math.min(20, Math.max(1, parseInt(m[1] || "1", 10)));
          sides = Math.min(1000, Math.max(2, parseInt(m[2], 10)));
        } else {
          sides = Math.min(1000, Math.max(2, parseInt(m[1], 10)));
        }
      }
      const rolls: number[] = [];
      for (let i = 0; i < count; i++) {
        rolls.push(1 + Math.floor(Math.random() * sides));
      }
      const total = rolls.reduce((a, b) => a + b, 0);
      return count === 1
        ? `🎲 You rolled **${total}** (d${sides})`
        : `🎲 ${rolls.join(", ")} = **${total}** (${count}d${sides})`;
    }

    case "summarize":
      return "Use the **Summarize** button at the top of the channel for an AI summary of recent messages.";

    case "purge":
      return ctx.isOwner
        ? "Bulk purge isn't wired yet — delete messages individually or ask an admin."
        : "Only the server owner can use moderation commands.";

    default:
      return null;
  }
}
