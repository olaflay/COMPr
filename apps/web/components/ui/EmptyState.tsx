interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-m3-medium py-m3-xxx-large px-m3-large text-center">
      <div className="select-none" aria-hidden="true">{icon}</div>
      <div className="flex flex-col gap-m3-x-small items-center">
        <h3 className="text-title-large text-on-surface">{title}</h3>
        <p className="text-body-medium text-on-surface-variant max-w-sm leading-relaxed">{description}</p>
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-col items-center gap-m3-small mt-m3-x-small">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
