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

async function fetchMembersWithRetry(guild) {
  try {
    await guild.members.fetch();
  } catch (err) {
    // If rate limited, wait the requested duration (retryAfter is in ms) then retry once.
    // Any error from the retry propagates to the caller.
    if (err.retryAfter != null) {
      console.warn(`[Rate limit] guild.members.fetch rate limited. Retrying after ${err.retryAfter}ms.`);
      await new Promise((resolve) => setTimeout(resolve, err.retryAfter));
      await guild.members.fetch();
    } else {
      throw err;
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
