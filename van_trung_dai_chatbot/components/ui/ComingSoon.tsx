export function ComingSoon({
  title,
  phase,
  description,
}: {
  title: string;
  phase: string;
  description: string;
}) {
  return (
    <div className="stack">
      <header className="page-header">
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <div className="panel">
        <span className="chip">{phase}</span>
        <p style={{ marginTop: "0.75rem" }}>
          Trang đã được tạo trong navigation. Tính năng đầy đủ sẽ có ở phase tiếp theo.
        </p>
      </div>
    </div>
  );
}
