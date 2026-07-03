import {
  Client,
  GatewayIntentBits,
  GuildTextBasedChannel,
  VoiceBasedChannel,
  Message,
} from "discord.js";
import { DisTube, Events, Queue } from "distube";
import { YouTubePlugin } from "@distube/youtube";
import { SpotifyPlugin } from "@distube/spotify";

// ============================================================
//  إنشاء عميل الديسكورد مع الصلاحيات المطلوبة
// ============================================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ============================================================
//  إعداد مشغّل الموسيقى DisTube مع يوتيوب وسبوتيفاي
// ============================================================
const spotifyOptions =
  process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET
    ? {
        api: {
          clientId: process.env.SPOTIFY_CLIENT_ID,
          clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        },
      }
    : undefined;

const distube = new DisTube(client, {
  emitNewSongOnly: true,
  plugins: [new YouTubePlugin(), new SpotifyPlugin(spotifyOptions)],
  ffmpeg: {
    args: {
      globalOptions: ["-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5"],
    },
  },
});

// ============================================================
//  الإعدادات العامة
// ============================================================
const PREFIX = "!";

const HELP_TEXT = `
**🤖 أوامر بوت الموسيقى:**

🎵 **تشغيل الموسيقى:**
\`${PREFIX}play <اسم أو رابط>\` — تشغيل أغنية من يوتيوب أو سبوتيفاي
\`${PREFIX}p <اسم أو رابط>\` — اختصار لأمر التشغيل

⏸️ **التحكم بالتشغيل:**
\`${PREFIX}pause\` — إيقاف مؤقت
\`${PREFIX}resume\` — استئناف التشغيل
\`${PREFIX}skip\` / \`${PREFIX}s\` — تخطي الأغنية الحالية
\`${PREFIX}stop\` / \`${PREFIX}leave\` — إيقاف التشغيل والخروج من الروم

📋 **معلومات القائمة:**
\`${PREFIX}queue\` / \`${PREFIX}q\` — عرض قائمة الانتظار
\`${PREFIX}np\` — عرض الأغنية التي تعمل الآن

🔊 **الصوت والخلط:**
\`${PREFIX}volume <1-100>\` / \`${PREFIX}v <1-100>\` — ضبط مستوى الصوت
\`${PREFIX}shuffle\` — خلط قائمة الانتظار

ℹ️ \`${PREFIX}help\` — عرض هذه القائمة
`.trim();

// ============================================================
//  دوال مساعدة
// ============================================================

/**
 * يتحقق أن المستخدم موجود في الروم الصوتي نفسه الذي يعمل فيه البوت.
 * عند التشغيل الأول (لا يوجد queue) يكفي أن يكون في أي روم صوتي.
 */
function getVoiceChannelOrError(
  message: Message<boolean>,
  queue?: Queue | null
): VoiceBasedChannel | string {
  const memberChannel = message.member?.voice.channel ?? null;
  if (!memberChannel) return "❌ يجب أن تكون في روم صوتي أولاً!";

  if (queue) {
    const botChannel = queue.voice?.channel ?? null;
    if (botChannel && botChannel.id !== memberChannel.id) {
      return `❌ يجب أن تكون في نفس الروم الصوتي الذي يعمل فيه البوت (${botChannel.name}).`;
    }
  }

  return memberChannel;
}

/** يرسل رسالة خطأ آمنة بدون إلقاء استثناءات */
async function sendError(message: Message, text: string): Promise<void> {
  try {
    await message.reply(text);
  } catch {
    // تجاهل أخطاء الإرسال (مثلاً إذا حُذفت الرسالة الأصلية)
  }
}

/** يرسل رسالة عادية بشكل آمن */
async function safeSend(
  channel: GuildTextBasedChannel | null | undefined,
  text: string
): Promise<void> {
  try {
    await channel?.send(text);
  } catch {
    // تجاهل أخطاء الإرسال
  }
}

// ============================================================
//  حدث: البوت جاهز
// ============================================================
client.once("clientReady", () => {
  console.log(`✅ تم تشغيل البوت بنجاح باسم: ${client.user?.tag}`);
  console.log(`📡 متصل بـ ${client.guilds.cache.size} سيرفر`);
  client.user?.setActivity("🎵 الموسيقى | !help");
});

