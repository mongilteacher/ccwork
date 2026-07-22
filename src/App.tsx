import { useState } from 'react';
import { NotesProvider } from './context/NotesContext';
import { Layout } from './components/Layout';
import { NoteList } from './components/NoteList';
import { TagFilterBar } from './components/TagFilterBar';
import { NoteEditor } from './components/NoteEditor';
import { toggleSelectedTag } from './domain/tagFilter';

function App() {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // TF-3: 같은 칩을 다시 누르면 해제, 다른 칩이면 갈아타기 (판정은 도메인이 전담)
  const handleSelectTag = (tag: string) => setSelectedTag((prev) => toggleSelectedTag(prev, tag));

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
