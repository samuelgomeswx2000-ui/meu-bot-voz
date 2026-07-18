const http = require('http');
http.createServer((req, res) => res.end('Bot rodando!')).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');

const OWNER_ID = '1452103338177986620';
const CANAL_TICKET_ID = '1528065105390993408';
const PRODUTOS_FILE = './produtos.json';

let produtos = [];
if (fs.existsSync(PRODUTOS_FILE)) {
  produtos = JSON.parse(fs.readFileSync(PRODUTOS_FILE, 'utf8'));
}
function salvarProdutos() {
  fs.writeFileSync(PRODUTOS_FILE, JSON.stringify(produtos, null, 2));
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('ready', () => console.log(`Bot online como ${client.user.tag}`));

// Comando pra postar o painel com botão (rode manualmente 1 vez)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // !setuppainel -> posta a mensagem com botão no canal de compra
  if (message.content === '!setuppainel' && message.author.id === OWNER_ID) {
    const canal = await client.channels.fetch(CANAL_TICKET_ID);
    const embed = new EmbedBuilder()
      .setTitle('🛒 Loja')
      .setDescription('Clique no botão abaixo para abrir um ticket e ver os produtos.')
      .setColor(0x00ff88);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('abrir_ticket').setLabel('Abrir Ticket').setStyle(ButtonStyle.Success)
    );
    await canal.send({ embeds: [embed], components: [row] });
    return message.reply('Painel postado!');
  }

  // !paineledit add Nome | Preço | Link
  if (message.content.startsWith('!paineledit') && message.author.id === OWNER_ID) {
    const args = message.content.slice(11).trim();

    if (args.startsWith('add ')) {
      const partes = args.slice(4).split('|').map(p => p.trim());
      if (partes.length < 3) return message.reply('Formato: !paineledit add Nome | Preço | Link');
      produtos.push({ nome: partes[0], preco: partes[1], link: partes[2] });
      salvarProdutos();
      return message.reply(`Produto "${partes[0]}" adicionado!`);
    }

    if (args.startsWith('remove ')) {
      const nome = args.slice(7).trim();
      produtos = produtos.filter(p => p.nome.toLowerCase() !== nome.toLowerCase());
      salvarProdutos();
      return message.reply(`Produto "${nome}" removido!`);
    }

    if (args === 'list') {
      if (produtos.length === 0) return message.reply('Nenhum produto cadastrado.');
      const lista = produtos.map(p => `**${p.nome}** - ${p.preco}\n${p.link}`).join('\n\n');
      return message.reply(lista);
    }
  }

  // !painelv -> mostra produtos pra quem tá no ticket
  if (message.content === '!painelv') {
    if (produtos.length === 0) return message.reply('Nenhum produto disponível no momento.');
    const embed = new EmbedBuilder()
      .setTitle('🛒 Produtos disponíveis')
      .setDescription(produtos.map(p => `**${p.nome}** — ${p.preco}`).join('\n'))
      .setColor(0x00ff88)
      .setFooter({ text: 'Chame um responsável pra confirmar seu pagamento!' });
    return message.channel.send({ embeds: [embed] });
  }

  // !confirmar Nome @user
  if (message.content.startsWith('!confirmar') && message.author.id === OWNER_ID) {
    const mencionado = message.mentions.users.first();
    if (!mencionado) return message.reply('Menciona o usuário: !confirmar Nome @user');

    const nomeProduto = message.content.replace('!confirmar', '').replace(`<@${mencionado.id}>`, '').trim();
    const produto = produtos.find(p => p.nome.toLowerCase() === nomeProduto.toLowerCase());
    if (!produto) return message.reply('Produto não encontrado. Use !paineledit list pra ver os nomes certos.');

    const embed = new EmbedBuilder()
      .setTitle('🎉 Parabéns pela compra!')
      .setDescription(`**Produto:** ${produto.nome}\n**Download:** ${produto.link}\n\nConvidei 5 pessoas para ganhar 2 reais no servidor!`)
      .setColor(0x00ff88);

    return message.channel.send({ content: `${mencionado}`, embeds: [embed] });
  }
});

// Botão "Abrir Ticket"
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'abrir_ticket') return;

  const canalOriginal = interaction.channel;
  const nomeCanal = `ticket-${interaction.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '');

  const ticketExistente = interaction.guild.channels.cache.find(c => c.name === nomeCanal);
  if (ticketExistente) {
    return interaction.reply({ content: `Você já tem um ticket aberto: ${ticketExistente}`, ephemeral: true });
  }

  const canal = await interaction.guild.channels.create({
    name: nomeCanal,
    parent: canalOriginal.parentId || null,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
      { id: OWNER_ID, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
    ]
  });

  await canal.send(`Olá ${interaction.user}, bem-vindo! Use \`!painelv\` para ver os produtos.`);
  await interaction.reply({ content: `Ticket criado: ${canal}`, ephemeral: true });
});

client.login(process.env.DISCORD_TOKEN);