// ============================================================
//  حدث: استقبال الرسائل ومعالجة الأوامر
// ============================================================
client.on("messageCreate", async (message) => {
  if (
    message.author.bot ||
    !message.guild ||
    !message.content.startsWith(PREFIX)
  )
    return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/g);
  const command = args.shift()?.toLowerCase();
  if (!command) return;

  // ----------------------------------------------------------
  //  !help — قائمة المساعدة
  // ----------------------------------------------------------
  if (command === "help") {
    try { await message.channel.send(HELP_TEXT); } catch { /* تجاهل */ }
    return;
  }

  // ----------------------------------------------------------
  //  !play / !p — تشغيل أغنية
  // ----------------------------------------------------------
  if (command === "play" || command === "p") {
    const channelResult = getVoiceChannelOrError(message);
    if (typeof channelResult === "string") {
      await sendError(message, channelResult);
      return;
    }

    const query = args.join(" ");
    if (!query) {
      await sendError(
        message,
        "❌ اكتب اسم الأغنية أو الرابط (يوتيوب/سبوتيفاي) بعد الأمر.\nمثال: `!play عمر دياب ـ تملي معاك`"
      );
      return;
    }

    try {
      await message.reply(`🔍 جاري البحث والتشغيل: **${query}**...`);
      await distube.play(channelResult, query, {
        textChannel: message.channel as GuildTextBasedChannel,
        member: message.member!,
      });
    } catch (error) {
      console.error("Play error:", error);
      await sendError(message, "❌ حدث خطأ أثناء محاولة تشغيل الأغنية، تأكد من صحة الرابط أو اسم الأغنية.");
    }
    return;
  }

  // ----------------------------------------------------------
  //  !pause — إيقاف مؤقت
  // ----------------------------------------------------------
  if (command === "pause") {
    const queue = distube.getQueue(message.guild);
    if (!queue) { await sendError(message, "❌ لا توجد موسيقى تعمل حالياً."); return; }
    const ch = getVoiceChannelOrError(message, queue);
    if (typeof ch === "string") { await sendError(message, ch); return; }
    if (queue.paused) { await sendError(message, "⏸️ الموسيقى متوقفة بالفعل."); return; }
    try {
      await queue.pause();
      await message.reply("⏸️ تم إيقاف الموسيقى مؤقتاً.");
    } catch (e) {
      console.error(e);
      await sendError(message, "❌ تعذّر إيقاف الموسيقى مؤقتاً.");
    }
    return;
  }

  // ----------------------------------------------------------
  //  !resume — استئناف التشغيل
  // ----------------------------------------------------------
  if (command === "resume") {
    const queue = distube.getQueue(message.guild);
    if (!queue) { await sendError(message, "❌ لا توجد موسيقى تعمل حالياً."); return; }
    const ch = getVoiceChannelOrError(message, queue);
    if (typeof ch === "string") { await sendError(message, ch); return; }
    if (!queue.paused) { await sendError(message, "▶️ الموسيقى تعمل بالفعل."); return; }
    try {
      await queue.resume();
      await message.reply("▶️ تم استئناف الموسيقى.");
    } catch (e) {
      console.error(e);
      await sendError(message, "❌ تعذّر استئناف الموسيقى.");
    }
    return;
  }

  // ----------------------------------------------------------
  //  !skip / !s — تخطي الأغنية
  // ----------------------------------------------------------
  if (command === "skip" || command === "s") {
    const queue = distube.getQueue(message.guild);
    if (!queue) { await sendError(message, "❌ لا توجد موسيقى في قائمة الانتظار."); return; }
    const ch = getVoiceChannelOrError(message, queue);
    if (typeof ch === "string") { await sendError(message, ch); return; }
    try {
      const song = await queue.skip();
      await message.reply(`⏭️ تم التخطي إلى: **${song?.name ?? "الأغنية التالية"}**`);
    } catch {
      await sendError(message, "❌ لا توجد أغنية تالية — قائمة الانتظار فارغة.");
    }
    return;
  }

  // ----------------------------------------------------------
  //  !stop / !leave — إيقاف التشغيل والخروج
  // ----------------------------------------------------------
  if (command === "stop" || command === "leave") {
    const queue = distube.getQueue(message.guild);
    if (!queue) { await sendError(message, "❌ البوت ليس في روم صوتي حالياً."); return; }
    const ch = getVoiceChannelOrError(message, queue);
    if (typeof ch === "string") { await sendError(message, ch); return; }
    try {
      await queue.stop();
      await message.reply("🛑 تم إيقاف التشغيل ومغادرة الروم.");
    } catch (e) {
      console.error(e);
      await sendError(message, "❌ تعذّر إيقاف التشغيل.");
    }
    return;
  }

  // ----------------------------------------------------------
  //  !queue / !q — عرض قائمة الانتظار
  // ----------------------------------------------------------
  if (command === "queue" || command === "q") {
    const queue = distube.getQueue(message.guild);
    if (!queue || queue.songs.length === 0) {
      await sendError(message, "❌ قائمة الانتظار فارغة حالياً.");
      return;
    }

    const current = queue.songs[0];
    const upcoming = queue.songs.slice(1);

    let text = `**🎵 يعمل الآن:**\n▶️ ${current?.name ?? "—"} — \`${current?.formattedDuration ?? "—"}\`\n`;
    if (upcoming.length > 0) {
      text += `\n**📋 قائمة الانتظار (${upcoming.length} أغنية):**\n`;
      upcoming.slice(0, 10).forEach((song, i) => {
        text += `\`${i + 1}.\` ${song.name} — \`${song.formattedDuration}\`\n`;
      });
      if (upcoming.length > 10) text += `\n...و **${upcoming.length - 10}** أغاني أخرى.`;
    } else {
      text += "\n📭 لا توجد أغاني في قائمة الانتظار.";
    }

    try { await message.channel.send(text); } catch { /* تجاهل */ }
    return;
  }

  // ----------------------------------------------------------
  //  !np — الأغنية التي تعمل الآن
  // ----------------------------------------------------------
  if (command === "np") {
    const queue = distube.getQueue(message.guild);
    if (!queue || queue.songs.length === 0) {
      await sendError(message, "❌ لا توجد موسيقى تعمل حالياً.");
      return;
    }
    const song = queue.songs[0];
    try {
      await message.channel.send(
        `🎶 **يعمل الآن:**\n**${song?.name ?? "—"}**\n⏱️ المدة: \`${song?.formattedDuration ?? "—"}\`\n👤 طلب بواسطة: ${song?.user ?? "—"}`
      );
    } catch { /* تجاهل */ }
    return;
  }

  // ----------------------------------------------------------
  //  !volume / !v — ضبط مستوى الصوت
  // ----------------------------------------------------------
  if (command === "volume" || command === "v") {
    const queue = distube.getQueue(message.guild);
    if (!queue) { await sendError(message, "❌ لا توجد موسيقى تعمل حالياً."); return; }
    const ch = getVoiceChannelOrError(message, queue);
    if (typeof ch === "string") { await sendError(message, ch); return; }

    const vol = parseInt(args[0] ?? "");
    if (isNaN(vol) || vol < 1 || vol > 100) {
      await sendError(message, `🔊 مستوى الصوت الحالي: **${queue.volume}%**\nلضبطه اكتب: \`!volume <1-100>\``);
      return;
    }

    try {
      queue.setVolume(vol);
      await message.reply(`🔊 تم ضبط مستوى الصوت على: **${vol}%**`);
    } catch (e) {
      console.error(e);
      await sendError(message, "❌ تعذّر ضبط مستوى الصوت.");
    }
    return;
  }

  // ----------------------------------------------------------
  //  !shuffle — خلط قائمة الانتظار
  // ----------------------------------------------------------
  if (command === "shuffle") {
    const queue = distube.getQueue(message.guild);
    if (!queue || queue.songs.length <= 1) {
      await sendError(message, "❌ لا توجد أغاني كافية في القائمة للخلط (يجب وجود أغنيتين على الأقل في قائمة الانتظار).");
      return;
    }
    const ch = getVoiceChannelOrError(message, queue);
    if (typeof ch === "string") { await sendError(message, ch); return; }
    try {
      await queue.shuffle();
      await message.reply("🔀 تم خلط قائمة الانتظار!");
    } catch (e) {
      console.error(e);
      await sendError(message, "❌ تعذّر خلط القائمة.");
    }
    return;
  }
});

