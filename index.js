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

async function buscarElenco(nomeTime, message) {
  try {
    const buscaTime = await axios.get(`${SPORTSDB}/searchteams.php?t=${encodeURIComponent(nomeTime)}`);
    const time = buscaTime.data.teams?.[0];
    if (!time) return message.reply('Time/seleção não encontrado. Tenta o nome em inglês se não achar em português (ex: Brazil em vez de Brasil).');

    const jogadores = await axios.get(`${SPORTSDB}/lookup_all_players.php?id=${time.idTeam}`);
    const lista = jogadores.data.player;
    if (!lista || lista.length === 0) return message.reply('Elenco não cadastrado na base pra esse time.');

    const elencoTexto = lista
      .slice(0, 30)
      .map(p => `${p.strNumber ? `#${p.strNumber} ` : ''}${p.strPlayer} — ${p.strPosition || 'N/A'}`)
      .join('\n');

    const embed = new EmbedBuilder()
      .setTitle(time.strTeam)
      .setThumbnail(time.strTeamBadge)
      .addFields(
        { name: 'Ano de fundação', value: time.intFormedYear || 'N/A', inline: true },
        { name: 'País', value: time.strCountry || 'N/A', inline: true },
        { name: `Elenco (${lista.length} jogadores)`, value: elencoTexto || 'N/A' }
      )
      .setColor(0x00ff88);

    return message.channel.send({ embeds: [embed] });
  } catch (e) {
    console.log(e.message);
    return message.reply('Erro ao buscar dados. Tenta de novo em alguns segundos.');
  }
}

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!time ')) {
    return buscarElenco(message.content.slice(6).trim(), message);
  }

  if (message.content.startsWith('!seleção ') || message.content.startsWith('!selecao ')) {
    const nome = message.content.replace('!seleção ', '').replace('!selecao ', '').trim();
    return buscarElenco(nome, message);
  }

  if (message.content.startsWith('!famoso add') && message.author.id === OWNER_ID) {
    const args = message.content.slice(12).trim().split('|').map(p => p.trim());
    if (args.length < 5) return message.reply('Use: !famoso add Nome | TikTok | Nascimento | Patrimônio | LinkFoto');
    famosos.push({ nome: args[0], tiktok: args[1], nascimento: args[2], patrimonio: args[3], foto: args[4] });
    salvarFamosos();
    return message.reply(`"${args[0]}" cadastrado!`);
  }

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
