import { Phone } from 'lucide-react';
import { WhatsAppIcon } from './whatsapp-icon';

/** Call and WhatsApp, always one tap away (bottom right). */
export function FloatingContact({ phone, whatsapp }: { phone: string; whatsapp: string | null }) {
  const tel = phone.replace(/[^+\d]/g, '');
  const wa = (whatsapp ?? phone).replace(/\D/g, '');
  const text = encodeURIComponent('Hello Extreme Sales & Services, I need help with my AC.');

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col gap-3 sm:right-6 sm:bottom-6">
      <a
        href={`https://wa.me/${wa}?text=${text}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="inline-flex size-14 items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_8px_24px_-6px_rgb(8_60_30/0.5)] transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        <WhatsAppIcon size={28} />
      </a>
      <a
        href={`tel:${tel}`}
        aria-label={`Call us on ${phone}`}
        className="inline-flex size-14 items-center justify-center rounded-full bg-hero text-white shadow-[0_8px_24px_-6px_rgb(4_30_70/0.55)] transition-transform duration-150 hover:scale-105 active:scale-95"
      >
        <Phone aria-hidden="true" size={24} />
      </a>
    </div>
  );
}
