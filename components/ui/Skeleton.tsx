interface SkeletonProps {
  className?: string;
  count?: number;
  variant?: 'text' | 'circle' | 'rectangle';
}

export default function Skeleton({ className = '', count = 1, variant = 'text' }: SkeletonProps) {
  const variantClass = {
    text: 'h-4 w-full',
    circle: 'h-10 w-10 rounded-full',
    rectangle: 'h-24 w-full rounded-m3-md',
  };

  return (
    <div
      className="flex flex-col gap-m3-small"
      role="progressbar"
      aria-label="Loading content"
      aria-busy="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`skeleton ${variantClass[variant]} ${className}`} />
      ))}
    </div>
  );
}
