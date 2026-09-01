interface LoadingSpinnerProps {
  size?: 'sm' | 'lg';
}

export default function LoadingSpinner({ size = 'lg' }: LoadingSpinnerProps) {
  if (size === 'sm') {
    return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />;
  }
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
