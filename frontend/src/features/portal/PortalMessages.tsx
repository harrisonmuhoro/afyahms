import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';
import { ToastBanner } from './PortalModal';

interface ThreadMessage {
  id: string;
  sender: string;
  isPatient: boolean;
  text: string;
  timestamp: string;
}

interface Message {
  id: string;
  from: string;
  role: string;
  preview: string;
  date: string;
  unread: boolean;
  thread: ThreadMessage[];
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 'MSG-001', from: 'Dr. Mwangi', role: 'Cardiology', preview: 'Your CBC results are in. The white blood cell count is slightly elevated…', date: 'Today', unread: true,
    thread: [
      { id: 't1', sender: 'Dr. Mwangi', isPatient: false, text: 'Hello! Your CBC results are now available. Your white blood cell count is slightly elevated at 11.8 × 10⁹/L (normal is up to 11.0). This can be a sign of a minor infection or inflammation. I have prescribed a short course of Amoxicillin. Please complete the full course and we will recheck in one week. Let me know if you have any questions.', timestamp: 'Today, 11:42 AM' },
      { id: 't2', sender: 'You', isPatient: true, text: 'Thank you, Dr. Mwangi. I will start the medication today. Should I be concerned about anything in particular?', timestamp: 'Today, 12:05 PM' },
      { id: 't3', sender: 'Dr. Mwangi', isPatient: false, text: 'Not at all — this is quite common and should resolve with the antibiotics. Please make sure to take the medication with food to avoid any stomach discomfort. If you develop a rash, difficulty breathing, or your symptoms worsen, please visit the emergency department immediately.', timestamp: 'Today, 12:30 PM' },
    ],
  },
  {
    id: 'MSG-002', from: 'Appointments Desk', role: 'Administration', preview: 'Your appointment on 25 Jun has been confirmed. Please remember to bring…', date: '23 Jun', unread: false,
    thread: [
      { id: 't4', sender: 'Appointments Desk', isPatient: false, text: 'Dear Patient, your appointment with Dr. Mwangi on 25 Jun 2026 at 10:00 AM has been confirmed. Please remember to bring your ID, insurance card (if applicable), and any previous test results. Kindly arrive 15 minutes early for registration.', timestamp: '23 Jun, 9:00 AM' },
    ],
  },
  {
    id: 'MSG-003', from: 'Dr. Achieng', role: 'Diabetology', preview: 'Following up on your Metformin prescription — how are you feeling?', date: '30 May', unread: false,
    thread: [
      { id: 't5', sender: 'Dr. Achieng', isPatient: false, text: 'Hi, I wanted to follow up on the Metformin we started last week. Are you experiencing any side effects, particularly any nausea or stomach upset? These are common in the first week but typically resolve.', timestamp: '30 May, 3:15 PM' },
      { id: 't6', sender: 'You', isPatient: true, text: 'Hello Dr. Achieng. I had some mild nausea the first two days but it has since settled. Feeling much better now!', timestamp: '30 May, 5:00 PM' },
    ],
  },
];

const PROVIDERS = ['General Enquiries', 'Dr. Mwangi (Cardiology)', 'Dr. Achieng (Diabetology)', 'Dr. Otieno (General Practice)', 'Appointments Desk', 'Billing Team'];

