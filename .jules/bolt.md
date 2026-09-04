## 2024-05-30 - Added React.memo to prevent unnecessary re-renders
**Learning:** In a highly interactive app like this where components are composed together but don't depend on every prop change of their parents, `React.memo` can prevent a lot of wasted re-renders. This is particularly effective for components like sliders and UI strips.
**Action:** Apply `React.memo` to components like `BeforeAfterSlider`, `WhatsAppDemoStrip`, `WhatsAppStatusPreview`, `Toast`, and `ProcessingHistory`.
