import Image from "next/image";
import { FaWhatsapp, FaMobileAlt, FaEnvelope } from "react-icons/fa";
import { getCompany } from "../lib/getCompany";

export default async function Footer() {
  const c = await getCompany();

  return (
    <footer dir="rtl" className="mt-16 border-t border-gray-200" style={{ background: "#F3F4F6" }}>

      <div className="max-w-6xl mx-auto px-5 pt-12 pb-8">

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

          {/* Brand */}
          <div className="flex flex-col gap-4">
            <Image src="/logo.webp" alt="logo" width={72} height={72} className="object-contain" />
            <p className="text-sm leading-7 text-gray-600 whitespace-pre-line">
              {c.details || "الشريحة الموثوقة - شرائح اتصال وإنترنت بأسعار منافسة، مع خدمة سريعة وآمنة ودعم عملاء مميز. ثقتكم غايتنا وخدمتكم أولويتنا"}
            </p>
            <div className="flex items-center gap-3">
              <Image src="/commerce.webp" alt="السجل التجاري" width={40} height={40} className="object-contain rounded-md shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-700">السجل التجاري</span>
                <span className="text-xs text-gray-500 font-mono" dir="ltr">7055339530</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Image src="/work.webp" alt="شهادة توثيق" width={40} height={40} className="object-contain rounded-md shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-700">شهادة توثيق</span>
                <span className="text-xs text-gray-500">مركز الاعمال</span>
                <span className="text-xs text-gray-500 font-mono" dir="ltr">0000331902</span>
              </div>
            </div>
          </div>

          {/* Contact details */}
          <div className="flex flex-col gap-4">
            <h3 className="text-base font-bold text-black">تواصل معنا</h3>

            <ul className="flex flex-col gap-3">
              {c.whatsapp && (
                <li>
                  <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-black transition-colors">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl border border-gray-200 shrink-0">
                      <FaWhatsapp size={14} className="text-black" />
                    </span>
                    <span dir="ltr">{c.whatsapp}</span>
                  </a>
                </li>
              )}
              {c.phone && (
                <li>
                  <a href={`tel:${c.phone}`}
                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-black transition-colors">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl border border-gray-200 shrink-0">
                      <FaMobileAlt size={14} className="text-black" />
                    </span>
                    <span dir="ltr">{c.phone}</span>
                  </a>
                </li>
              )}
              {c.email && (
                <li>
                  <a href={`mailto:${c.email}`}
                    className="flex items-center gap-3 text-sm text-gray-600 hover:text-black transition-colors">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl border border-gray-200 shrink-0">
                      <FaEnvelope size={14} className="text-black" />
                    </span>
                    <span dir="ltr">{c.email}</span>
                  </a>
                </li>
              )}
            </ul>

            <a href="/qema.pdf" target="_blank" rel="noreferrer" className="shrink-0 self-start">
              <Image
                src="/شعار ضريبة القيمة المضافة بدقة عالية svg - png (1).png"
                alt="شهادة ضريبة القيمة المضافة"
                width={200}
                height={200}
                className="rounded-lg h-auto w-auto max-h-20 md:max-h-24 hover:opacity-80 transition-opacity"
              />
            </a>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gray-200 mb-6" />

        {/* Bottom bar */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400">
              صنع بإتقان على <span className="font-semibold text-gray-500">| 2026 منصة سلة</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Image src="/mada.svg" alt="mada" width={36} height={24} className="object-contain" style={{ height: "24px", width: "36px" }} />
            <Image src="/visa.webp" alt="visa" width={36} height={24} className="object-contain" style={{ height: "24px", width: "36px" }} />
            <Image src="/Apple-Pay-01.png" alt="apple pay" width={56} height={36} className="object-contain" style={{ height: "36px", width: "auto" }} />
            <Image src="/work.webp" alt="salla" width={36} height={24} className="object-contain" style={{ height: "24px", width: "auto" }} />
            <Image src="/commerce.webp" alt="salla" width={36} height={24} className="object-contain" style={{ height: "24px", width: "auto" }} />
          </div>
        </div>
      </div>
    </footer>
  );
}
