interface TagInputProps {
  tags: string[];
}

export function TagInput({ tags }: TagInputProps) {
  // 빈 배열이면 아무것도 렌더하지 않는다 (빈 상태 문구도 없음)
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span key={tag} className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm">
          {tag}
        </span>
      ))}
    </div>
  );
}
