'use client';

import { useState, useEffect } from 'react';
import { 
  Send, 
  Users, 
  User, 
  QrCode, 
  RefreshCw, 
  MessageSquare, 
  Search,
  CheckCircle2, 
  AlertCircle,
  LogOut,
  ChevronRight
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:3002/whatsapp';
const PRIVATE_KEY = 'Tf4Q*J592#t#9Az@z0T*Lt5sLIg#1=o';

export default function WhatsAppDashboard() {
  const [mobile, setMobile] = useState('');
  const [status, setStatus] = useState('not_started');
  const [qr, setQr] = useState<string | null>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedJids, setSelectedJids] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<'person' | 'groups' | 'number'>('person');
  const [contacts, setContacts] = useState<any[]>([]);
  const [targetNumber, setTargetNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Load contacts from backend
  const fetchContacts = async () => {
    if (status !== 'connected' || !mobile) return;
    try {
      const res = await fetch(`${BACKEND_URL}/contacts?mobile=${mobile}`);
      const data = await res.json();
      if (data.contacts) setContacts(data.contacts);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    }
  };

  useEffect(() => {
    if (status === 'connected' && mode === 'person') fetchContacts();
  }, [status, mode]);

  // Poll for status and QR if not connected
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mobile && status !== 'connected') {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/status?mobile=${mobile}`);
          const data = await res.json();
          setStatus(data.status);

          if (data.status !== 'connected') {
            const qrRes = await fetch(`${BACKEND_URL}/qr?mobile=${mobile}`);
            const qrData = await qrRes.json();
            if (qrData.qr) setQr(qrData.qr);
          } else {
            setQr(null);
            fetchGroups();
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [mobile, status]);

  const startSession = async () => {
    if (!mobile) return setError('Enter mobile number first');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      if (!res.ok) throw new Error('Failed to start session');
      setStatus('initializing');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/groups?mobile=${mobile}`);
      const data = await res.json();
      if (data.groups) setGroups(data.groups);
    } catch (err) {
      console.error('Fetch groups error:', err);
    }
  };

  const toggleJid = (jid: string) => {
    setSelectedJids(prev => 
      prev.includes(jid) ? prev.filter(id => id !== jid) : [...prev, jid]
    );
  };

  const selectAllGroups = () => {
    setSelectedJids(groups.map(g => g.id));
  };

  const sendMessage = async () => {
    let targets = [...selectedJids];
    if (mode === 'number') {
      if (!targetNumber) return setError('Please enter a target number');
      targets = [targetNumber];
    }

    if (targets.length === 0 || !message) return setError('Missing recipient or message');
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    let sentCount = 0;
    try {
      for (const jid of targets) {
        const res = await fetch(`${BACKEND_URL}/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetJid: jid,
            message,
            key: PRIVATE_KEY,
            senderPhoneNo: mobile
          }),
        });
        const data = await res.json();
        if (data.success) sentCount++;
        
        // Add a 2-second delay between messages to prevent spam detection
        if (targets.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      setSuccess(`Successfully sent to ${sentCount} recipient(s)!`);
      setMessage('');
      if (mode !== 'number') setSelectedJids([]);
      if (mode === 'number') setTargetNumber('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch(`${BACKEND_URL}/delete-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      setStatus('not_started');
      setMobile('');
      setQr(null);
      setGroups([]);
      setContacts([]);
      setSelectedJids([]);
      setMessage('');
      setTargetNumber('');
      setError(null);
      setSuccess(null);
      setSearchQuery('');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] dark:bg-[#111b21] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white dark:bg-[#202c33] rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[850px]">
        
        {/* Left Sidebar: Session Management */}
        <div className="w-full md:w-80 bg-[#f0f2f5] dark:bg-[#111b21] border-r border-gray-200 dark:border-gray-700 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
              <MessageSquare className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold dark:text-white">WhatsApp Bot</h1>
          </div>

          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Sender Mobile</label>
              <input
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. 6369427466"
                disabled={status === 'connected'}
                className="w-full px-4 py-3 bg-white dark:bg-[#2a3942] border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white transition-all shadow-sm"
              />
            </div>

            {status !== 'connected' ? (
              <button
                onClick={startSession}
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                {status === 'not_started' ? 'Start Session' : 'Initializing...'}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Connected</span>
                  </div>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Ready to send messages</p>
                </div>
                <button
                  onClick={logout}
                  className="w-full py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Logout Session
                </button>
              </div>
            )}

            {qr && status !== 'connected' && (
              <div className="mt-8 p-4 bg-white dark:bg-white rounded-2xl shadow-inner flex flex-col items-center">
                <p className="text-xs text-gray-500 mb-4 text-center">Scan QR with your WhatsApp</p>
                <img src={qr} alt="QR Code" className="w-full aspect-square" />
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Messaging */}
        <div className="flex-1 flex flex-col bg-white dark:bg-[#0b141a]">
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold dark:text-white">Broadcast Message</h2>
            <div className="flex bg-[#f0f2f5] dark:bg-[#202c33] p-1 rounded-lg">
              <button
                onClick={() => { setMode('person'); setSelectedJids([]); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'person' ? 'bg-white dark:bg-[#2a3942] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500'}`}
              >
                Person
              </button>
              <button
                onClick={() => { setMode('groups'); setSelectedJids([]); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'groups' ? 'bg-white dark:bg-[#2a3942] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500'}`}
              >
                Groups
              </button>
              <button
                onClick={() => { setMode('number'); setSelectedJids([]); }}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'number' ? 'bg-white dark:bg-[#2a3942] text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500'}`}
              >
                Number
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-8 overflow-y-auto space-y-8 flex-1">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}
              
              {success && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{success}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-8">
                {mode === 'groups' ? (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Select Groups ({selectedJids.length})</label>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={fetchGroups}
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                            title="Refresh Groups"
                          >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                          </button>
                          <button 
                            onClick={() => setSelectedJids(groups.map(g => g.id))}
                            className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold hover:bg-emerald-200"
                          >
                            SELECT ALL
                          </button>
                          <button 
                            onClick={() => setSelectedJids([])}
                            className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold hover:bg-gray-200"
                          >
                            DESELECT ALL
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search groups..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-[#f0f2f5] dark:bg-[#202c33] rounded-xl text-sm outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-48"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {groups.filter(g => g.subject?.toLowerCase().includes(searchQuery.toLowerCase())).map((g) => (
                        <div
                          key={g.id}
                          onClick={() => toggleJid(g.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${selectedJids.includes(g.id) ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-500/10' : 'bg-[#f0f2f5] dark:bg-[#202c33] border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${selectedJids.includes(g.id) ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                              <Users className={`w-5 h-5 ${selectedJids.includes(g.id) ? 'text-white' : 'text-gray-500'}`} />
                            </div>
                            <div className="truncate max-w-[120px]">
                              <h3 className="font-semibold text-sm truncate dark:text-white">{g.subject}</h3>
                              <p className="text-[10px] text-gray-500 truncate">{g.id.split('@')[0]}</p>
                            </div>
                          </div>
                          {selectedJids.includes(g.id) && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                        </div>
                      ))}
                      {groups.filter(g => g.subject?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <p className="text-sm text-gray-500 col-span-full text-center py-12 bg-[#f0f2f5] dark:bg-[#202c33] rounded-2xl italic">
                          {status === 'connected' ? 'No matching groups found. Click refresh if missing.' : 'Connect to view groups'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : mode === 'person' ? (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Select Contacts ({selectedJids.length})</label>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={fetchContacts}
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                          </button>
                          <button 
                            onClick={() => setSelectedJids([])}
                            className="text-[10px] bg-gray-100 text-gray-700 px-2 py-1 rounded font-bold hover:bg-gray-200"
                          >
                            DESELECT ALL
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search contacts..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-[#f0f2f5] dark:bg-[#202c33] rounded-xl text-sm outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-48"
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {contacts.filter(c => (c.name || c.verifiedName || '').toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? 
                       contacts.filter(c => (c.name || c.verifiedName || '').toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => toggleJid(c.id)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${selectedJids.includes(c.id) ? 'bg-emerald-50 border-emerald-500 dark:bg-emerald-500/10' : 'bg-[#f0f2f5] dark:bg-[#202c33] border-transparent hover:border-gray-300 dark:hover:border-gray-600'}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${selectedJids.includes(c.id) ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`}>
                              <User className={`w-5 h-5 ${selectedJids.includes(c.id) ? 'text-white' : 'text-gray-500'}`} />
                            </div>
                            <div className="truncate max-w-[120px]">
                              <h3 className="font-semibold text-sm truncate dark:text-white">{c.name || c.verifiedName || 'Unknown'}</h3>
                              <p className="text-[10px] text-gray-500 truncate">{c.id.split('@')[0]}</p>
                            </div>
                          </div>
                          {selectedJids.includes(c.id) && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                        </div>
                      )) : (
                        <p className="text-sm text-gray-500 col-span-full text-center py-12 bg-[#f0f2f5] dark:bg-[#202c33] rounded-2xl italic">
                          {status === 'connected' ? 'No matching contacts found' : 'Connect to sync your contacts'}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Target Phone Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. 6369427466 or +916369427466"
                        value={targetNumber}
                        onChange={(e) => setTargetNumber(e.target.value)}
                        className="w-full px-4 py-4 bg-[#f0f2f5] dark:bg-[#202c33] border-none rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white transition-all shadow-sm"
                      />
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 italic">Enter the number with or without country code.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Message Content</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full p-6 bg-[#f0f2f5] dark:bg-[#202c33] border-none rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white min-h-[150px] resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-[#f0f2f5] dark:bg-[#202c33] border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <div className="text-sm text-gray-500 italic">
                {mode === 'number' ? (targetNumber ? `Target: ${targetNumber}` : 'Enter target number') : 
                 selectedJids.length > 0 ? `Selected: ${selectedJids.length} recipient(s)` : 'Select a recipient'}
              </div>
              <button
                onClick={sendMessage}
                disabled={loading || status !== 'connected' || (mode !== 'number' && selectedJids.length === 0) || (mode === 'number' && !targetNumber)}
                className="px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold flex items-center gap-3 transition-all disabled:opacity-50 shadow-xl shadow-emerald-500/20 active:scale-95"
              >
                {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : (
                  <>
                    <span>Send Broadcast</span>
                    <Send className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