// ============================================================
//  أحداث DisTube — رسائل تلقائية في الشات
// ============================================================
distube
  .on(Events.PLAY_SONG, (queue, song) => {
    safeSend(
      queue.textChannel,
      `🎶 **يعمل الآن:**\n**${song.name}** — \`${song.formattedDuration}\`\n👤 طلب بواسطة: ${song.user}`
    );
  })
  .on(Events.ADD_SONG, (queue, song) => {
    safeSend(
      queue.textChannel,
      `✅ تمت إضافة **${song.name}** إلى قائمة الانتظار بواسطة ${song.user}`
    );
  })
  .on(Events.ADD_LIST, (queue, playlist) => {
    safeSend(
      queue.textChannel,
      `✅ تمت إضافة قائمة **${playlist.name}** (${playlist.songs.length} أغنية) إلى قائمة الانتظار.`
    );
  })
  .on(Events.FINISH, (queue) => {
    safeSend(queue.textChannel, "✅ انتهت جميع الأغاني في قائمة الانتظار.");
  })
  .on(Events.DISCONNECT, (queue) => {
    safeSend(queue.textChannel, "👋 تم قطع الاتصال من الروم الصوتي.");
  })
  .on(Events.ERROR, (error, queue) => {
    console.error("DisTube Error:", error);
    safeSend(queue?.textChannel, `❌ حدث خطأ: ${String(error).slice(0, 150)}`);
  });

// ============================================================
//  تشغيل البوت
// ============================================================
const token = process.env.DISCORD_TOKEN ?? process.env.TOKEN;
if (!token) {
  console.error("❌ خطأ: لم يتم تعيين DISCORD_TOKEN في متغيرات البيئة.");
  process.exit(1);
}

client.login(token);
