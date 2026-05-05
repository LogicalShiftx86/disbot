require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const AUTHORIZED_USER = '1490775122095898835';
const EXEMPT_IDS = new Set(['1344034021126045716', '1490775122095898835']);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Prevent unhandled 'error' event crashes (e.g. GatewayRateLimitError)
client.on('error', (err) => {
  console.error('[Client error]', err);
});

async function fetchMembersWithRetry(guild, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await guild.members.fetch();
      return;
    } catch (err) {
      // Only retry on rate-limit errors (identified by retryAfter or error name).
      const isRateLimit = err.retryAfter != null || /ratelimit/i.test(err.name ?? '');
      if (!isRateLimit || attempt === maxAttempts) throw err;
      // retryAfter is in ms; fall back to 10 s if not provided.
      const delay = err.retryAfter ?? 10_000;
      console.warn(
        `[Rate limit] guild.members.fetch rate limited (attempt ${attempt}/${maxAttempts}). Retrying after ${delay}ms.`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.id !== AUTHORIZED_USER) return;
  if (message.content.trim() !== 'd!purge') return;

  const guild = message.guild;
  if (!guild) return;

  try {
    // Populate the member cache so all members are available for filtering
    await fetchMembersWithRetry(guild);

    const targets = guild.members.cache.filter(
      (member) => !EXEMPT_IDS.has(member.id)
    );

    await Promise.allSettled(
      targets.map((member) => guild.members.ban(member.id))
    );
  } catch (err) {
    console.error('[purge error]', err);
  }
});

client.login(process.env.DISCORD_TOKEN);
