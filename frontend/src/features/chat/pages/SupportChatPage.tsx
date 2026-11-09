import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supportChat, SupportConversation, SupportMessage } from '../services/support-chat.service';
import { watchSupportChat } from '../services/support-chat-events';
import './support-chat.css';

const labels = { BOT: 'Trợ lý tự động', WAITING: 'Chờ tiếp tân', HUMAN: 'Nhân viên đang hỗ trợ' };
const errorText = (e: unknown) => (e as { message?: string })?.message || 'Không thể tải chat. Vui lòng thử lại.';

export function SupportChatPage() {
  const { token } = useAuth();
  return <SupportChatSession key={token} />;
}
function SupportChatSession() {
  const { token, user } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [rooms, setRooms] = useState<SupportConversation[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [more, setMore] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const alive = useRef(true);
  const active = useRef<number | null>(null);
  const generation = useRef(0);
  const listGeneration = useRef(0);
  const pending = useRef<{ id: number; text: string; key: string } | null>(null);
  const historyLoaded = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const room = rooms.find(r => r.id === selected);
  const loadMessages = useCallback(async (id: number) => {
    const version = ++generation.current;
    const page = await supportChat.history(id);
    if (!alive.current || active.current !== id || version !== generation.current) return;
    setMessages(current => {
      const all = new Map(current.map(m => [m.id, m]));
      page.messages.forEach(m => all.set(m.id, m));
      return [...all.values()].sort((a, b) => a.id - b.id);
    });
    if (!historyLoaded.current) { setMore(page.hasMore); historyLoaded.current = true; }
    setLoaded(true);
    if (document.visibilityState === 'visible' && page.messages.length) {
      await supportChat.read(id, page.messages[page.messages.length - 1].id);
    }
  }, []);
  const refresh = useCallback(async () => {
    const version = ++listGeneration.current;
    try {
      const rows = await supportChat.list();
      if (!alive.current || version !== listGeneration.current) return;
      setRooms(rows);
      if (active.current !== null) await loadMessages(active.current);
    } catch (e) {
      if (alive.current) {
        setError(errorText(e));
        if ([401, 403, 404].includes((e as { status: number }).status)) { setMessages([]); setRooms([]); setSelected(null); active.current = null; }
      }
    }
  }, [loadMessages]);
  useEffect(() => {
    alive.current = true;
    supportChat.enabled().then(value => { if (alive.current) setEnabled(value); }).catch(e => { if (alive.current) setError(errorText(e)); });
    return () => { alive.current = false; };
  }, []);
  useEffect(() => {
    if (!enabled || !token) return;
    void refresh();
    const stop = watchSupportChat(token, () => void refresh(), setConnected);
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, 15000);
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', visible);
    return () => { stop(); window.clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [enabled, token, refresh]);
  const lastMessageId = messages[messages.length - 1]?.id;
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [lastMessageId]);
  const select = (id: number) => {
    if (busy || active.current === id) return;
    active.current = id; generation.current++;
    historyLoaded.current = false;
    setSelected(id); setMessages([]); setMore(false); setLoaded(false); setDraft(''); pending.current = null; setError('');
    void loadMessages(id).catch(e => { if (alive.current && active.current === id) setError(errorText(e)); });
  };
  const action = async (kind: 'claim' | 'resolve') => {
    if (!room || busy) return;
    setBusy(true); setError('');
    try { await supportChat.action(room.id, kind); await refresh(); }
    catch (e) { if (alive.current) setError(errorText(e)); }
    finally { if (alive.current) setBusy(false); }
  };
  const clearChat = async () => {
    if (!room || busy) return;
    if (!window.confirm('Xóa toàn bộ tin nhắn trong cuộc trò chuyện này?')) return;
    setBusy(true); setError('');
    try { await supportChat.clear(room.id); setMessages([]); setMore(false); await refresh(); }
    catch (e) { if (alive.current) setError(errorText(e)); }
    finally { if (alive.current) setBusy(false); }
  };
  const send = async () => {
    if (!room || !draft.trim() || busy) return;
    const content = draft.trim();
    const retry = pending.current;
    const key = retry?.id === room.id && retry.text === content ? retry.key : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
    pending.current = { id: room.id, text: content, key };
    setBusy(true); setError('');
    try { await supportChat.send(room.id, content, key); if (alive.current) { setDraft(''); pending.current = null; } await refresh(); }
    catch (e) { if (alive.current) setError(errorText(e)); }
    finally { if (alive.current) setBusy(false); }
  };
  const older = async () => {
    if (!room || !messages.length || busy) return;
    const id = room.id; setBusy(true);
    try {
      const page = await supportChat.history(id, messages[0].id);
      if (alive.current && active.current === id) {
        setMessages(current => [...new Map([...page.messages, ...current].map(m => [m.id, m])).values()].sort((a, b) => a.id - b.id)); setMore(page.hasMore);
      }
    } catch (e) { if (alive.current) setError(errorText(e)); }
    finally { if (alive.current) setBusy(false); }
  };
  if (enabled === false) return <div className="support-empty"><h2>Chat hỗ trợ khách hàng</h2><p>Chat hỗ trợ hiện chưa được bật. Bạn vẫn có thể xem và xử lý lịch hẹn tại mục Lịch hẹn.</p></div>;
  return <section className="support-page">
    <header className="support-title"><div><h1>Hỗ trợ khách hàng</h1><p>Trả lời câu hỏi về dịch vụ và hỗ trợ khách đặt lịch</p></div><span>{connected ? '● Đã kết nối' : '○ Đang kết nối lại'}</span></header>
    {error && <div role="alert" className="support-error">{error} <button onClick={() => { setError(''); if (enabled === null) supportChat.enabled().then(setEnabled).catch(e => setError(errorText(e))); else void refresh(); }}>Thử lại</button></div>}
    <div className="support-layout">
      <aside className="support-list">
        <input aria-label="Tìm khách hàng" placeholder="Tìm tên khách hoặc chi nhánh…" value={query} onChange={e => setQuery(e.target.value)} />
        <select aria-label="Lọc cuộc trò chuyện" value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">Tất cả cuộc trò chuyện</option><option value="WAITING">Chờ tiếp tân</option><option value="MINE">Tôi đang hỗ trợ</option><option value="BOT">Trợ lý tự động</option></select>
        {enabled === null && <p>Đang tải…</p>}
        {enabled && rooms.length === 0 && <p>Chưa có cuộc trò chuyện.</p>}
        {rooms.filter(r => (filter === 'ALL' || (filter === 'MINE' ? r.agentId === user?.maNguoiDung : r.status === filter)) && `${r.customerName} ${r.branchName}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(r => <button key={r.id} className={`support-room ${selected === r.id ? 'selected' : ''}`} onClick={() => select(r.id)} disabled={busy}>
          <strong>{r.customerName}</strong><span>{r.branchName}</span><small>{labels[r.status]}{r.agentName ? ` · ${r.agentName}` : ''}</small>{r.unreadCount > 0 && <b>{r.unreadCount}</b>}
        </button>)}
      </aside>
      <main className="support-thread">
        {!room ? <div className="support-empty"><span className="material-symbols-outlined">forum</span><h2>Chọn một cuộc trò chuyện</h2><p>Nhận yêu cầu đang chờ để bắt đầu hỗ trợ khách.</p></div> : <>
          <header className="support-thread-header">
            <div><strong>{room.customerName}</strong><p>{room.branchName} · {labels[room.status]}</p></div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {room.status === 'WAITING' && <button className="support-primary" disabled={busy} onClick={() => void action('claim')}>Nhận hỗ trợ</button>}
              {room.agentId === user?.maNguoiDung && room.status === 'HUMAN' && <button disabled={busy} onClick={() => void action('resolve')}>Kết thúc hỗ trợ</button>}
              <button className="support-danger" disabled={busy} onClick={() => void clearChat()} title="Xóa toàn bộ tin nhắn trong cuộc trò chuyện">Xóa trò chuyện</button>
            </div>
          </header>
          <div className="support-messages" aria-live="polite">
            {!loaded && <p>Đang tải tin nhắn…</p>}
            {more && <button disabled={busy} onClick={() => void older()}>Xem tin nhắn trước</button>}
            {messages.map(m => <article key={m.id} className={`support-message ${m.senderType === 'SYSTEM' ? 'system' : m.senderId === user?.maNguoiDung ? 'mine' : ''}`}>
              <small>{m.senderName}</small><p>{m.content}</p><time>{new Date(m.createdAt).toLocaleString('vi-VN')}</time>
            </article>)}<div ref={bottom} />
          </div>
          <form className="support-composer" onSubmit={e => { e.preventDefault(); void send(); }}>
            <textarea aria-label="Tin nhắn trả lời" maxLength={2000} value={draft} onChange={e => setDraft(e.target.value)} disabled={busy || room.status !== 'HUMAN' || room.agentId !== user?.maNguoiDung} placeholder={room.agentId === user?.maNguoiDung ? 'Nhập tin nhắn…' : 'Nhận hỗ trợ để trả lời khách hàng'} />
            <button className="support-primary" disabled={busy || !draft.trim() || room.status !== 'HUMAN' || room.agentId !== user?.maNguoiDung}>Gửi</button>
          </form>
        </>}
      </main>
    </div>
  </section>;
}
