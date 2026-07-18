const http = require('http');
http.createServer((req, res) => res.end('Bot rodando!')).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('ready', () => console.log(`Bot online como ${client.user.tag}`));

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!tiktok ')) {
    const usuario = message.content.slice(8).trim().replace('@', '');
    try {
      const resposta = await axios.get(`https://www.tiktok.com/@${usuario}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      const match = resposta.data.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.+?)<\/script>/);
      if (!match) return message.reply('Não consegui ler os dados desse perfil. Tenta de novo ou confere o @.');

      const json = JSON.parse(match[1]);
      const userDetail = json.__DEFAULT_SCOPE__['webapp.user-detail'];
      if (!userDetail || !userDetail.userInfo) return message.reply('Perfil não encontrado.');

      const { user, stats } = userDetail.userInfo;

      const embed = new EmbedBuilder()
        .setTitle(`@${user.uniqueId}`)
        .setDescription(user.signature || 'Sem bio')
        .setThumbnail(user.avatarLarger)
        .addFields(
          { name: 'Seguidores', value: String(stats.followerCount), inline: true },
          { name: 'Seguindo', value: String(stats.followingCount), inline: true },
          { name: 'Curtidas totais', value: String(stats.heartCount), inline: true },
          { name: 'Vídeos', value: String(stats.videoCount), inline: true }
        )
        .setURL(`https://www.tiktok.com/@${user.uniqueId}`)
        .setColor(0x000000);

      return message.channel.send({ embeds: [embed] });
    } catch (e) {
      console.log(e.message);
      return message.reply('Erro ao buscar esse perfil. O TikTok pode ter bloqueado temporariamente ou o @ tá errado.');
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
