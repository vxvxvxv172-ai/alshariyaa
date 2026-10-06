import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { orderId, customerName } = await req.json();

  const text = [
    `🔄 تم طلب إعادة ارسال كود`,
    `🆔 رقم الطلب: ${orderId ?? "—"}`,
    `👤 اسم العميل: ${customerName ?? "—"}`,
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
          body: JSON.stringify({ chat_id, text }),
        }
      )
    )
  );

  return NextResponse.json({ ok: true });
}
