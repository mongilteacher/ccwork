import { useNotes } from '../context/NotesContext';
import { countTags } from '../domain/tagFilter';
import { normalizeTag } from '../domain/tag';

interface TagFilterBarProps {
  selectedTag?: string | null;
  onSelectTag?: (tag: string) => void; // 인자는 칩의 "표기 태그"(TagCount.tag)
}

// 사이드바 상단 태그 목록. 데이터는 NoteList와 같은 방식으로 Context에서 직접 당겨온다.
export function TagFilterBar({ selectedTag = null, onSelectTag }: TagFilterBarProps) {
  const { notes, loading, error } = useNotes();

  // 선택 여부 판정 기준은 집계·강조와 동일하다(정규화 후 소문자 비교, ADR-4)
  const selectedKey = selectedTag === null ? null : normalizeTag(selectedTag).toLowerCase();

  // 집계할 노트가 없는 상태에서는 영역 자체를 그리지 않는다(빈 상태 문구도 없음)
  if (loading || error) return null;

  const tagCounts = countTags(notes);
  if (tagCounts.length === 0) return null;

  return (
    <div>
      {/* 섹션 라벨 */}
      <p className="text-muted-foreground px-1 pb-1 text-xs font-semibold tracking-widest uppercase">
        태그
      </p>

      {/* 태그 칩 목록 */}
      <div className="flex flex-wrap gap-1">
        {tagCounts.map(({ tag, count }) => {
          const isSelected =
            selectedKey !== null && normalizeTag(tag).toLowerCase() === selectedKey;
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectTag?.(tag)}
              className={`cursor-pointer rounded-full px-3 py-1 text-sm transition-colors ${
                isSelected ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
              }`}
            >
              {tag} {count}
            </button>
          );
        })}
      </div>
    </div>
  );
}
