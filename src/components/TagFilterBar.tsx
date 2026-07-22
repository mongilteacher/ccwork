import { useNotes } from '../context/NotesContext';
import { countTags } from '../domain/tagFilter';

// 사이드바 상단 태그 목록. 데이터는 NoteList와 같은 방식으로 Context에서 직접 당겨온다.
// TF-1 범위: 표시만. 클릭으로 강조하는 동작은 TF-2.
export function TagFilterBar() {
  const { notes, loading, error } = useNotes();

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
        {tagCounts.map(({ tag, count }) => (
          <button
            key={tag}
            type="button"
            className="bg-muted text-muted-foreground cursor-pointer rounded-full px-3 py-1 text-sm transition-opacity hover:opacity-75"
          >
            {tag} {count}
          </button>
        ))}
      </div>
    </div>
  );
}