function now(): string {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function PortalMessages(): JSX.Element {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [selectedId, setSelectedId] = useState<string | null>(INITIAL_MESSAGES[0].id);
  const [replyText, setReplyText] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTo, setNewTo] = useState(PROVIDERS[0]);
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string): void => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const selectedMessage = messages.find((m) => m.id === selectedId);

  // Mark as read when selected
  const selectMessage = (id: string): void => {
    setSelectedId(id);
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, unread: false } : m));
  };

  // Send a reply in the current thread
  const handleSendReply = (): void => {
    if (!replyText.trim() || !selectedMessage) return;
    const newMsg: ThreadMessage = {
      id: `t-${Date.now()}`,
      sender: 'You',
      isPatient: true,
      text: replyText.trim(),
      timestamp: `Today, ${now()}`,
    };
    setMessages((prev) =>
      prev.map((m) =>
        m.id === selectedId
          ? { ...m, thread: [...m.thread, newMsg], preview: replyText.trim().slice(0, 60) + '…', date: 'Today' }
          : m,
      ),
    );
    setReplyText('');
  };

  // Send a new message thread
  const handleSendNew = (): void => {
    if (!newBody.trim()) return;
    setSending(true);
    setTimeout(() => {
      const newConversation: Message = {
        id: `MSG-${Date.now()}`,
        from: newTo.split(' (')[0],
        role: newTo.includes('(') ? newTo.split('(')[1].replace(')', '') : 'Hospital',
        preview: newBody.slice(0, 60) + '…',
        date: 'Today',
        unread: false,
        thread: [
          {
            id: `t-${Date.now()}`,
            sender: 'You',
            isPatient: true,
            text: `Subject: ${newSubject}\n\n${newBody}`,
            timestamp: `Today, ${now()}`,
          },
        ],
      };
      setMessages((prev) => [newConversation, ...prev]);
      setSelectedId(newConversation.id);
      setShowNewForm(false);
      setNewSubject('');
      setNewBody('');
      setSending(false);
      showToast(`Message sent to ${newTo.split(' (')[0]}.`);
    }, 1200);
  };

  const unreadCount = messages.filter((m) => m.unread).length;

  return (
    <div className="animate-fade-in space-y-6">
      {toast && <ToastBanner message={toast} />}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">
            Messages
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-teal-500 px-1.5 text-xs font-bold text-white">
                {unreadCount}
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
            <button type="button" onClick={() => setShowNewForm(false)} className="p-1 text-stone-400 hover:text-stone-600"><Icon name="close" size={18} /></button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">To</label>
              <select value={newTo} onChange={(e) => setNewTo(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100">
                {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Subject</label>
              <input type="text" value={newSubject} onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Question about my medication"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">Message</label>
              <textarea rows={4} value={newBody} onChange={(e) => setNewBody(e.target.value)}
                placeholder="Write your message here…"
                className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowNewForm(false)} className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300">Cancel</button>
            <button type="button" onClick={handleSendNew} disabled={!newBody.trim() || sending}
              className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50">
              {sending ? (
                <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>Sending…</>
              ) : (
                <><Icon name="message" size={15} />Send Message</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Inbox */}
        <div className="space-y-2 lg:col-span-2">
          {messages.map((msg) => (
            <button key={msg.id} type="button" onClick={() => selectMessage(msg.id)}
              className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedId === msg.id ? 'border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-900/20' : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800'}`}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {msg.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500" />}
                  <span className={`text-sm ${msg.unread ? 'font-bold text-stone-900 dark:text-stone-100' : 'font-medium text-stone-700 dark:text-stone-300'}`}>{msg.from}</span>
                </div>
                <span className="shrink-0 text-xs text-stone-400">{msg.date}</span>
              </div>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{msg.role}</p>
              <p className="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">{msg.preview}</p>
            </button>
          ))}
        </div>

        {/* Thread */}
        <div className="lg:col-span-3">
          {selectedMessage ? (
            <div className="flex flex-col rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900" style={{ minHeight: '420px' }}>
              {/* Thread Header */}
              <div className="border-b border-stone-100 p-5 dark:border-stone-800">
                <p className="font-bold text-stone-900 dark:text-stone-100">{selectedMessage.from}</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">{selectedMessage.role}</p>
              </div>

              {/* Bubbles */}
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
                {selectedMessage.thread.map((t) => (
                  <div key={t.id} className={`flex ${t.isPatient ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${t.isPatient ? 'rounded-br-sm bg-teal-600 text-white' : 'rounded-bl-sm bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100'}`}>
                      <p className="whitespace-pre-line text-sm leading-relaxed">{t.text}</p>
                      <p className={`mt-1.5 text-right text-xs ${t.isPatient ? 'text-teal-200' : 'text-stone-400 dark:text-stone-500'}`}>{t.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="border-t border-stone-100 p-4 dark:border-stone-800">
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                    placeholder="Type a reply… (Enter to send)"
                    className="flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  />
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={replyText.trim() === ''}
                    className="self-end flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-40"
                  >
                    <Icon name="message" size={16} />
                    Send
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
