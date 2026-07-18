const http = require('http');
http.createServer((req, res) => res.end('Bot rodando!')).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const fs = require('fs');

const OWNER_ID = '1452103338177986620';
const FAMOSOS_FILE = './famosos.json';
const SPORTSDB = 'https://www.thesportsdb.com/api/v1/json/3';

let famosos = [];
if (fs.existsSync(FAMOSOS_FILE)) famosos = JSON.parse(fs.readFileSync(FAMOSOS_FILE, 'utf8'));
function salvarFamosos() { fs.writeFileSync(FAMOSOS_FILE, JSON.stringify(famosos, null, 2)); }

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('ready', () => console.log(`Bot online como ${client.user.tag}`));

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // !camisa 10 Brasil
  if (message.content.startsWith('!camisa ')) {
    const partes = message.content.slice(8).trim().split(' ');
    const numero = partes[0];
    const nomeTime = partes.slice(1).join(' ');

    if (!numero || !nomeTime) return message.reply('Use: !camisa (número) (time)');

    try {
      const buscaTime = await axios.get(`${SPORTSDB}/searchteams.php?t=${encodeURIComponent(nomeTime)}`);
      const time = buscaTime.data.teams?.[0];
      if (!time) return message.reply('Time não encontrado.');

      const jogadores = await axios.get(`${SPORTSDB}/lookup_all_players.php?id=${time.idTeam}`);
      const jogador = jogadores.data.player?.find(p => p.strNumber === numero);
      if (!jogador) return message.reply(`Não achei jogador com a camisa ${numero} nesse time (dado pode não estar cadastrado).`);

      const ultimoJogo = await axios.get(`${SPORTSDB}/eventslast.php?id=${time.idTeam}`);
      const evento = ultimoJogo.data.results?.[0];

      const embed = new EmbedBuilder()
        .setTitle(`${jogador.strPlayer} — #${numero}`)
        .setThumbnail(jogador.strCutout || jogador.strThumb || time.strTeamBadge)
        .addFields(
          { name: 'Time', value: time.strTeam, inline: true },
          { name: 'Posição', value: jogador.strPosition || 'N/A', inline: true },
          { name: 'Nacionalidade', value: jogador.strNationality || 'N/A', inline: true },
          { name: 'Nascimento', value: jogador.dateBorn || 'N/A', inline: true }
        )
        .setColor(0x00ff88);

      if (evento) {
        embed.addFields({
          name: 'Último jogo',
          value: `${evento.strHomeTeam} ${evento.intHomeScore} x ${evento.intAwayScore} ${evento.strAwayTeam} (${evento.dateEvent})`
        });
      }

      return message.channel.send({ embeds: [embed] });
    } catch (e) {
      console.log(e.message);
      return message.reply('Erro ao buscar dados. Tenta de novo em alguns segundos.');
    }
  }

  // !famoso add Nome | TikTok | Nascimento | Patrimônio | LinkFoto
  if (message.content.startsWith('!famoso add') && message.author.id === OWNER_ID) {
    const args = message.content.slice(12).trim().split('|').map(p => p.trim());
    if (args.length < 5) return message.reply('Use: !famoso add Nome | TikTok | Nascimento | Patrimônio | LinkFoto');
    famosos.push({ nome: args[0], tiktok: args[1], nascimento: args[2], patrimonio: args[3], foto: args[4] });
    salvarFamosos();
    return message.reply(`"${args[0]}" cadastrado!`);
  }

  // !famoso Nome
  if (message.content.startsWith('!famoso ') && !message.content.startsWith('!famoso add')) {
    const nome = message.content.slice(8).trim();
    const f = famosos.find(x => x.nome.toLowerCase() === nome.toLowerCase());
    if (!f) return message.reply('Não encontrado. Use !famoso add pra cadastrar.');

    const embed = new EmbedBuilder()
      .setTitle(f.nome)
      .setThumbnail(f.foto)
      .addFields(
        { name: 'TikTok', value: f.tiktok, inline: true },
        { name: 'Nascimento', value: f.nascimento, inline: true },
        { name: 'Patrimônio (estimado)', value: f.patrimonio, inline: true }
      )
      .setColor(0xff0088);
    return message.channel.send({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);
