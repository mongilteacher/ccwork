import { useTagInput } from '../hooks/useTagInput';
import { MAX_TAG_COUNT, type TagError } from '../domain/tag';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

// TagError → 한국어 문구 매핑은 UI 계층 책임(도메인은 코드만 반환, ADR-3·ADR-4)
const ERROR_MESSAGE: Record<TagError, string> = {
  tooLong: '태그는 20자까지 입력할 수 있습니다',
  tooMany: '태그는 최대 10개까지 추가할 수 있습니다',
  duplicate: '이미 추가된 태그입니다',
};

export function TagInput({ tags, onChange }: TagInputProps) {
  const { value, error, handleChange, handleKeyDown, handleRemove } = useTagInput(tags, onChange);
  const isFull = tags.length >= MAX_TAG_COUNT;

  return (
    <div>
      {/* 칩 목록 + 입력 필드 */}
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
          disabled={isFull}
          placeholder={isFull ? '태그는 최대 10개입니다' : '태그 추가'}
          className="bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50 flex-1 min-w-24"
        />
      </div>

      {/* 인라인 검증 안내 — 입력값이 바뀌면 사라진다(훅이 처리) */}
      {error && <p className="text-destructive text-xs mt-1">{ERROR_MESSAGE[error]}</p>}
    </div>
  );
}
