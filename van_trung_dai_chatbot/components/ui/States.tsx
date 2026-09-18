export function LoadingBlock({ text = "Đang xử lý..." }: { text?: string }) {
  return <div className="state-box">{text}</div>;
}

export function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="state-box error">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="btn secondary" onClick={onRetry}>
          Thử lại
        </button>
      ) : null}
    </div>
  );
}

export function EmptyBlock({ text }: { text: string }) {
  return <div className="state-box muted">{text}</div>;
}
