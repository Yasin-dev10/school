"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import api, { getApiUrl } from '../../utils/api';
import { getSocket } from '../../utils/socket';
import { MessageCircle, Plus, Send, Paperclip, Mic, Square, Reply, Flag, Users, ShieldAlert, X, CheckCheck, FileText } from 'lucide-react';

type User = { id: string; firstName: string; lastName: string; role: string };
type Conversation = { id: string; type: string; title?: string; participants: { user: User; lastReadAt?: string }[]; messages: Message[]; _count?: { messages: number } };
type Message = { id: string; body?: string; type: string; senderId: string; sender: User; createdAt: string; deletedAt?: string; attachments: { id: string; fileName: string; fileUrl: string; mimeType: string }[]; replyTo?: { id: string; body?: string; sender: User }; receipts?: { userId: string; status: string; readAt?: string }[]; _count?: { reports: number } };

const fileUrl = (url: string) => getApiUrl('').replace(/\/api\/?$/, '') + url;
const name = (user?: User) => user ? `${user.firstName} ${user.lastName}` : 'Unknown';

export default function CommunicationPage() {
  const [me, setMe] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [contacts, setContacts] = useState<User[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [conversationType, setConversationType] = useState('private');
  const [title, setTitle] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState('');
  const [classId, setClassId] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [recording, setRecording] = useState(false);
  const [tab, setTab] = useState<'chat' | 'reports'>('chat');
  const [reports, setReports] = useState<any[]>([]);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isAdmin = ['school-admin', 'super-admin'].includes(me?.role);
  const canStartChat = me && me.role !== 'student';

  const loadConversations = useCallback(async () => {
    const { data } = await api.get('/chat/conversations');
    setConversations(data.data || []);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setMe(JSON.parse(stored));
    loadConversations().catch(console.error);
    api.get('/chat/contacts').then(response => setContacts(response.data.data || [])).catch(error => console.error('Contacts failed', error));
  }, [loadConversations]);

  const loadClasses = useCallback(async () => {
    setClassesLoading(true); setClassesError('');
    try {
      const response = await api.get('/classes');
      setClasses(response.data.data || []);
    } catch (error: any) {
      setClasses([]);
      setClassesError(error.response?.data?.message || 'Could not load classes');
    } finally {
      setClassesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showNew && conversationType === 'class' && classes.length === 0) loadClasses();
  }, [showNew, conversationType, classes.length, loadClasses]);

  const openConversation = useCallback(async (conversation: Conversation) => {
    setActive(conversation);
    const { data } = await api.get(`/chat/conversations/${conversation.id}/messages`);
    setMessages(data.data || []);
    await api.put(`/chat/conversations/${conversation.id}/read`);
    const socket = getSocket(); socket?.emit('chat:join', conversation.id);
    window.setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const activeId = active?.id;
    const onMessage = (message: Message) => {
      if (message.id && activeId === (message as any).conversationId) {
        setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
        api.put(`/chat/conversations/${activeId}/read`).catch(() => {});
        window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
      }
      loadConversations();
    };
    const onRead = ({ userId }: { userId: string }) => setMessages(current => current.map(message => message.senderId === me?.id ? { ...message, receipts: (message.receipts || []).map(receipt => receipt.userId === userId ? { ...receipt, status: 'read', readAt: new Date().toISOString() } : receipt) } : message));
    socket.on('chat:message', onMessage); socket.on('chat:read', onRead);
    return () => { socket.off('chat:message', onMessage); socket.off('chat:read', onRead); };
  }, [active?.id, loadConversations, me?.id]);

  const sendMessage = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!active || (!text.trim() && !attachment)) return;
    const form = new FormData(); form.append('body', text.trim());
    if (replyTo) form.append('replyToId', replyTo.id);
    if (attachment) form.append('attachment', attachment);
    const { data } = await api.post(`/chat/conversations/${active.id}/messages`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    setMessages(current => current.some(item => item.id === data.data.id) ? current : [...current, data.data]);
    setText(''); setAttachment(null); setReplyTo(null); loadConversations();
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream); chunks.current = [];
    mediaRecorder.ondataavailable = event => chunks.current.push(event.data);
    mediaRecorder.onstop = () => { const blob = new Blob(chunks.current, { type: 'audio/webm' }); setAttachment(new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })); stream.getTracks().forEach(track => track.stop()); };
    recorder.current = mediaRecorder; mediaRecorder.start(); setRecording(true);
  };

  const stopRecording = () => { recorder.current?.stop(); setRecording(false); };

  const createConversation = async () => {
    setCreating(true); setCreateError('');
    try {
      const { data } = await api.post('/chat/conversations', { type: conversationType, title, participantIds: selectedContacts, classId: conversationType === 'class' ? classId : undefined });
      setShowNew(false); setSelectedContacts([]); setTitle(''); setClassId(''); await loadConversations(); openConversation(data.data);
    } catch (error: any) {
      setCreateError(error.response?.data?.message || 'Could not create conversation');
    } finally {
      setCreating(false);
    }
  };

  const reportMessage = async (messageId: string) => {
    const reason = prompt('Why are you reporting this message?'); if (!reason) return;
    await api.post(`/chat/messages/${messageId}/report`, { reason }); alert('Message reported to the school administrator.');
  };

  const loadReports = async () => { const { data } = await api.get('/chat/reports'); setReports(data.data || []); setTab('reports'); };
  const moderate = async (reportId: string, action: string) => { await api.put(`/chat/reports/${reportId}`, { action }); await loadReports(); };
  const conversationName = (conversation: Conversation) => conversation.title || name(conversation.participants.find(item => item.user.id !== me?.id)?.user) || 'Conversation';

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-7.5rem)] flex flex-col gap-4">
      <header className={`flex items-center justify-between gap-3 ${me?.role === 'student' ? 'rounded-3xl bg-[#405bb2] p-6 text-white shadow-lg shadow-indigo-900/10' : ''}`}>
        <div><h1 className={`text-2xl font-bold ${me?.role === 'student' ? 'text-white' : 'text-slate-900 dark:text-white'}`}>Messages</h1><p className={`text-sm ${me?.role === 'student' ? 'text-indigo-100' : 'text-slate-500'}`}>Private and group conversations for your school community.</p></div>
        <div className="flex gap-2">
          {isAdmin && <button onClick={tab === 'reports' ? () => setTab('chat') : loadReports} className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2 text-sm"><ShieldAlert className="w-4 h-4" />{tab === 'reports' ? 'Chats' : 'Moderation'}</button>}
          {canStartChat && <button onClick={() => setShowNew(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white flex items-center gap-2 text-sm font-semibold"><Plus className="w-4 h-4" /> New chat</button>}
        </div>
      </header>

      {tab === 'reports' ? (
        <div className="surface-card flex-1 overflow-auto p-5"><h2 className="font-bold mb-4">Reported messages</h2>{reports.length === 0 ? <p className="text-slate-500">No reports pending.</p> : reports.map(report => <div key={report.id} className="border-b border-slate-200 dark:border-slate-700 py-4 flex gap-4 justify-between"><div><p className="font-semibold">{name(report.message.sender)}</p><p className="text-sm text-slate-600 dark:text-slate-300">{report.message.body || '[attachment]'}</p><p className="text-xs text-rose-500 mt-1">Report: {report.reason} · by {name(report.reporter)}</p></div><div className="flex gap-2 self-start"><button onClick={() => moderate(report.id, 'dismiss')} className="px-3 py-1.5 text-xs border rounded-lg">Dismiss</button><button onClick={() => moderate(report.id, 'remove')} className="px-3 py-1.5 text-xs bg-rose-600 text-white rounded-lg">Remove</button></div></div>)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[20rem_1fr] surface-card overflow-hidden flex-1 min-h-0">
          <aside className={`${active ? 'hidden md:block' : 'block'} border-r border-slate-200 dark:border-slate-700 overflow-y-auto`} aria-label="Conversations">
            {conversations.length === 0 ? <div className="p-8 text-center text-slate-500"><MessageCircle className="w-8 h-8 mx-auto mb-2" />No conversations yet.</div> : conversations.map(conversation => <button key={conversation.id} onClick={() => openConversation(conversation)} className={`w-full text-left p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 ${active?.id === conversation.id ? 'bg-indigo-50 dark:bg-indigo-950/30' : ''}`}><div className="flex gap-3"><div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center"><Users className="w-4 h-4 text-indigo-600" /></div><div className="min-w-0"><p className="font-semibold truncate">{conversationName(conversation)}</p><p className="text-xs text-slate-500 truncate">{conversation.messages?.[0]?.body || (conversation.messages?.[0]?.type === 'audio' ? '🎤 Voice note' : 'Start a conversation')}</p></div></div></button>)}
          </aside>

          <main className={`${!active ? 'hidden md:flex' : 'flex'} flex-col min-w-0`}>
            {!active ? <div className="flex-1 flex items-center justify-center text-slate-500">Select a conversation to start messaging.</div> : <>
              <div className="h-16 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 px-4"><button className="md:hidden" onClick={() => setActive(null)} aria-label="Back"><X className="w-5 h-5" /></button><div><p className="font-bold">{conversationName(active)}</p><p className="text-xs text-slate-500">{active.type} · {active.participants.length} participants</p></div></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
                {messages.map(message => { const mine = message.senderId === me?.id; const read = message.receipts?.some(receipt => receipt.status === 'read'); return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-4 py-3 ${mine ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-bl-md'}`}>
                  {!mine && <p className="text-[11px] font-bold text-indigo-500 mb-1">{name(message.sender)}</p>}
                  {message.replyTo && <div className="text-xs opacity-70 border-l-2 pl-2 mb-2">{name(message.replyTo.sender)}: {message.replyTo.body || 'Attachment'}</div>}
                  {message.deletedAt ? <p className="italic opacity-60">Message removed by moderator</p> : <><p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>{message.attachments?.map(file => file.mimeType.startsWith('audio/') ? <audio key={file.id} controls src={fileUrl(file.fileUrl)} className="mt-2 max-w-full" /> : file.mimeType.startsWith('image/') ? <a key={file.id} href={fileUrl(file.fileUrl)} target="_blank"><img src={fileUrl(file.fileUrl)} alt={file.fileName} className="mt-2 max-h-64 rounded-lg" /></a> : <a key={file.id} href={fileUrl(file.fileUrl)} target="_blank" className="mt-2 flex items-center gap-2 underline"><FileText className="w-4 h-4" />{file.fileName}</a>)}</>}
                  <div className="mt-1 flex items-center justify-end gap-2 text-[10px] opacity-60"><span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>{mine && <CheckCheck className={`w-3.5 h-3.5 ${read ? 'text-cyan-300' : ''}`} />}</div>
                  {!message.deletedAt && <div className="flex justify-end gap-2 mt-1"><button onClick={() => setReplyTo(message)} aria-label="Reply"><Reply className="w-3.5 h-3.5" /></button>{!mine && <button onClick={() => reportMessage(message.id)} aria-label="Report message"><Flag className="w-3.5 h-3.5" /></button>}</div>}
                </div></div>; })}<div ref={bottomRef} />
              </div>
              <form onSubmit={sendMessage} className="border-t border-slate-200 dark:border-slate-700 p-3">
                {replyTo && <div className="mb-2 flex justify-between bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-xs"><span>Replying to {name(replyTo.sender)}: {replyTo.body}</span><button type="button" onClick={() => setReplyTo(null)}><X className="w-4 h-4" /></button></div>}
                {attachment && <div className="mb-2 flex justify-between text-xs text-indigo-500"><span>{attachment.name}</span><button type="button" onClick={() => setAttachment(null)}>Remove</button></div>}
                <div className="flex items-end gap-2"><label className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" aria-label="Attach file"><Paperclip className="w-5 h-5" /><input type="file" className="sr-only" accept="image/*,.pdf,.doc,.docx,audio/*" onChange={event => setAttachment(event.target.files?.[0] || null)} /></label><button type="button" onClick={recording ? stopRecording : startRecording} className={`p-2.5 rounded-xl ${recording ? 'bg-rose-100 text-rose-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} aria-label={recording ? 'Stop recording' : 'Record voice note'}>{recording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}</button><textarea value={text} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} rows={1} placeholder="Type a message…" className="flex-1 max-h-32 resize-none rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500" /><button type="submit" className="p-2.5 rounded-xl bg-indigo-600 text-white" aria-label="Send message"><Send className="w-5 h-5" /></button></div>
              </form>
            </>}
          </main>
        </div>
      )}

      {showNew && createError && <div role="alert" className="fixed top-5 left-1/2 -translate-x-1/2 z-[60] rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-xl">{createError}</div>}
      {showNew && creating && <div role="status" className="sr-only">Creating conversation…</div>}

      {showNew && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true"><div className="surface-card w-full max-w-lg p-6"><div className="flex justify-between"><h2 className="text-xl font-bold">Start a conversation</h2><button onClick={() => setShowNew(false)}><X /></button></div><div className="mt-4 flex gap-2">{['private', ...(isAdmin || me?.role === 'teacher' ? ['group', 'class'] : [])].map(type => <button key={type} onClick={() => { setConversationType(type); setSelectedContacts([]); setClassId(''); }} className={`px-3 py-2 rounded-lg text-sm capitalize ${conversationType === type ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{type}</button>)}</div>{conversationType !== 'private' && <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Conversation title" className="mt-4 w-full border rounded-xl bg-transparent px-4 py-2.5" />}{conversationType === 'class' ? <div className="mt-4">{classesLoading ? <div className="w-full border rounded-xl px-4 py-3 text-sm text-slate-500" role="status">Loading classes…</div> : classesError ? <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/20 p-3 text-sm text-rose-700 dark:text-rose-300"><p>{classesError}</p><button type="button" onClick={loadClasses} className="mt-2 font-bold underline">Try again</button></div> : classes.length === 0 ? <div className="rounded-xl border p-3 text-sm text-slate-500">No classes are available for your account.</div> : <select value={classId} onChange={event => setClassId(event.target.value)} className="w-full border rounded-xl bg-transparent px-4 py-2.5"><option value="">Select class</option>{classes.map(cls => { const id = cls.id || cls._id; return <option key={id} value={id}>{cls.name} {cls.section}</option>; })}</select>}</div> : <div className="mt-4 max-h-64 overflow-y-auto border rounded-xl">{contacts.map(contact => <label key={contact.id} className="flex items-center gap-3 p-3 border-b cursor-pointer"><input type={conversationType === 'private' ? 'radio' : 'checkbox'} checked={selectedContacts.includes(contact.id)} onChange={() => setSelectedContacts(current => conversationType === 'private' ? [contact.id] : current.includes(contact.id) ? current.filter(id => id !== contact.id) : [...current, contact.id])} /><span>{name(contact)} <small className="text-slate-500">({contact.role})</small></span></label>)}</div>}<button onClick={createConversation} disabled={conversationType === 'class' ? !classId : selectedContacts.length === 0} className="mt-5 w-full py-3 bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-semibold">Create conversation</button></div></div>}
    </div>
  );
}
