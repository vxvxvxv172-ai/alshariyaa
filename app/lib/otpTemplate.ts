export function otpEmailTemplate(otp: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>رمز التحقق</title>
</head>
<body style="margin:0;padding:32px 16px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;direction:rtl;color:#1a1a1a;">

  <p style="margin:0 0 8px;font-size:15px;">السلام عليكم،</p>
  <p style="margin:0 0 24px;font-size:15px;color:#444;">رمز التحقق الخاص بك هو:</p>

  <p style="margin:0 0 24px;font-size:32px;font-weight:700;letter-spacing:8px;direction:ltr;text-align:center;color:#0A1C29;">${otp}</p>

  <p style="margin:0 0 8px;font-size:13px;color:#888;">الرمز صالح لمدة 10 دقائق فقط.</p>
  <p style="margin:0;font-size:13px;color:#888;">إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.</p>

  <p style="margin:32px 0 0;font-size:13px;color:#aaa;border-top:1px solid #eee;padding-top:16px;">فريق الشريحة الموثوقة</p>

</body>
</html>`;
}
