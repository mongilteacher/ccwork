import { Note } from '../types/note';

interface NoteItemProps {
  note: Note;
  isSelected: boolean; // 지금 편집 중인 노트
  isHighlighted: boolean; // 선택 태그를 가진 노트
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NoteItem({ note, isSelected, isHighlighted, onSelect, onDelete }: NoteItemProps) {
  // 두 상태는 서로 다른 채널로 표현한다 — 동시에 켜져도 각각 읽힌다(AC 8).
  // 편집 중 = 배경 톤 이동(No-Line Rule), 강조 = 제목 굵기 상승.
  const surface = isSelected
    ? 'bg-muted'
    : isHighlighted
      ? 'bg-background'
      : 'bg-card hover:bg-background';

  return (
    <div
      data-selected={isSelected ? 'true' : undefined}
      data-highlighted={isHighlighted ? 'true' : undefined}
      onClick={() => onSelect(note.id)}
      className={`rounded-2xl p-4 cursor-pointer transition-colors ${surface}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className={`text-sm text-foreground line-clamp-1 flex-1 ${
            isHighlighted ? 'font-bold' : 'font-semibold'
          }`}
        >
          {note.title || '(제목 없음)'}
        </h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          className="text-muted-foreground hover:text-destructive text-xs shrink-0 transition-colors cursor-pointer"
        >
          삭제
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
        {note.content || '(내용 없음)'}
      </p>
      <p className="text-[10px] text-muted-foreground/70 mt-2">
        {new Date(note.updatedAt).toLocaleDateString('ko-KR')}
      </p>
    </div>
  );
}
