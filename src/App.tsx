import { useState } from 'react';
import { NotesProvider } from './context/NotesContext';
import { Layout } from './components/Layout';
import { NoteList } from './components/NoteList';
import { TagFilterBar } from './components/TagFilterBar';
import { NoteEditor } from './components/NoteEditor';

function App() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // TF-2는 "다른 태그로 갈아타기"만 한다. 같은 칩 재클릭 토글은 TF-3.
  const handleSelectTag = (tag: string) => setSelectedTag(tag);

  const handleSelectNote = (id: string) => {
    setSelectedNoteId(id);
    setIsCreating(false);
  };

  const handleNewNote = () => {
    setSelectedNoteId(null);
    setIsCreating(true);
  };

  const handleDone = () => {
    setIsCreating(false);
    // 저장 후 선택 상태는 유지
  };

  return (
    <NotesProvider>
      <Layout
        onNewNote={handleNewNote}
        sidebar={
          <>
            <TagFilterBar selectedTag={selectedTag} onSelectTag={handleSelectTag} />
            <NoteList
              selectedNoteId={selectedNoteId}
              selectedTag={selectedTag}
              onSelect={handleSelectNote}
            />
          </>
        }
        main={
          <NoteEditor selectedNoteId={selectedNoteId} isCreating={isCreating} onDone={handleDone} />
        }
      />
    </NotesProvider>
  );
}

export default App;
