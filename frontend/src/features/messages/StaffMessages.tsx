import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/lib/http';

type Conversation = { id: string; subject: string | null; updated_at: string; unread_count?: number; users: Array<{ id: number; name: string }> };
type Message = { id: string; body: string; sender_id: number; sender?: { id: number; name: string } | null; created_at: string };

export function StaffMessages(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const queryClient = useQueryClient();
  const conversations = useQuery({ queryKey: ['staff', 'conversations'], queryFn: () => httpClient.get<{ data: Conversation[] }>('/messages/conversations') });
  const thread = useQuery({
    queryKey: ['staff', 'conversation', selectedId],
    queryFn: () => httpClient.get<{ conversation: Conversation; messages: Message[] }>(`/messages/conversations/${selectedId}/messages`),
    enabled: Boolean(selectedId),
  });
  const send = useMutation({
    mutationFn: (body: string) => httpClient.post('/messages/messages', { conversation_id: selectedId, body }),
    onSuccess: () => {
      setReply('');
      void queryClient.invalidateQueries({ queryKey: ['staff', 'conversation', selectedId] });
      void queryClient.invalidateQueries({ queryKey: ['staff', 'conversations'] });
    },
  });
  const items = conversations.data?.data ?? [];
  const messages = thread.data?.messages ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">Patient Messages</h1>
        <p className="text-xs text-stone-500">View and respond to secure messages from patients.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-2">
          {conversations.isLoading && <p className="p-6 text-sm text-stone-500">Loading messages…</p>}
          {!conversations.isLoading && items.length === 0 && <div className="card p-8 text-center text-sm text-stone-500">No patient messages.</div>}
          {items.map((conversation) => (
            <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)}
              className={`w-full rounded-xl border p-4 text-left ${selectedId === conversation.id ? 'border-teal-300 bg-teal-50 dark:bg-teal-950/30' : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900'}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-stone-900 dark:text-stone-100">{conversation.subject || 'Patient message'}</span>
                {conversation.unread_count ? <span className="rounded-full bg-teal-600 px-2 py-0.5 text-xs font-bold text-white">{conversation.unread_count}</span> : null}
              </div>
              <p className="mt-1 text-xs text-stone-500">{conversation.users.map((u) => u.name).join(', ')}</p>
            </button>
          ))}
        </div>
        <div className="card min-h-[420px] lg:col-span-3">
          {!selectedId ? <div className="flex h-full items-center justify-center p-8 text-sm text-stone-500">Select a conversation to read it.</div> : (
            <div className="flex h-full flex-col">
              <div className="border-b border-stone-200 p-4 font-semibold dark:border-stone-800">{thread.data?.conversation.subject || 'Patient message'}</div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((message) => <div key={message.id} className="rounded-xl bg-stone-100 p-3 text-sm dark:bg-stone-800"><p>{message.body}</p><p className="mt-1 text-[11px] text-stone-500">{message.sender?.name || 'Patient'}</p></div>)}
              </div>
              <form className="flex gap-2 border-t border-stone-200 p-4 dark:border-stone-800" onSubmit={(e) => { e.preventDefault(); if (reply.trim()) send.mutate(reply.trim()); }}>
                <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" className="input flex-1" />
                <button disabled={!reply.trim() || send.isPending} className="btn-primary">Send</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
