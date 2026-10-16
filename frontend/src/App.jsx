import React, { useState, useEffect, useMemo } from 'react';
import { 
  Inbox, 
  Search, 
  Filter, 
  RefreshCw, 
  Languages, 
  Clock, 
  Database,
  Plus,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'billing', label: 'Billing & Invoicing' },
  { id: 'technical_issue', label: 'Technical Issue' },
  { id: 'general_inquiry', label: 'General Inquiry' },
  { id: 'complaint', label: 'Customer Complaint' }
];

const PRESET_SCENARIOS = [
  {
    id: 'fr-billing',
    label: 'Billing Dispute (FR)',
    customerName: 'Jean-Luc Laurent',
    customerEmail: 'j.laurent@enterprise.fr',
    text: "Bonjour, j'ai remarqué un prélèvement injustifié de 89€ sur ma facture du 10 octobre. Pouvez-vous vérifier et procéder au remboursement rapidement ?"
  },
  {
    id: 'en-outage',
    label: 'SSO Outage (EN)',
    customerName: 'Alex Rivera',
    customerEmail: 'alex.r@apextech.com',
    text: "CRITICAL: Our single sign-on integration broke after the latest release and 200 employees are locked out. Please escalate immediately."
  },
  {
    id: 'fr-downtime',
    label: 'Service Reliability (FR)',
    customerName: 'Julien Moreau',
    customerEmail: 'j.moreau@commerce-express.fr',
    text: "C'est la troisième fois cette semaine que vos serveurs tombent en panne pendant nos heures d'ouverture. C'est inacceptable et nous perdons des clients !"
  },
  {
    id: 'en-enterprise',
    label: 'Enterprise Compliance (EN)',
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah.j@novasoft.io',
    text: "Hi there! We are evaluating your enterprise plan and would love to know if you offer HIPAA compliance agreements and data residency in the EU."
  }
];

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  
  // Filter state
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Expanded diagnostics state
  const [expandedTicketId, setExpandedTicketId] = useState(null);

  // New ticket form state
  const [showNewModal, setShowNewModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [originalText, setOriginalText] = useState('');

  useEffect(() => {
    fetchTicketsAndStats();
  }, []);

  const fetchTicketsAndStats = async () => {
    setLoading(true);
    setErrorMessage(null);
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
      setErrorMessage('Unable to synchronize with backend service.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedTickets = async () => {
    setSeeding(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/tickets/seed/', { method: 'POST' });
      if (res.ok) {
        await fetchTicketsAndStats();
      } else {
        const errData = await res.json();
        setErrorMessage(errData.detail || 'Seeding failed.');
      }
    } catch (err) {
      console.error('Failed to seed tickets:', err);
      setErrorMessage('Network error while triggering seed routine.');
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!originalText.trim()) return;

    setCreating(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/tickets/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName.trim() || 'Anonymous Customer',
          customer_email: customerEmail.trim() || 'customer@example.com',
          original_text: originalText.trim(),
        }),
      });

      if (res.ok) {
        setOriginalText('');
        setCustomerName('');
        setCustomerEmail('');
        setShowNewModal(false);
        await fetchTicketsAndStats();
      } else {
        const errData = await res.json();
        const msg = errData.original_text || errData.detail || 'Ticket triage submission failed.';
        setErrorMessage(Array.isArray(msg) ? msg.join(' ') : msg);
      }
    } catch (err) {
      console.error('Failed to create ticket:', err);
      setErrorMessage('Network error while contacting triage engine.');
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

  const applyPreset = (preset) => {
    setCustomerName(preset.customerName);
    setCustomerEmail(preset.customerEmail);
    setOriginalText(preset.text);
  };

  const resetFilters = () => {
    setLanguageFilter('all');
    setCategoryFilter('all');
    setUrgencyFilter('all');
    setStatusFilter('all');
    setSearchQuery('');
  };

  const isFilterActive = useMemo(() => {
    return languageFilter !== 'all' || 
           categoryFilter !== 'all' || 
           urgencyFilter !== 'all' || 
           statusFilter !== 'all' || 
           searchQuery.trim() !== '';
  }, [languageFilter, categoryFilter, urgencyFilter, statusFilter, searchQuery]);

  const filteredTickets = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return tickets.filter(ticket => {
      if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
      if (languageFilter !== 'all' && ticket.detected_language !== languageFilter) return false;
      if (urgencyFilter !== 'all' && ticket.urgency !== urgencyFilter) return false;
      if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;

      if (query) {
        const textMatch = ticket.original_text?.toLowerCase().includes(query);
        const nameMatch = ticket.customer_name?.toLowerCase().includes(query);
        const emailMatch = ticket.customer_email?.toLowerCase().includes(query);
        const summaryMatch = ticket.translated_summary?.toLowerCase().includes(query);
        return textMatch || nameMatch || emailMatch || summaryMatch;
      }
      return true;
    });
  }, [tickets, categoryFilter, languageFilter, urgencyFilter, statusFilter, searchQuery]);

  const renderLanguageBadge = (lang) => {
    const isFr = lang === 'fr';
    const isEn = lang === 'en';
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
        {isFr ? 'FR' : isEn ? 'EN' : lang || 'UNKNOWN'}
      </span>
    );
  };

  const renderCategoryBadge = (category) => {
    switch (category) {
      case 'billing':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Billing
          </span>
        );
      case 'technical_issue':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
            Technical Issue
          </span>
        );
      case 'complaint':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            Customer Complaint
          </span>
        );
      case 'general_inquiry':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
            General Inquiry
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            Unassigned
          </span>
        );
    }
  };

  const renderUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-600" />
            High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Resolved
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            In Progress
          </span>
        );
      case 'new':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            New
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top Application Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-900 text-white rounded-lg">
                <Languages className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-base">
                    Bilingual Support Ticket Router
                  </span>
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                    EN / FR Triage
                  </span>
                </div>
                <p className="text-xs text-slate-500 hidden md:block">
                  Automated language detection, queue classification, and cross-lingual summarization
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 pr-2 border-r border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Gemini 3.8 Flash Active</span>
              </div>

              <button
                type="button"
                onClick={handleSeedTickets}
                disabled={seeding || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition disabled:opacity-50"
              >
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>{seeding ? 'Seeding...' : 'Seed Dataset'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Ticket</span>
              </button>

              <button
                type="button"
                onClick={fetchTicketsAndStats}
                disabled={loading}
                title="Refresh Tickets"
                className="p-1.5 border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Error notification banner */}
        {errorMessage && (
          <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-600 hover:text-rose-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Operational Metrics Panel */}
        {stats && stats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white border border-slate-200 rounded-lg p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Ingested
              </span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {stats.total}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Pending Triage
              </span>
              <span className="text-xl font-bold text-slate-900 mt-1 block">
                {stats.unresolved ?? (stats.total - (stats.statuses?.resolved || 0))}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Language Ratio
              </span>
              <div className="text-sm font-semibold text-slate-800 mt-1.5 flex items-center gap-2">
                <span>FR: {stats.languages?.fr || 0}</span>
                <span className="text-slate-300">|</span>
                <span>EN: {stats.languages?.en || 0}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                High Priority
              </span>
              <span className="text-xl font-bold text-rose-600 mt-1 block">
                {stats.urgencies?.high || 0}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Model Confidence
              </span>
              <span className="text-xl font-bold text-slate-900 mt-1 block font-mono">
                {(stats.avg_confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}

        {/* Unified Search and Filtering Toolbar */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search ticket text, customer name, summary..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition"
              />
            </div>

            <div className="text-xs text-slate-500 self-center sm:self-auto">
              Displaying <span className="font-semibold text-slate-900">{filteredTickets.length}</span> of <span className="font-semibold text-slate-900">{tickets.length}</span> tickets
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            {/* Language Segmented Control */}
            <div className="flex bg-slate-100 p-0.5 rounded-md text-xs">
              <button
                type="button"
                onClick={() => setLanguageFilter('all')}
                className={`px-2.5 py-1 rounded transition ${languageFilter === 'all' ? 'bg-white font-medium text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                All Languages
              </button>
              <button
                type="button"
                onClick={() => setLanguageFilter('fr')}
                className={`px-2.5 py-1 rounded transition ${languageFilter === 'fr' ? 'bg-white font-medium text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                French (FR)
              </button>
              <button
                type="button"
                onClick={() => setLanguageFilter('en')}
                className={`px-2.5 py-1 rounded transition ${languageFilter === 'en' ? 'bg-white font-medium text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                English (EN)
              </button>
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>

            {/* Urgency Dropdown */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>

            {isFilterActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium ml-auto"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>

        {/* Tickets Feed */}
        <main>
          {loading && tickets.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg border border-slate-200">
              <RefreshCw className="w-6 h-6 mx-auto text-slate-400 animate-spin mb-2" />
              <p className="text-slate-500 text-xs">Retrieving ticket records...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-slate-200">
              <Inbox className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">No matching tickets</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No tickets match your active filter criteria. Adjust the filters or click "Seed Dataset" to populate realistic entries.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredTickets.map((ticket) => {
                const isExpanded = expandedTicketId === ticket.id;
                const isFrench = ticket.detected_language === 'fr';

                return (
                  <article
                    key={ticket.id}
                    className={`bg-white border rounded-lg transition-colors overflow-hidden ${
                      ticket.status === 'resolved' 
                        ? 'border-slate-200 opacity-80' 
                        : ticket.urgency === 'high' 
                          ? 'border-rose-300 hover:border-rose-400' 
                          : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="p-4 sm:p-5">
                      {/* Ticket Header & Metadata */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-medium text-slate-400">
                            #{ticket.id}
                          </span>
                          <span className="font-semibold text-slate-900 text-sm">
                            {ticket.customer_name}
                          </span>
                          <span className="text-xs text-slate-400">
                            &bull; {ticket.customer_email}
                          </span>
                        </div>

                        <div className="flex items-center flex-wrap gap-1.5">
                          {renderLanguageBadge(ticket.detected_language)}
                          {renderCategoryBadge(ticket.category)}
                          {renderUrgencyBadge(ticket.urgency)}
                          {renderStatusBadge(ticket.status)}
                          
                          <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-1 font-mono">
                            <Clock className="w-3 h-3" />
                            {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Original Customer Message */}
                      <div className="mb-3.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Incoming Message ({ticket.detected_language?.toUpperCase() || 'RAW'}):
                        </span>
                        <div className="text-xs text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-md border border-slate-200/60 font-sans">
                          {ticket.original_text}
                        </div>
                      </div>

                      {/* Cross-Lingual Triage Translation & Summary */}
                      <div className="bg-blue-50/40 border border-blue-200/70 rounded-md p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-900">
                            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                            <span>
                              {isFrench 
                                ? 'Cross-Lingual Summary (Target: English)' 
                                : 'Cross-Lingual Summary (Target: French)'}
                            </span>
                          </div>
                          {typeof ticket.confidence_score === 'number' && (
                            <span className="text-[11px] text-blue-700 font-mono font-medium">
                              Confidence: {(ticket.confidence_score * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-800 leading-relaxed">
                          {ticket.translated_summary || 'Triage summary pending...'}
                        </p>
                      </div>

                      {/* Card Footer: Diagnostics Toggle & Workflow Actions */}
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
                        <button
                          type="button"
                          onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                          className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition"
                        >
                          <span>{isExpanded ? 'Hide Triage Audit' : 'Inspect Triage Audit'}</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Workflow:</span>
                          {ticket.status !== 'new' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(ticket.id, 'new')}
                              className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                            >
                              New
                            </button>
                          )}
                          {ticket.status !== 'in_progress' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(ticket.id, 'in_progress')}
                              className="px-2 py-0.5 rounded border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition font-medium"
                            >
                              In Progress
                            </button>
                          )}
                          {ticket.status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => handleStatusChange(ticket.id, 'resolved')}
                              className="px-2 py-0.5 rounded border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition font-medium"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Collapsible Diagnostic Audit Drawer */}
                      {isExpanded && (
                        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 space-y-2">
                          <div className="font-semibold text-slate-800 text-[11px] uppercase tracking-wider pb-1 border-b border-slate-200">
                            Deterministic Model Audit Trail
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-500 block">Language Detection:</span>
                              <span className="font-medium text-slate-800">{ticket.detected_language === 'fr' ? 'French (fr)' : 'English (en)'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Assigned Queue:</span>
                              <span className="font-medium text-slate-800">{ticket.category}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Urgency Assessment:</span>
                              <span className="font-medium text-slate-800">{ticket.urgency}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Payload Size:</span>
                              <span className="font-medium text-slate-800">{ticket.original_text.length} characters</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500 block mb-0.5">Classification Reasoning:</span>
                            <p className="text-slate-700 bg-white p-2 rounded border border-slate-200/60 leading-relaxed font-sans">
                              {ticket.reasoning || 'Classification inferred from semantic vocabulary and intent analysis.'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-5 sm:p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">
                Submit Support Ticket
              </h2>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2 mb-3">
              Input a customer message in English or French. Gemini will automatically classify category, assess urgency, and produce a cross-lingual summary.
            </p>

            {/* Quick Presets */}
            <div className="mb-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Quick Demonstration Scenarios:
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESET_SCENARIOS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="text-left text-xs bg-slate-50 hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded border border-slate-200 transition truncate"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jean-Luc Laurent"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Customer Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. j.laurent@enterprise.fr"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Ticket Message (English or French)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {originalText.length} chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  placeholder="Type or paste customer inquiry in French or English..."
                  value={originalText}
                  onChange={(e) => setOriginalText(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md px-3 py-2 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition disabled:opacity-50"
                >
                  {creating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{creating ? 'Triaging with Gemini...' : 'Analyze & Create Ticket'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
