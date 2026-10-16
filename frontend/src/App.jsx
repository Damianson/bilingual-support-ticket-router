import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Send, 
  Sparkles, 
  Filter, 
  RefreshCw, 
  Languages, 
  Clock, 
  Database,
  PlusCircle,
  ChevronDown,
  ChevronUp,
  Flame,
  Check,
  Search
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'billing', label: 'Billing & Invoicing' },
  { id: 'technical_issue', label: 'Technical Issue' },
  { id: 'general_inquiry', label: 'General Inquiry' },
  { id: 'complaint', label: 'Customer Complaint' }
];

const PRESET_PROMPTS = [
  {
    label: "🇫🇷 French Billing Overcharge",
    text: "Bonjour, j'ai remarqué un prélèvement injustifié de 89€ sur ma facture du 10 octobre. Pouvez-vous vérifier et procéder au remboursement rapidement ?"
  },
  {
    label: "🇬🇧 English Critical Bug",
    text: "CRITICAL: Our single sign-on integration broke after the latest release and 200 employees are locked out. Please escalate immediately."
  },
  {
    label: "🇫🇷 French Outage Complaint",
    text: "C'est la troisième fois cette semaine que vos serveurs tombent en panne pendant nos heures d'ouverture. C'est inacceptable et nous perdons des clients !"
  },
  {
    label: "🇬🇧 English Enterprise Inquiry",
    text: "Hi there! We are evaluating your enterprise plan and would love to know if you offer HIPAA compliance agreements and data residency in the EU."
  }
];

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  // New Ticket Form State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    fetchTicketsAndStats();
  }, []);

  const fetchTicketsAndStats = async () => {
    setLoading(true);
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        fetch('/api/tickets/'),
        fetch('/api/tickets/stats/')
      ]);
      
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to load tickets or stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedTickets = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/tickets/seed/', { method: 'POST' });
      if (res.ok) {
        await fetchTicketsAndStats();
      }
    } catch (err) {
      console.error('Failed to seed tickets:', err);
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!originalText.trim()) return;

    setCreating(true);
    try {
      const res = await fetch('/api/tickets/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName || 'Anonymous Customer',
          customer_email: customerEmail || 'customer@example.com',
          original_text: originalText,
        }),
      });
      if (res.ok) {
        setOriginalText('');
        setCustomerName('');
        setCustomerEmail('');
        setShowNewModal(false);
        await fetchTicketsAndStats();
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/set_status/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTickets(prev => prev.map(t => t.id === ticketId ? updated : t));
        fetch('/api/tickets/stats/')
          .then(r => r.json())
          .then(data => setStats(data));
      }
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  };

  // Filter tickets client-side
  const filteredTickets = tickets.filter(ticket => {
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    const matchesLanguage = languageFilter === 'all' || ticket.detected_language === languageFilter;
    const matchesUrgency = urgencyFilter === 'all' || ticket.urgency === urgencyFilter;
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    
    const matchesSearch = searchQuery === '' || 
      ticket.original_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.translated_summary && ticket.translated_summary.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesLanguage && matchesUrgency && matchesStatus && matchesSearch;
  });

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'billing':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">Billing</span>;
      case 'technical_issue':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">Technical Issue</span>;
      case 'complaint':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">Complaint</span>;
      case 'general_inquiry':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">General Inquiry</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300">Unclassified</span>;
    }
  };

  const getLanguageBadge = (lang) => {
    if (lang === 'fr') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <span>🇫🇷</span> French
        </span>
      );
    }
    if (lang === 'en') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 text-sky-900 border border-sky-300">
          <span>🇬🇧</span> English
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
        <span>🌐</span> {lang || 'Unknown'}
      </span>
    );
  };

  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <Flame className="w-3 h-3 text-red-600 fill-red-600" /> High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-green-100 text-green-800 border border-green-300"><Check className="w-3 h-3" /> Resolved</span>;
      case 'in_progress':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">In Progress</span>;
      case 'new':
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">New</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner / Header */}
      <header className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-500/20">
                <Languages className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Bilingual Support Ticket Router
                </h1>
                <p className="text-sm text-slate-500">
                  Automated EN/FR Language Detection, Category Triage & Cross-Lingual Summaries via Gemini 3.8
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={handleSeedTickets}
              disabled={seeding || loading}
              className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <Database className="w-4 h-4 text-blue-600" />
              {seeding ? 'Seeding...' : 'Seed 16 Tickets'}
            </button>

            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm shadow-blue-600/30"
            >
              <PlusCircle className="w-4 h-4" />
              New Ticket
            </button>

            <button
              onClick={fetchTicketsAndStats}
              disabled={loading}
              title="Refresh Inbox"
              className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Streamlined Live Metrics Ribbon */}
        {stats && stats.total > 0 && (
          <div className="mt-4 bg-slate-900 text-white px-4 py-3 rounded-xl flex flex-wrap items-center justify-between text-xs font-medium shadow-xs gap-3">
            <div className="flex items-center gap-3.5 flex-wrap">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Inbox className="w-4 h-4 text-blue-400" />
                Total Tickets: <strong className="text-white text-sm">{stats.total}</strong>
              </span>
              <span className="text-slate-700 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5">
                <span>🇫🇷</span> French: <strong className="text-amber-300 text-sm">{stats.languages?.fr || 0}</strong>
              </span>
              <span className="text-slate-700 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5">
                <span>🇬🇧</span> English: <strong className="text-sky-300 text-sm">{stats.languages?.en || 0}</strong>
              </span>
              <span className="text-slate-700 hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5 text-rose-300">
                <Flame className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                High Urgency: <strong className="text-white text-sm">{stats.urgencies?.high || 0}</strong>
              </span>
            </div>
            <div className="text-[11px] text-slate-400 hidden md:block">
              Engine: <span className="text-emerald-400 font-mono font-semibold">Gemini 3.8 Flash</span>
            </div>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="mt-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search ticket text, customer name, summary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{filteredTickets.length}</span> of <span className="font-bold text-slate-800">{tickets.length}</span> tickets
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Filter:</span>

            {/* Language filter pills */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setLanguageFilter('all')}
                className={`px-2.5 py-1 rounded-md transition ${languageFilter === 'all' ? 'bg-white font-bold text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All Languages
              </button>
              <button
                onClick={() => setLanguageFilter('fr')}
                className={`px-2.5 py-1 rounded-md transition ${languageFilter === 'fr' ? 'bg-white font-bold text-amber-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                🇫🇷 French
              </button>
              <button
                onClick={() => setLanguageFilter('en')}
                className={`px-2.5 py-1 rounded-md transition ${languageFilter === 'en' ? 'bg-white font-bold text-sky-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                🇬🇧 English
              </button>
            </div>

            {/* Category dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            {/* Urgency dropdown */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Urgencies</option>
              <option value="high">🔥 High Urgency</option>
              <option value="medium">Medium Urgency</option>
              <option value="low">Low Urgency</option>
            </select>

            {/* Status dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            {(languageFilter !== 'all' || categoryFilter !== 'all' || urgencyFilter !== 'all' || statusFilter !== 'all' || searchQuery !== '') && (
              <button
                onClick={() => {
                  setLanguageFilter('all');
                  setCategoryFilter('all');
                  setUrgencyFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
                className="text-xs text-blue-600 hover:underline font-medium ml-auto"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Ticket List */}
      <main>
        {loading && tickets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="w-8 h-8 mx-auto text-blue-600 animate-spin mb-3" />
            <p className="text-slate-500 text-sm">Loading tickets from database...</p>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <Inbox className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-800">No tickets found</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              Click <strong>"Seed 16 Tickets"</strong> or use <strong>"New Ticket"</strong> to submit and route customer messages through Gemini.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => {
              const isExpanded = expandedTicketId === ticket.id;
              const isFrench = ticket.detected_language === 'fr';

              return (
                <div
                  key={ticket.id}
                  className={`bg-white rounded-xl border transition shadow-xs overflow-hidden ${
                    ticket.status === 'resolved' 
                      ? 'border-slate-200 opacity-75 bg-slate-50/50' 
                      : ticket.urgency === 'high' 
                        ? 'border-rose-300 hover:border-rose-400' 
                        : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="p-5">
                    {/* Top Row: Meta, Badges, Category, Status */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">#{ticket.id}</span>
                        <span className="font-bold text-slate-800 text-sm">{ticket.customer_name}</span>
                        <span className="text-xs text-slate-400">&bull; {ticket.customer_email}</span>
                      </div>

                      <div className="flex items-center flex-wrap gap-2">
                        {getLanguageBadge(ticket.detected_language)}
                        {getCategoryBadge(ticket.category)}
                        {getUrgencyBadge(ticket.urgency)}
                        {getStatusBadge(ticket.status)}
                        
                        <span className="text-xs text-slate-400 flex items-center gap-1 ml-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Original Ticket Content */}
                    <div className="mb-4">
                      <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 font-sans">
                        "{ticket.original_text}"
                      </p>
                    </div>

                    {/* Cross-Lingual AI Translation & Summary Card */}
                    <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200 rounded-lg p-3.5 shadow-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          {isFrench ? '🇬🇧 English Summary for Support Team:' : '🇫🇷 Résumé Français pour l\'équipe Support:'}
                        </div>
                        {ticket.confidence_score && (
                          <span className="text-[11px] text-blue-700 font-mono font-semibold">
                            Confidence: {(ticket.confidence_score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900 leading-normal">
                        {ticket.translated_summary || 'Analyzing ticket summary...'}
                      </p>
                    </div>

                    {/* Action & Metadata Row */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition font-medium"
                        >
                          {isExpanded ? (
                            <><span>Hide Gemini reasoning</span><ChevronUp className="w-3.5 h-3.5" /></>
                          ) : (
                            <><span>Inspect Gemini reasoning</span><ChevronDown className="w-3.5 h-3.5" /></>
                          )}
                        </button>
                      </div>

                      {/* Status Toggle Action Buttons */}
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-slate-400 mr-1">Status:</span>
                        {ticket.status !== 'new' && (
                          <button
                            onClick={() => handleStatusChange(ticket.id, 'new')}
                            className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                          >
                            New
                          </button>
                        )}
                        {ticket.status !== 'in_progress' && (
                          <button
                            onClick={() => handleStatusChange(ticket.id, 'in_progress')}
                            className="px-2 py-0.5 rounded border border-yellow-300 text-yellow-800 bg-yellow-50 hover:bg-yellow-100 transition font-medium"
                          >
                            In Progress
                          </button>
                        )}
                        {ticket.status !== 'resolved' && (
                          <button
                            onClick={() => handleStatusChange(ticket.id, 'resolved')}
                            className="px-2 py-0.5 rounded border border-green-300 text-green-800 bg-green-50 hover:bg-green-100 transition font-medium"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Collapsible Gemini structured reasoning drawer */}
                    {isExpanded && (
                      <div className="mt-3 p-3.5 bg-slate-900 text-slate-200 rounded-lg text-xs font-mono space-y-1 overflow-x-auto shadow-inner">
                        <div className="text-slate-400 mb-1">// Gemini Structured Output Diagnostic</div>
                        <div>Detected Language: <span className="text-emerald-400">{ticket.detected_language}</span></div>
                        <div>Assigned Queue: <span className="text-indigo-400">{ticket.category}</span></div>
                        <div>Urgency Assessment: <span className={ticket.urgency === 'high' ? 'text-rose-400 font-bold' : 'text-amber-400'}>{ticket.urgency}</span></div>
                        <div>Model Reasoning: <span className="text-slate-300">{ticket.reasoning || 'Triage completed based on customer vocabulary and intent.'}</span></div>
                        <div>Input Length: <span className="text-slate-400">{ticket.original_text.length} characters</span></div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Create Support Ticket</h2>
            <p className="text-xs text-slate-500 mb-4">
              Submit a ticket in English or French. Gemini will automatically detect language, classify category, assess urgency, and produce a cross-lingual summary.
            </p>

            {/* Quick Demo Preset Pills */}
            <div className="mb-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Demo Presets (1-Click Fill):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setOriginalText(preset.text);
                      if (preset.text.startsWith("Bonjour") || preset.text.startsWith("C'est")) {
                        setCustomerName("Jean-Luc Laurent");
                        setCustomerEmail("jeanluc@enterprise.fr");
                      } else {
                        setCustomerName("Alex Rivera");
                        setCustomerEmail("alex.r@apextech.com");
                      }
                    }}
                    className="text-[11px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Jean Dupont or Alice Smith"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Email</label>
                <input
                  type="email"
                  placeholder="e.g. customer@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">Ticket Message (EN or FR)</label>
                  <span className="text-[10px] text-slate-400">{originalText.length} characters</span>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter message in French or English..."
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  {creating ? 'Routing with Gemini...' : 'Route Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
