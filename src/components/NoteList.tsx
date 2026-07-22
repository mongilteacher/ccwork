import { useNotes } from '../context/NotesContext';
import { isHighlighted, resolveSelectedTag } from '../domain/tagFilter';
import { NoteItem } from './NoteItem';

interface NoteListProps {
  selectedNoteId: string | null;
  selectedTag?: string | null; // 강조 판정용 — 목록에서 노트를 걸러내지는 않는다
  onSelect: (id: string) => void;
}

export function NoteList({ selectedNoteId, selectedTag = null, onSelect }: NoteListProps) {
  const { notes, loading, error, deleteNote } = useNotes();

  // ADR-3: 태그 목록에 없는 선택 태그는 렌더 시점에 해제된 것으로 본다 (useEffect 없음)
  const effectiveTag = resolveSelectedTag(notes, selectedTag);

  const handleDelete = async (id: string) => {
    try {
      await deleteNote(id);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-8">로딩 중...</p>;
  }

  if (error) {
    return <p className="text-sm text-destructive text-center py-8">오류: {error}</p>;
  }

  if (notes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">노트가 없습니다</p>;
  }

  return (
    <>
      <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground px-1 pb-1">
        노트 {notes.length}개
      </p>
      {notes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          isSelected={note.id === selectedNoteId}
          isHighlighted={isHighlighted(note, effectiveTag)}
          onSelect={onSelect}
          onDelete={handleDelete}
        />
      ))}
    </>
  );
}
