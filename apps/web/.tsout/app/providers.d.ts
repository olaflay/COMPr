export declare function PostHogProvider({ children }: {
    children: React.ReactNode;
}): import("react").JSX.Element;
export declare function trackEvent(event: string, properties?: Record<string, unknown>): void;
export declare function identifyUser(distinctId: string, properties?: Record<string, unknown>): void;
export declare function resetUser(): void;
//# sourceMappingURL=providers.d.ts.map