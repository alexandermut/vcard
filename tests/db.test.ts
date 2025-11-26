import { describe, it, expect, beforeEach } from 'vitest';
import { addNote, getNotes, searchNotes, deleteNote, initDB } from '../utils/db';
import { Note } from '../types';

describe('Notes Database', () => {
    const mockNote: Note = {
        id: '1',
        timestamp: Date.now(),
        content: 'Meeting with Max Mustermann regarding the Berlin Project.',
        contactName: 'Max Mustermann',
        tags: ['work', 'important']
    };

    beforeEach(async () => {
        // Clear DB before each test
        const db = await initDB();
        await db.clear('notes');
    });

    it('should add and retrieve a note', async () => {
        await addNote(mockNote);
        const notes = await getNotes();
        expect(notes).toHaveLength(1);
        expect(notes[0].content).toBe(mockNote.content);
    });

    it('should search notes with single term', async () => {
        await addNote(mockNote);
        const results = await searchNotes('Berlin');
        expect(results).toHaveLength(1);
    });

    it('should search notes with multiple terms (AND logic)', async () => {
        await addNote(mockNote);
        // "Max" AND "Project" are both in the note
        const results = await searchNotes('Max Project');
        expect(results).toHaveLength(1);
    });

    it('should not find notes if one term is missing', async () => {
        await addNote(mockNote);
        // "Max" is there, but "Hamburg" is not
        const results = await searchNotes('Max Hamburg');
        expect(results).toHaveLength(0);
    });

    it('should search by tag', async () => {
        await addNote(mockNote);
        const results = await searchNotes('important');
        expect(results).toHaveLength(1);
    });

    it('should delete a note', async () => {
        await addNote(mockNote);
        await deleteNote('1');
        const notes = await getNotes();
        expect(notes).toHaveLength(0);
    });
});
