# بوت الموسيقى العربي — Discord Music Bot

بوت ديسكورد للموسيقى يدعم يوتيوب وسبوتيفاي، بواجهة عربية كاملة.

## تشغيل البوت

- ابدأ workflow باسم **بوت الموسيقى (Discord)** من لوحة التحكم
- يتطلب متغير البيئة `DISCORD_TOKEN` (توكن البوت)
- اختياري: `SPOTIFY_CLIENT_ID` و `SPOTIFY_CLIENT_SECRET` لدعم سبوتيفاي

## إضافة التوكن

1. اذهب إلى **Secrets** في ريبلت
2. أضف `DISCORD_TOKEN` بقيمة توكن بوتك من [Discord Developer Portal](https://discord.com/developers/applications)
3. أضف `DISCORD_CLIENT_ID` (معرّف التطبيق)
4. اختياري: أضف `SPOTIFY_CLIENT_ID` و `SPOTIFY_CLIENT_SECRET` من [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

## الأوامر المتاحة

| الأمر | الوظيفة |
|-------|---------|
| `!play <اسم أو رابط>` / `!p` | تشغيل أغنية من يوتيوب أو سبوتيفاي |
| `!pause` | إيقاف مؤقت |
| `!resume` | استئناف التشغيل |
| `!skip` / `!s` | تخطي الأغنية |
| `!stop` / `!leave` | إيقاف التشغيل والخروج |
| `!queue` / `!q` | عرض قائمة الانتظار |
| `!np` | الأغنية التي تعمل الآن |
| `!volume <1-100>` / `!v` | ضبط مستوى الصوت |
| `!shuffle` | خلط قائمة الانتظار |
| `!help` | عرض قائمة الأوامر |

## البنية التقنية

- pnpm workspaces، Node.js 24، TypeScript 5.9
- discord.js v14 — عميل الديسكورد
- DisTube v5 — مشغّل الموسيقى
- @distube/youtube — دعم يوتيوب
- @distube/spotify — دعم سبوتيفاي
- tsx — تشغيل TypeScript مباشرة

## هيكل الملفات

```
artifacts/discord-bot/
├── package.json
├── tsconfig.json
└── src/
    └── index.ts   ← الكود الرئيسي للبوت
```

## User preferences

- اللغة العربية في جميع رسائل وأوامر البوت
