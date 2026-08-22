import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { ToastBanner } from './PortalModal';
import {
  usePortalConversations,
  usePortalConversation,
  usePortalMessageRecipients,
  useSendPortalMessage,
  type PortalConversation,
} from './api';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function PortalMessages(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyText, setReplyText]   = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject]  = useState('');
  const [newBody, setNewBody]       = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [toast, setToast]           = useState<string | null>(null);

  const { data: convoData, isLoading } = usePortalConversations();
  const { data: threadData }           = usePortalConversation(selectedId);
  const sendMutation                   = useSendPortalMessage();
  const { data: recipientData, isLoading: recipientsLoading } = usePortalMessageRecipients();
  const recipients = (recipientData as any)?.data ?? [];

  const conversations: PortalConversation[] = (convoData as any)?.data ?? [];
  const messages      = threadData?.messages ?? [];
  const conversation  = threadData?.conversation ?? null;

  const showToast = (msg: string): void => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSendReply = async (): Promise<void> => {
    if (!replyText.trim() || !selectedId) return;
    try {
      await sendMutation.mutateAsync({
        body: replyText.trim(),
        conversation_id: String((conversation as any)?.id ?? selectedId),
      });
      setReplyText('');
    } catch (error: any) {
      showToast(error?.message ?? 'Failed to send message. Please try again.');
    }
  };

  const handleSendNew = async (): Promise<void> => {
    if (!newBody.trim() || !recipientId) return;
    try {
      const res = await sendMutation.mutateAsync({ subject: newSubject, body: newBody.trim(), recipient_ids: [Number(recipientId)] });
      setShowNewForm(false);
      setNewSubject('');
      setNewBody('');
      setRecipientId('');
      setSelectedId((res as any).data?.conversation_id ?? null);
      showToast('Message sent successfully.');
    } catch {
      showToast('Failed to send message. Please try again.');
    }
  };

  const unreadTotal = conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);

  return (
    <div className="animate-fade-in space-y-6">
      {toast && <ToastBanner message={toast} />}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">
            Messages
            {unreadTotal > 0 && (
              <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-teal-500 px-1.5 text-xs font-bold text-white">
                {unreadTotal}
              </span>
            )}
          </h1>
          <p className="mt-1 text-stone-500 dark:text-stone-400">Secure messages between you and your care team.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewForm(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white transition-colors hover:bg-teal-700"
        >
          <Icon name="plus" size={18} />
          New Message
        </button>
      </div>

      {/* New Message Form */}
      {showNewForm && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 dark:text-stone-100">New Message</h3>
            <button type="button" onClick={() => setShowNewForm(false)} className="p-1 text-stone-400 hover:text-stone-600">
              <Icon name="close" size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Send to</label>
              <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100">
                <option value="">{recipientsLoading ? 'Loading care team…' : '-- Choose a doctor or staff member --'}</option>
                {recipients.map((recipient: any) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.role}: {recipient.name} ({recipient.email})
                  </option>
                ))}
              </select>
              {!recipientsLoading && recipients.length === 0 && <p className="mt-1 text-xs text-amber-600">No care team recipients are available yet.</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Subject (optional)</label>
              <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Question about my medication"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Message</label>
              <textarea rows={4} value={newBody} onChange={(e) => setNewBody(e.target.value)}
                placeholder="Write your message here…"
                className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowNewForm(false)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300">Cancel</button>
            <button type="button" onClick={handleSendNew} disabled={!newBody.trim() || !recipientId || sendMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50">
              {sendMutation.isPending ? 'Sending…' : <><Icon name="message" size={15} />Send Message</>}
            </button>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Inbox */}
        <div className="space-y-2 lg:col-span-2">
          {isLoading && (
            <p className="animate-pulse py-6 text-center text-sm text-stone-400">Loading messages…</p>
          )}
          {!isLoading && conversations.length === 0 && (
            <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 text-stone-400 dark:border-stone-700 dark:bg-stone-900/30">
              <Icon name="message" size={36} className="mb-2 opacity-30" />
              <p className="text-sm">No messages yet.</p>
            </div>
          )}
          {conversations.map((conv) => {
            const otherUsers = conv.users.filter((u: any) => u.id !== undefined);
            const fromName = otherUsers.length > 0
              ? otherUsers.map((u: any) => u.name ?? `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()).join(', ')
              : 'Hospital Team';
            return (
              <button key={conv.id} type="button" onClick={() => setSelectedId(conv.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedId === conv.id ? 'border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-900/20' : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900'}`}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {conv.unread_count > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500" />}
                    <span className={`text-sm ${conv.unread_count > 0 ? 'font-bold text-stone-900 dark:text-stone-100' : 'font-medium text-stone-700 dark:text-stone-300'}`}>
                      {fromName}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-stone-400">{formatDate(conv.updated_at)}</span>
                </div>
                {conv.subject && <p className="text-xs font-medium text-stone-500">{conv.subject}</p>}
              </button>
            );
          })}
        </div>

        {/* Thread */}
        <div className="lg:col-span-3">
          {conversation ? (
            <div className="flex flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900" style={{ minHeight: '420px' }}>
              <div className="border-b border-stone-100 p-5 dark:border-stone-800">
                <p className="font-bold text-stone-900 dark:text-stone-100">{conversation.subject ?? 'Message Thread'}</p>
              </div>
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
                {messages.map((msg) => {
                  return (
                    <div key={msg.id} className={`flex ${msg.sender?.id ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.sender?.id ? 'rounded-bl-sm bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100' : 'rounded-br-sm bg-teal-600 text-white'}`}>
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {msg.sender ? msg.sender.name : 'You'}
                        </p>
                        <p className="whitespace-pre-line text-sm leading-relaxed">{msg.body}</p>
                        <p className="mt-1.5 text-right text-xs opacity-60">{formatDate(msg.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-stone-100 p-4 dark:border-stone-800">
                <div className="flex gap-2">
                  <textarea rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSendReply(); } }}
                    placeholder="Type a reply… (Enter to send)"
                    className="flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
                  <button type="button" onClick={() => void handleSendReply()} disabled={!replyText.trim() || sendMutation.isPending}
                    className="self-end flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-40">
                    <Icon name="message" size={16} />Send
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 text-stone-400 dark:border-stone-800">
              <Icon name="message" size={40} className="mb-3 opacity-30" />
              <p className="text-sm">Select a conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
