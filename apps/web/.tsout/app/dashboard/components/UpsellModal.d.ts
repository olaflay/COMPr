interface UpsellModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClaimBonus: () => void;
    upsell: {
        anchorLine: string;
        priceLine: string;
        ctaLabel: string;
    };
}
export default function UpsellModal({ isOpen, onClose, onClaimBonus, upsell, }: UpsellModalProps): import("react").JSX.Element | null;
export {};
//# sourceMappingURL=UpsellModal.d.ts.map