import { useState } from 'react';
import { Icon } from '@/components/icons/Icon';

interface Message {
  id: string;
  from: string;
  role: string;
  preview: string;
  date: string;
  unread: boolean;
  thread: ThreadMessage[];
}

interface ThreadMessage {
  id: string;
  sender: string;
  isPatient: boolean;
  text: string;
  timestamp: string;
}

const MESSAGES: Message[] = [
  {
    id: 'MSG-001',
    from: 'Dr. Mwangi',
    role: 'Cardiology',
    preview: 'Your CBC results are in. The white blood cell count is slightly elevated…',
    date: 'Today',
    unread: true,
    thread: [
      {
        id: 't1',
        sender: 'Dr. Mwangi',
        isPatient: false,
        text: 'Hello! Your CBC results are now available. Your white blood cell count is slightly elevated at 11.8 × 10⁹/L (normal is up to 11.0). This can be a sign of a minor infection or inflammation. I have prescribed a short course of Amoxicillin. Please complete the full course and we will recheck in one week. Let me know if you have any questions.',
        timestamp: 'Today, 11:42 AM',
      },
      {
        id: 't2',
        sender: 'You',
        isPatient: true,
        text: 'Thank you, Dr. Mwangi. I will start the medication today. Should I be concerned about anything in particular?',
        timestamp: 'Today, 12:05 PM',
      },
      {
        id: 't3',
        sender: 'Dr. Mwangi',
        isPatient: false,
        text: 'Not at all — this is quite common and should resolve with the antibiotics. Please make sure to take the medication with food to avoid any stomach discomfort. If you develop a rash, difficulty breathing, or your symptoms worsen, please visit the emergency department immediately.',
        timestamp: 'Today, 12:30 PM',
      },
    ],
  },
  {
    id: 'MSG-002',
    from: 'Appointments Desk',
    role: 'Administration',
    preview: 'Your appointment on 25 Jun has been confirmed. Please remember to bring…',
    date: '23 Jun',
    unread: false,
    thread: [
      {
        id: 't4',
        sender: 'Appointments Desk',
        isPatient: false,
        text: 'Dear Patient, your appointment with Dr. Mwangi on 25 Jun 2026 at 10:00 AM has been confirmed. Please remember to bring your ID, insurance card (if applicable), and any previous test results. Kindly arrive 15 minutes early for registration. See you soon!',
        timestamp: '23 Jun, 9:00 AM',
      },
    ],
  },
  {
    id: 'MSG-003',
    from: 'Dr. Achieng',
    role: 'Diabetology',
    preview: 'Following up on your Metformin prescription — how are you feeling?',
    date: '30 May',
    unread: false,
    thread: [
      {
        id: 't5',
        sender: 'Dr. Achieng',
        isPatient: false,
        text: 'Hi, I wanted to follow up on the Metformin we started last week. Are you experiencing any side effects, particularly any nausea or stomach upset? These are common in the first week but typically resolve. Please let me know how you are getting on.',
        timestamp: '30 May, 3:15 PM',
      },
      {
        id: 't6',
        sender: 'You',
        isPatient: true,
        text: 'Hello Dr. Achieng. I had some mild nausea the first two days but it has since settled. Feeling much better now!',
        timestamp: '30 May, 5:00 PM',
      },
    ],
  },
];

export function PortalMessages(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(MESSAGES[0].id);
  const [newMessage, setNewMessage] = useState('');
  const [showNewMessageForm, setShowNewMessageForm] = useState(false);

  const selectedMessage = MESSAGES.find((m) => m.id === selectedId);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 sm:text-3xl">
            Messages
          </h1>
          <p className="mt-1 text-stone-500 dark:text-stone-400">
            Secure messages between you and your care team.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewMessageForm(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-bold text-white transition-colors hover:bg-teal-700"
        >
          <Icon name="plus" size={18} />
          New Message
        </button>
      </div>

      {/* New Message Form */}
      {showNewMessageForm && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-stone-900 dark:text-stone-100">New Message</h3>
            <button
              type="button"
              onClick={() => setShowNewMessageForm(false)}
              className="p-1 text-stone-400 hover:text-stone-600"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                To (Department / Provider)
              </label>
              <select className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100">
                <option>General Enquiries</option>
                <option>Dr. Mwangi (Cardiology)</option>
                <option>Dr. Achieng (Diabetology)</option>
                <option>Dr. Otieno (General Practice)</option>
                <option>Appointments Desk</option>
                <option>Billing Team</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                Subject
              </label>
              <input
                type="text"
                placeholder="e.g. Question about my medication"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700 dark:text-stone-300">
                Message
              </label>
              <textarea
                rows={4}
                placeholder="Write your message here…"
                className="w-full resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewMessageForm(false)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowNewMessageForm(false)}
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700"
              >
                <Icon name="message" size={15} />
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main layout: list + thread */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Inbox List */}
        <div className="space-y-2 lg:col-span-2">
          {MESSAGES.map((msg) => (
            <button
              key={msg.id}
              type="button"
              onClick={() => setSelectedId(msg.id)}
              className={`w-full rounded-2xl border p-4 text-left transition-all ${
                selectedId === msg.id
                  ? 'border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-900/20'
                  : 'border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {msg.unread && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                  )}
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">{msg.from}</span>
                </div>
                <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500">{msg.date}</span>
              </div>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{msg.role}</p>
              <p className="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">
                {msg.preview}
              </p>
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-3">
          {selectedMessage ? (
            <div className="rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
              {/* Thread Header */}
              <div className="border-b border-stone-100 p-5 dark:border-stone-800">
                <p className="font-bold text-stone-900 dark:text-stone-100">{selectedMessage.from}</p>
                <p className="text-sm text-stone-500 dark:text-stone-400">{selectedMessage.role}</p>
              </div>

              {/* Messages */}
              <div className="flex flex-col gap-4 p-5">
                {selectedMessage.thread.map((t) => (
                  <div
                    key={t.id}
                    className={`flex ${t.isPatient ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        t.isPatient
                          ? 'rounded-br-sm bg-teal-600 text-white'
                          : 'rounded-bl-sm bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{t.text}</p>
                      <p className={`mt-1.5 text-right text-xs ${t.isPatient ? 'text-teal-200' : 'text-stone-400 dark:text-stone-500'}`}>
                        {t.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply Box */}
              <div className="border-t border-stone-100 p-4 dark:border-stone-800">
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a reply…"
                    className="flex-1 resize-none rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                  />
                  <button
                    type="button"
                    onClick={() => setNewMessage('')}
                    disabled={newMessage.trim() === ''}
                    className="self-end flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
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
