const http = require('http');
http.createServer((req, res) => res.end('Bot rodando!')).listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, entersState, VoiceConnectionStatus } = require('@discordjs/voice');
const Groq = require('groq-sdk');
const { MsEdgeTTS } = require('msedge-tts');
const fs = require('fs');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates]
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

client.on('ready', () => console.log(`Bot online como ${client.user.tag}`));

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!falar ')) return;

  const pergunta = message.content.slice(7);
  const canalVoz = message.member.voice.channel;
  if (!canalVoz) return message.reply('Entra num canal de voz primeiro!');

  const resposta = await groq.chat.completions.create({
    messages: [{ role: 'user', content: pergunta }],
    model: 'llama-3.3-70b-versatile'
  });
  const texto = resposta.choices[0].message.content;

  const tts = new MsEdgeTTS();
  await tts.setMetadata('pt-BR-AntonioNeural', MsEdgeTTS.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = await tts.toStream(texto);
  const chunks = [];
  for await (const chunk of audioStream) chunks.push(chunk);
  fs.writeFileSync('resposta.mp3', Buffer.concat(chunks));

  const connection = joinVoiceChannel({
    channelId: canalVoz.id,
    guildId: canalVoz.guild.id,
    adapterCreator: canalVoz.guild.voiceAdapterCreator
  });
  await entersState(connection, VoiceConnectionStatus.Ready, 20000);

  const player = createAudioPlayer();
  const resource = createAudioResource('resposta.mp3');
  connection.subscribe(player);
  player.play(resource);
});

client.login(process.env.DISCORD_TOKEN);
