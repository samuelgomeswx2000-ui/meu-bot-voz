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

  // !tiktok @usuario
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

  // !fip @user1 @user2
  if (message.content.startsWith('!fip ')) {
    const users = message.mentions.users;
    if (users.size < 2) return message.reply('Use: !fip @usuario1 @usuario2');

    const [user1, user2] = [...users.values()];

    const combinado = [user1.id, user2.id].sort().join('');
    let hash = 0;
    for (let i = 0; i < combinado.length; i++) hash = (hash * 31 + combinado.charCodeAt(i)) % 101;
    const porcentagem = hash;

    const blocosCheios = Math.round(porcentagem / 10);
    const barra = '🟩'.repeat(blocosCheios) + '⬜'.repeat(10 - blocosCheios);

    let emoji = '👍';
    if (porcentagem >= 70) emoji = '❤️';
    else if (porcentagem >= 40) emoji = '🤝';

    const embed = new EmbedBuilder()
      .setAuthor({ name: user1.username, iconURL: user1.displayAvatarURL() })
      .setTitle(`${user1.username} ${emoji} ${user2.username}`)
      .setThumbnail(user2.displayAvatarURL())
      .setDescription(`${barra}\n\n**${porcentagem}%** de compatibilidade`)
      .setColor(porcentagem >= 70 ? 0xff0088 : porcentagem >= 40 ? 0xffaa00 : 0x888888);

    return message.channel.send({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
