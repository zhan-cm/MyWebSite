import React, { useState, useRef, useEffect } from 'react';
import { 
    Plus, Trash2, Image as ImageIcon, Edit3, Eye, Layout, 
    FileText, Search, Download, CloudOff, 
    RefreshCcw, CheckCircle2, Loader2 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

const parseMarkdown = (text) => {
    if (!text) return { __html: '<p class="text-gray-500 italic opacity-50">等待灵感闪现...</p>' };
    let html = text
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-5 mb-2 text-indigo-400 font-sans">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-6 mb-3 text-indigo-300 border-b border-white/10 pb-2 font-sans">$1</h2>')
        .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-extrabold mt-8 mb-4 text-white font-sans">$1</h1>')
        .replace(/\*\*(.*)\*\*/gim, '<strong class="text-indigo-200">$1</strong>')
        .replace(/!\[(.*?)\]\((.*?)\)/gim, "<img alt='$1' src='$2' class='max-w-full h-auto rounded-lg my-4 shadow-[0_0_15px_rgba(99,102,241,0.3)] border border-white/10' />")
        .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-indigo-500 bg-indigo-500/10 pl-4 py-2 text-slate-300 my-4 rounded-r-md">$1</blockquote>')
        .replace(/\n/gim, '<br />');
    return { __html: html };
};

export default function NoteApp({ firebaseConfig }) {
    const [user, setUser] = useState(null);
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [editorTitle, setEditorTitle] = useState('');
    const [editorContent, setEditorContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [syncStatus, setSyncStatus] = useState('saved');
    const [viewMode, setViewMode] = useState('split');

    const saveTimeoutRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        signInAnonymously(auth);
        onAuthStateChanged(auth, (u) => setUser(u));

        if (user) {
            const q = query(collection(db, 'users', user.uid, 'notes'), orderBy('timestamp', 'desc'));
            return onSnapshot(q, (snapshot) => {
                const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setNotes(fetched);
                if (!activeNoteId && fetched.length > 0) {
                    setActiveNoteId(fetched[0].id);
                    setEditorTitle(fetched[0].title);
                    setEditorContent(fetched[0].content);
                }
            });
        }
    }, [user]);

    const handleUpdate = (field, value) => {
        if (field === 'title') setEditorTitle(value);
        if (field === 'content') setEditorContent(value);
        
        setSyncStatus('saving');
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        
        saveTimeoutRef.current = setTimeout(async () => {
            if (!user || !activeNoteId) return;
            const db = getFirestore();
            await setDoc(doc(db, 'users', user.uid, 'notes', activeNoteId), {
                title: field === 'title' ? value : editorTitle,
                content: field === 'content' ? value : editorContent,
                timestamp: Date.now()
            }, { merge: true });
            setSyncStatus('saved');
        }, 800);
    };

    if (!user) return <div className="h-96 flex items-center justify-center text-indigo-400"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex h-[85vh] bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* 侧边栏 */}
            <div className="w-64 border-r border-white/5 flex flex-col bg-black/20">
                <div className="p-4 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                        <input 
                            placeholder="搜索赛博记忆..." 
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-all"
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={() => {/* 新建逻辑 */}}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all"
                    >
                        <Plus size={16} /> 新建笔记
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2">
                    {notes.filter(n => n.title.includes(searchQuery)).map(note => (
                        <div 
                            key={note.id}
                            onClick={() => { setActiveNoteId(note.id); setEditorTitle(note.title); setEditorContent(note.content); }}
                            className={`p-3 mb-1 rounded-lg cursor-pointer transition-all ${activeNoteId === note.id ? 'bg-indigo-600/20 border border-indigo-500/50' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            <div className={`text-sm font-medium truncate ${activeNoteId === note.id ? 'text-indigo-300' : 'text-slate-400'}`}>
                                {note.title || '无标题'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 编辑主区 */}
            <div className="flex-1 flex flex-col bg-transparent">
                <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/10">
                    <input 
                        value={editorTitle}
                        onChange={e => handleUpdate('title', e.target.value)}
                        className="bg-transparent border-none text-lg font-bold text-white focus:outline-none w-1/2"
                    />
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                            {syncStatus === 'saving' ? <RefreshCcw size={12} className="text-indigo-400 animate-spin" /> : <CheckCircle2 size={12} className="text-emerald-400" />}
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest">{syncStatus === 'saving' ? 'Syncing' : 'Cloud Secure'}</span>
                        </div>
                        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                            <button onClick={() => setViewMode('edit')} className={`p-1.5 rounded ${viewMode === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Edit3 size={14} /></button>
                            <button onClick={() => setViewMode('split')} className={`p-1.5 rounded ${viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Layout size={14} /></button>
                            <button onClick={() => setViewMode('preview')} className={`p-1.5 rounded ${viewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Eye size={14} /></button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {(viewMode === 'edit' || viewMode === 'split') && (
                        <textarea 
                            ref={textareaRef}
                            value={editorContent}
                            onChange={e => handleUpdate('content', e.target.value)}
                            className="flex-1 bg-transparent p-8 resize-none focus:outline-none text-slate-300 font-mono text-sm leading-relaxed border-r border-white/5"
                            placeholder="在此输入 Markdown..."
                        />
                    )}
                    {(viewMode === 'preview' || viewMode === 'split') && (
                        <div className="flex-1 p-8 overflow-y-auto bg-black/5">
                            <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={parseMarkdown(editorContent)} />
                        </div>
                    )}
                </div>
                
                <div className="h-8 border-t border-white/5 bg-black/20 flex items-center justify-end px-6 text-[10px] text-slate-500 gap-4">
                    <span>CHARACTERS: {editorContent.length}</span>
                    <span className="text-indigo-500/50">ZHAN-CM OS V4.0</span>
                </div>
            </div>
        </div>
    );
}