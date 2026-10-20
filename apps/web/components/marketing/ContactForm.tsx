'use client';

import { useState } from 'react';

export default function ContactForm() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Name is required.';
    if (!formData.email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = 'Enter a valid email address.';
    if (!formData.message.trim()) errs.message = 'Message is required.';
    else if (formData.message.trim().length < 10) errs.message = 'Message must be at least 10 characters.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          message: formData.message,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Failed to send message.');
      }

      setIsSuccess(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
      setErrors({});
    } catch (err: any) {
      setErrors({ message: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = (field: string) =>
    `w-full bg-surface-container border rounded-m3-md p-m3-small text-body-large text-on-surface focus:border-primary focus:outline-none transition-colors duration-m3-short-2 ${errors[field] ? 'border-error' : 'border-outline-variant'}`;

  return (
    <div id="talk-to-us" className="w-full bg-surface-container-low border border-outline-variant rounded-m3-lg p-m3-large shadow-m3-1">
      {isSuccess ? (
        <div className="text-center flex flex-col items-center gap-m3-medium py-m3-large">
          <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 12 2 2 4-4" />
          </svg>
          <h3 className="text-title-large text-on-surface">Message sent</h3>
          <p className="text-body-medium text-on-surface-variant max-w-xs leading-normal">
            Thanks for reaching out. We will reply to the email you provided.
          </p>
          <button
            onClick={() => setIsSuccess(false)}
            className="mt-m3-x-small text-label-large text-primary hover:text-primary-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Send another message
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-m3-medium"
        >
          <div className="flex flex-col gap-m3-xx-small">
            <label htmlFor="contact-name" className="text-label-medium text-on-surface-variant font-medium">Your name</label>
            <input
              id="contact-name"
              type="text"
              value={formData.name}
              onChange={(e) => { setFormData({ ...formData, name: e.target.value }); if (errors.name) setErrors({ ...errors, name: '' }); }}
              className={fieldClass('name')}
              placeholder="Your name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'contact-name-error' : undefined}
            />
            {errors.name && <p id="contact-name-error" className="text-body-small text-error" role="alert">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-m3-xx-small">
            <label htmlFor="contact-email" className="text-label-medium text-on-surface-variant font-medium">Email address</label>
            <input
              id="contact-email"
              type="email"
              value={formData.email}
              onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (errors.email) setErrors({ ...errors, email: '' }); }}
              className={fieldClass('email')}
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'contact-email-error' : undefined}
            />
            {errors.email && <p id="contact-email-error" className="text-body-small text-error" role="alert">{errors.email}</p>}
          </div>

          <div className="flex flex-col gap-m3-xx-small">
            <label htmlFor="contact-subject" className="text-label-medium text-on-surface-variant font-medium">Subject</label>
            <input
              id="contact-subject"
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className={fieldClass('subject')}
              placeholder="What is this about?"
            />
          </div>

          <div className="flex flex-col gap-m3-xx-small">
            <label htmlFor="contact-message" className="text-label-medium text-on-surface-variant font-medium">Your message</label>
            <textarea
              id="contact-message"
              rows={4}
              value={formData.message}
              onChange={(e) => { setFormData({ ...formData, message: e.target.value }); if (errors.message) setErrors({ ...errors, message: '' }); }}
              className={`${fieldClass('message')} resize-none`}
              placeholder="Write your message here..."
              aria-invalid={!!errors.message}
              aria-describedby={errors.message ? 'contact-message-error' : undefined}
            />
            {errors.message && <p id="contact-message-error" className="text-body-small text-error" role="alert">{errors.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container disabled:bg-surface-container-highest disabled:text-on-surface-variant py-m3-small rounded-m3-full text-title-small transition-all duration-m3-medium-1 shadow-m3-1 disabled:shadow-none mt-m3-x-small flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {isSubmitting ? 'Sending...' : 'Send message'}
          </button>
        </form>
      )}
    </div>
  );
}
