import React, { useState, useRef, useEffect } from 'react';
import { 
    Plus, Trash2, Image as ImageIcon, Edit3, Eye, Layout, 
    FileText, Search, Download, CloudOff, 
    RefreshCcw, CheckCircle2, Loader2, Lock, Globe 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

const parseMarkdown = (text) => { /* ...原样保留你之前的解析逻辑，不要删... */
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
    // 获取当前用户身份
    const role = typeof window !== 'undefined' ? sessionStorage.getItem("digital_garden_role") : 'guest';
    const isAdmin = role === 'admin';

    const [isDbReady, setIsDbReady] = useState(false);
    const [notes, setNotes] = useState([]);
    const [activeNoteId, setActiveNoteId] = useState(null);
    const [editorTitle, setEditorTitle] = useState('');
    const [editorContent, setEditorContent] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [syncStatus, setSyncStatus] = useState('saved');
    // 游客强制只能看预览模式
    const [viewMode, setViewMode] = useState(isAdmin ? 'split' : 'preview'); 

    const saveTimeoutRef = useRef(null);
    const textareaRef = useRef(null);

    // 核心更改 1：统一到一个全局的数据库集合
    const GLOBAL_COLLECTION = 'global_digital_garden';

    useEffect(() => {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        // 为了能读取数据库，游客也需要匿名登录获取读取权限
        signInAnonymously(auth).then(() => {
            setIsDbReady(true);
            const q = query(collection(db, GLOBAL_COLLECTION), orderBy('timestamp', 'desc'));
            
            return onSnapshot(q, (snapshot) => {
                let fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                
                // 核心更改 2：如果是游客，在前端过滤掉 private 的笔记
                if (!isAdmin) {
                    fetched = fetched.filter(n => n.isPublic === true);
                }
                
                setNotes(fetched);
                // 首次加载选中第一篇
                if (fetched.length > 0 && !activeNoteId) {
                    setActiveNoteId(fetched[0].id);
                    setEditorTitle(fetched[0].title);
                    setEditorContent(fetched[0].content);
                }
            });
        });
    }, [isAdmin, activeNoteId]);

    const handleUpdate = (field, value) => {
        if (!isAdmin || !activeNoteId) return; // 游客禁止修改
        
        if (field === 'title') setEditorTitle(value);
        if (field === 'content') setEditorContent(value);
        
        setSyncStatus('saving');
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        
        saveTimeoutRef.current = setTimeout(async () => {
            const db = getFirestore();
            const activeNote = notes.find(n => n.id === activeNoteId);
            await setDoc(doc(db, GLOBAL_COLLECTION, activeNoteId), {
                title: field === 'title' ? value : editorTitle,
                content: field === 'content' ? value : editorContent,
                isPublic: field === 'isPublic' ? value : (activeNote?.isPublic || false),
                timestamp: Date.now()
            }, { merge: true });
            setSyncStatus('saved');
        }, 800);
    };

    const createNote = async () => {
        if (!isAdmin) return;
        const db = getFirestore();
        const newNoteRef = doc(collection(db, GLOBAL_COLLECTION));
        await setDoc(newNoteRef, {
            title: '无标题笔记',
            content: '',
            isPublic: false, // 默认新建的是私密笔记
            timestamp: Date.now()
        });
        setActiveNoteId(newNoteRef.id);
        setEditorTitle('无标题笔记');
        setEditorContent('');
        setViewMode('edit');
    };

    const deleteNote = async (id) => {
        if (!isAdmin) return;
        const db = getFirestore();
        await deleteDoc(doc(db, GLOBAL_COLLECTION, id));
        if (activeNoteId === id) {
            setActiveNoteId(null);
            setEditorTitle('');
            setEditorContent('');
        }
    };

    if (!isDbReady) return <div className="h-96 flex items-center justify-center text-indigo-400"><Loader2 className="animate-spin" /></div>;

    const activeNoteData = notes.find(n => n.id === activeNoteId);

    return (
        <div className="flex h-[85vh] bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            {/* 左侧侧边栏 */}
            <div className="w-64 border-r border-white/5 flex flex-col bg-black/20">
                <div className="p-4 space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${isAdmin ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {isAdmin ? 'ADMIN MODE' : 'GUEST MODE'}
                        </span>
                    </div>
                    
                    {isAdmin && (
                        <button onClick={createNote} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all">
                            <Plus size={16} /> 新建笔记
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto px-2">
                    {notes.filter(n => (n.title || '').includes(searchQuery)).map(note => (
                        <div 
                            key={note.id}
                            onClick={() => { setActiveNoteId(note.id); setEditorTitle(note.title); setEditorContent(note.content); }}
                            className={`p-3 mb-1 rounded-lg cursor-pointer transition-all flex justify-between items-center ${activeNoteId === note.id ? 'bg-indigo-600/20 border border-indigo-500/50' : 'hover:bg-white/5 border border-transparent'}`}
                        >
                            <div className={`text-sm font-medium truncate ${activeNoteId === note.id ? 'text-indigo-300' : 'text-slate-400'}`}>
                                {note.title || '无标题'}
                            </div>
                            {/* 仅管理员能看到每篇笔记的锁定状态图标 */}
                            {isAdmin && (
                                <div className="opacity-50">
                                    {note.isPublic ? <Globe size={12} className="text-emerald-400"/> : <Lock size={12} className="text-rose-400"/>}
                                </div>
                            )}
                        </div>
                    ))}
                    {notes.length === 0 && (
                        <div className="text-center text-slate-500 text-xs mt-10">
                            {isAdmin ? '点击新建开始记录' : '博主还没有公开任何笔记哦'}
                        </div>
                    )}
                </div>
            </div>

            {/* 编辑主区 */}
            <div className="flex-1 flex flex-col bg-transparent min-w-0">
                {activeNoteId ? (
                    <>
                        <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/10 shrink-0">
                            <input 
                                value={editorTitle}
                                onChange={e => handleUpdate('title', e.target.value)}
                                disabled={!isAdmin}
                                className="bg-transparent border-none text-lg font-bold text-white focus:outline-none w-1/3 truncate disabled:opacity-80"
                            />
                            
                            <div className="flex items-center gap-4">
                                {isAdmin && (
                                    <>
                                        {/* 核心开关：切换 Public / Private */}
                                        <button 
                                            onClick={() => handleUpdate('isPublic', !activeNoteData?.isPublic)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all border ${activeNoteData?.isPublic ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'}`}
                                        >
                                            {activeNoteData?.isPublic ? <><Globe size={14} /> PUBLIC</> : <><Lock size={14} /> PRIVATE</>}
                                        </button>

                                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                                            {syncStatus === 'saving' ? <RefreshCcw size={12} className="text-indigo-400 animate-spin" /> : <CheckCircle2 size={12} className="text-emerald-400" />}
                                        </div>

                                        <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
                                            <button onClick={() => setViewMode('edit')} className={`p-1.5 rounded ${viewMode === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Edit3 size={14} /></button>
                                            <button onClick={() => setViewMode('split')} className={`p-1.5 rounded ${viewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Layout size={14} /></button>
                                            <button onClick={() => setViewMode('preview')} className={`p-1.5 rounded ${viewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Eye size={14} /></button>
                                        </div>
                                        
                                        <button onClick={() => deleteNote(activeNoteId)} className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded transition-colors"><Trash2 size={16} /></button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 flex overflow-hidden">
                            {(viewMode === 'edit' || viewMode === 'split') && isAdmin && (
                                <textarea 
                                    ref={textareaRef}
                                    value={editorContent}
                                    onChange={e => handleUpdate('content', e.target.value)}
                                    className="flex-1 bg-transparent p-8 resize-none focus:outline-none text-slate-300 font-mono text-sm leading-relaxed border-r border-white/5"
                                    placeholder="在此输入 Markdown..."
                                />
                            )}
                            {(viewMode === 'preview' || viewMode === 'split' || !isAdmin) && (
                                <div className={`flex-1 p-8 overflow-y-auto ${!isAdmin ? 'bg-transparent' : 'bg-black/5'}`}>
                                    <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={parseMarkdown(editorContent)} />
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500">
                        {isAdmin ? '选择左侧笔记进行编辑' : '当前没有任何公开的笔记'}
                    </div>
                )}
            </div>
        </div>
    );
}