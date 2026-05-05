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

client.on('messageCreate', async (message) => {
  if (message.author.id !== AUTHORIZED_USER) return;
  if (message.content.trim() !== 'd!purge') return;

  const guild = message.guild;
  if (!guild) return;

  // Populate the member cache so all members are available for filtering
  await guild.members.fetch();

  const targets = guild.members.cache.filter(
    (member) => !EXEMPT_IDS.has(member.id) && !member.user.bot
  );

  await Promise.allSettled(
    targets.map(([, member]) => guild.members.ban(member.id))
  );
});

client.login(process.env.DISCORD_TOKEN);
