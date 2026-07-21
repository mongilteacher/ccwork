import { useTagInput } from '../hooks/useTagInput';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export function TagInput({ tags, onChange }: TagInputProps) {
  const { value, handleChange, handleKeyDown } = useTagInput(tags, onChange);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((tag) => (
        <span key={tag} className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm">
          {tag}
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
