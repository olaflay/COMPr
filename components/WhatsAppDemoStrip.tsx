/* eslint-disable @next/next/no-img-element */
'use client';

import { memo } from 'react';

const SAMPLE_IMAGE = '/water.jpg';

const WhatsAppDemoStrip = memo(function WhatsAppDemoStrip() {
  return (
    <section aria-label="What WhatsApp does versus NoBlur" className="flex flex-col gap-m3-x-small">
      <h3 className="text-label-medium text-on-surface-variant">What WhatsApp does vs NoBlur</h3>
      <div className="grid grid-cols-2 gap-m3-x-small">
        <figure className="flex flex-col gap-m3-xx-small m-0">
          <figcaption className="text-label-small text-on-surface-variant">WhatsApp send</figcaption>
          <div className="relative overflow-hidden rounded-m3-md border border-outline bg-surface-container h-16 sm:h-20">
            <img
              src={SAMPLE_IMAGE}
              alt="Sample photo the way WhatsApp normally sends it, soft and compressed"
              className="w-full h-full object-cover"
              style={{ filter: 'blur(2px) saturate(0.7)' }}
              draggable={false}
            />
          </div>
        </figure>
        <figure className="flex flex-col gap-m3-xx-small m-0">
          <figcaption className="text-label-small text-primary font-medium">NoBlur send</figcaption>
          <div className="relative overflow-hidden rounded-m3-md border border-primary/40 bg-surface-container h-16 sm:h-20">
            <img
              src={SAMPLE_IMAGE}
              alt="The same sample photo kept sharp and small with NoBlur"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        </figure>
      </div>
      <p className="text-body-small text-on-surface-variant text-center">Same file. Different result.</p>
    </section>
  );
});

export default WhatsAppDemoStrip;
