import { useTagInput } from '../hooks/useTagInput';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const { value, handleChange, handleKeyDown, handleRemove } = useTagInput(tags, onChange);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm"
        >
          {tag}
          <button
            type="button"
            aria-label={`${tag} 삭제`}
            onClick={(e) => {
              e.stopPropagation();
              handleRemove(tag);
            }}
            className="text-muted-foreground hover:text-destructive cursor-pointer text-xs transition-colors"
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="태그 추가"
        className="bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50 flex-1 min-w-24"
      />
    </div>
  );
}
