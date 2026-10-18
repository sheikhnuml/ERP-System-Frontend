import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Users, Plus, Search, RefreshCw, LayoutGrid, List, 
  Phone, Mail, Building2, ChevronRight, 
  ChevronLeft, Trash2, Edit2, X, CheckCircle2, Clock,
  Briefcase, ArrowUpRight, Check, TrendingUp, DollarSign
} from 'lucide-react';

// ============================================================================
// SYSTEM COLOR PALETTE SPECIFICATION
// Primary: #0F52BA / #4F46E5 | Energy: #06B6D4 / #10B981
// Neutral: #F8FAFC / #FFFFFF | Micro-Accents: #F59E0B / #EF4444
// ============================================================================

const STAGES = [
  { id: 'new', label: 'New Inquiries', color: 'bg-[#0F52BA]/10 text-[#0F52BA] border-[#0F52BA]/30', dot: 'bg-[#0F52BA]' },
  { id: 'contacted', label: 'In Discussion', color: 'bg-[#4F46E5]/10 text-[#4F46E5] border-[#4F46E5]/30', dot: 'bg-[#4F46E5]' },
  { id: 'proposal', label: 'Proposal Sent', color: 'bg-[#06B6D4]/10 text-[#06B6D4] border-[#06B6D4]/30', dot: 'bg-[#06B6D4]' },
  { id: 'negotiation', label: 'Negotiation', color: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30', dot: 'bg-[#F59E0B]' },
  { id: 'won', label: 'Closed Won', color: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30', dot: 'bg-[#10B981]' },
  { id: 'lost', label: 'Closed Lost', color: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30', dot: 'bg-[#EF4444]' }
];

const PRIORITIES = {
  low: { label: 'Low', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium: { label: 'Medium', badge: 'bg-[#0F52BA]/10 text-[#0F52BA] border-[#0F52BA]/30' },
  high: { label: 'High', badge: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30' },
  urgent: { label: 'Urgent', badge: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30 font-bold' }
};

export default function CRM() {
  const [leads, setLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    client_name: '',
    company_name: '',
    phone: '',
    email: '',
    deal_value: 0,
    stage: 'new',
    priority: 'medium',
    assigned_to: 'Hamza Tariq',
    notes: ''
  });

  const loadLeads = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/crm/leads');
      setLeads(res.data || []);
    } catch (err) {
      console.error('Failed to load CRM opportunities:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingLead(null);
    setFormData({
      title: '',
      client_name: '',
      company_name: '',
      phone: '',
      email: '',
      deal_value: 0,
      stage: 'new',
      priority: 'medium',
      assigned_to: 'Hamza Tariq',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead) => {
    setEditingLead(lead);
    setFormData({
      title: lead.title,
      client_name: lead.client_name,
      company_name: lead.company_name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      deal_value: lead.deal_value || 0,
      stage: lead.stage || 'new',
      priority: lead.priority || 'medium',
      assigned_to: lead.assigned_to || 'Unassigned',
      notes: lead.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingLead) {
        await axios.put(`http://localhost:5000/api/crm/leads/${editingLead.id}`, formData);
      } else {
        await axios.post('http://localhost:5000/api/crm/leads', formData);
      }
      setIsModalOpen(false);
      loadLeads();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save lead information.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStageChange = async (leadId, targetStage) => {
    try {
      await axios.put(`http://localhost:5000/api/crm/leads/${leadId}/stage`, { stage: targetStage });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: targetStage } : l));
    } catch (err) {
      alert('Failed to update stage transition.');
    }
  };

  const handleDeleteLead = async (leadId, title) => {
    if (window.confirm(`Permanently remove lead "${title}"?`)) {
      try {
        await axios.delete(`http://localhost:5000/api/crm/leads/${leadId}`);
        setLeads(prev => prev.filter(l => l.id !== leadId));
      } catch (err) {
        alert('Failed to delete lead.');
      }
    }
  };

  const filteredLeads = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return leads.filter(l => {
      const matchesSearch = !q || 
        l.title?.toLowerCase().includes(q) || 
        l.client_name?.toLowerCase().includes(q) || 
        l.company_name?.toLowerCase().includes(q);
      const matchesStage = stageFilter === 'all' || l.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [leads, searchQuery, stageFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const totalPipelineValue = leads.reduce((sum, l) => sum + Number(l.deal_value || 0), 0);
    const wonDeals = leads.filter(l => l.stage === 'won');
    const wonValue = wonDeals.reduce((sum, l) => sum + Number(l.deal_value || 0), 0);
    const activeDeals = leads.filter(l => l.stage !== 'won' && l.stage !== 'lost').length;
    const closedCount = leads.filter(l => l.stage === 'won' || l.stage === 'lost').length;
    const winRate = closedCount > 0 ? Math.round((wonDeals.length / closedCount) * 100) : 0;
    return { totalPipelineValue, activeDeals, wonValue, winRate };
  }, [leads]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8 font-sans select-none bg-[#F8FAFC]">

      {/* Embedded Smooth Scrollbars */}
      <style>{`
        .kanban-board-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .kanban-board-scroll::-webkit-scrollbar-track {
          background: #F8FAFC;
          border-radius: 9999px;
        }
        .kanban-board-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 9999px;
        }
        .kanban-board-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .kanban-col-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .kanban-col-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .kanban-col-scroll::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 9999px;
        }
      `}</style>

      {/* 1. Header Bar (60% Primary Sapphire #0F52BA & Neutral #FFFFFF) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FFFFFF] px-5 py-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0F52BA]/10 border border-[#0F52BA]/20 flex items-center justify-center text-[#0F52BA] shrink-0">
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
                CRM Commercial Pipeline
              </h1>
              <span className="text-[11px] font-semibold text-[#0F52BA] bg-[#0F52BA]/10 border border-[#0F52BA]/20 px-2 py-0.5 rounded-full leading-none">
                {leads.length} Registered Deals
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-1 leading-none">
              Track business inquiries, bulk quotations, and wholesale commercial opportunities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center bg-[#F8FAFC] p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'kanban' 
                  ? 'bg-[#FFFFFF] text-[#0F52BA] shadow-2xs border border-slate-200/80' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid size={13} />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-[#FFFFFF] text-[#0F52BA] shadow-2xs border border-slate-200/80' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tabular List View"
            >
              <List size={13} />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          <button 
            onClick={loadLeads} 
            title="Refresh Leads" 
            className="h-8 px-2.5 flex items-center justify-center bg-[#FFFFFF] border border-slate-300 hover:border-[#0F52BA] hover:text-[#0F52BA] rounded-lg text-slate-600 transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin text-[#0F52BA]' : ''} />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="h-8 px-3.5 flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Plus size={14} />
            <span>New Commercial Lead</span>
          </button>
        </div>
      </div>

      {/* 2. Micro KPI Strip (10% Energy Cyan #06B6D4 & Emerald #10B981) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Pipeline Value</span>
          <div className="text-xl font-black text-slate-900 mt-1">Rs {stats.totalPipelineValue.toLocaleString()}</div>
          <div className="text-[11px] text-[#4F46E5] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]"></span>
            Active Commercial Reserve
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#06B6D4]/30 bg-[#06B6D4]/5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#06B6D4] block">Active Pipeline Deals</span>
          <div className="text-xl font-black text-[#06B6D4] mt-1">{stats.activeDeals} In Progress</div>
          <div className="text-[11px] text-[#06B6D4] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4]"></span>
            Ongoing Negotiations
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#10B981] block">Total Won Revenue</span>
          <div className="text-xl font-black text-[#10B981] mt-1">Rs {stats.wonValue.toLocaleString()}</div>
          <div className="text-[11px] text-[#10B981] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
            Closed Deals
          </div>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Lead Conversion Rate</span>
          <div className="text-xl font-black text-slate-900 mt-1">{stats.winRate}%</div>
          <div className="text-[11px] text-[#0F52BA] font-semibold mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0F52BA]"></span>
            Successful Transition
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="bg-[#FFFFFF] p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Search leads by title, client, company..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="h-8 w-full pl-8 pr-7 border border-slate-300 rounded-lg text-xs bg-[#FFFFFF] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="h-8 border border-slate-300 rounded-lg px-2.5 text-xs font-medium text-slate-700 bg-[#FFFFFF] focus:outline-none focus:border-[#0F52BA] cursor-pointer w-full sm:w-auto"
          >
            <option value="all">All Pipeline Stages</option>
            {STAGES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-2 bg-[#FFFFFF] rounded-xl border border-slate-200">
          <div className="w-5 h-5 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">Loading commercial pipeline...</p>
        </div>
      ) : viewMode === 'kanban' ? (
        
        /* KANBAN BOARD CONTAINER */
        <div className="flex gap-3.5 overflow-x-auto pb-4 items-start kanban-board-scroll">
          {STAGES.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage.id);
            const stageTotal = stageLeads.reduce((s, l) => s + Number(l.deal_value || 0), 0);

            return (
              <div 
                key={stage.id} 
                className="w-72 min-w-[280px] shrink-0 bg-[#F8FAFC] border border-slate-200/90 rounded-xl p-3 flex flex-col max-h-[72vh]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                    <span className="text-xs font-bold text-slate-800 tracking-tight">{stage.label}</span>
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                      {stageLeads.length}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold font-mono">
                    Rs {stageTotal > 0 ? (stageTotal / 1000).toLocaleString() + 'k' : '0'}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 kanban-col-scroll">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-9 text-[11px] text-slate-400 border border-dashed border-slate-200 rounded-lg bg-[#FFFFFF]/60">
                      Empty stage
                    </div>
                  ) : (
                    stageLeads.map(lead => {
                      const priorityConfig = PRIORITIES[lead.priority] || PRIORITIES.medium;
                      const currentStageIdx = STAGES.findIndex(s => s.id === lead.stage);

                      return (
                        <div 
                          key={lead.id} 
                          className="bg-[#FFFFFF] p-3.5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs hover:border-[#0F52BA]/40 transition-all group"
                        >
                          {/* Priority Badge & Actions */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${priorityConfig.badge}`}>
                              {priorityConfig.label}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleOpenEditModal(lead)} 
                                className="p-1 text-slate-400 hover:text-[#0F52BA] hover:bg-[#0F52BA]/10 rounded transition-colors cursor-pointer"
                                title="Edit Lead"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button 
                                onClick={() => handleDeleteLead(lead.id, lead.title)} 
                                className="p-1 text-slate-400 hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded transition-colors cursor-pointer"
                                title="Delete Lead"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          {/* Title & Client */}
                          <h4 className="text-xs font-bold text-slate-900 leading-snug tracking-tight">
                            {lead.title}
                          </h4>

                          <p className="text-[11px] text-slate-600 font-semibold mt-1 truncate">
                            {lead.client_name}
                          </p>

                          {lead.company_name && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 truncate">
                              <Building2 size={11} className="shrink-0" />
                              <span className="truncate">{lead.company_name}</span>
                            </p>
                          )}

                          {/* Deal Value & Rep */}
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="font-bold text-xs text-[#10B981]">
                              Rs {Number(lead.deal_value).toLocaleString()}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium truncate max-w-[105px]" title={lead.assigned_to}>
                              {lead.assigned_to}
                            </span>
                          </div>

                          {/* Stage Transition Selector */}
                          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                            <button
                              disabled={currentStageIdx <= 0}
                              onClick={() => handleStageChange(lead.id, STAGES[currentStageIdx - 1].id)}
                              className="p-1 rounded text-slate-400 hover:text-[#0F52BA] hover:bg-[#0F52BA]/10 disabled:opacity-20 cursor-pointer transition-colors"
                              title="Previous Stage"
                            >
                              <ChevronLeft size={14} />
                            </button>

                            <select
                              value={lead.stage}
                              onChange={e => handleStageChange(lead.id, e.target.value)}
                              className="text-[10px] bg-[#F8FAFC] border border-slate-200 rounded-md px-1.5 py-1 font-semibold text-slate-700 cursor-pointer focus:outline-none focus:border-[#0F52BA] flex-1 text-center"
                            >
                              {STAGES.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                              ))}
                            </select>

                            <button
                              disabled={currentStageIdx >= STAGES.length - 1}
                              onClick={() => handleStageChange(lead.id, STAGES[currentStageIdx + 1].id)}
                              className="p-1 rounded text-slate-400 hover:text-[#0F52BA] hover:bg-[#0F52BA]/10 disabled:opacity-20 cursor-pointer transition-colors"
                              title="Next Stage"
                            >
                              <ChevronRight size={14} />
                            </button>
                          </div>

                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            );
          })}
        </div>
      ) : (

        /* TABULAR LIST VIEW */
        <div className="bg-[#FFFFFF] rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left text-xs min-w-[820px] border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-slate-200 text-slate-600 uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 whitespace-nowrap">Commercial Deal</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Client Contact</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Deal Value</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Pipeline Stage</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Priority</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Assigned Rep</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.map(lead => {
                  const stageObj = STAGES.find(s => s.id === lead.stage) || STAGES[0];
                  const priorityObj = PRIORITIES[lead.priority] || PRIORITIES.medium;

                  return (
                    <tr key={lead.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <div>{lead.title}</div>
                        {lead.company_name && (
                          <span className="text-[11px] text-slate-400 font-normal block">
                            Company: {lead.company_name}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{lead.client_name}</div>
                        <div className="text-[11px] text-slate-400">{lead.phone || '--'}</div>
                      </td>

                      <td className="py-2.5 px-3 font-bold text-[#10B981] whitespace-nowrap text-xs">
                        Rs {Number(lead.deal_value).toLocaleString()}
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${stageObj.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stageObj.dot}`} />
                          {stageObj.label}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] border ${priorityObj.badge}`}>
                          {priorityObj.label}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {lead.assigned_to}
                      </td>

                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(lead)}
                            className="p-1.5 text-slate-400 hover:text-[#0F52BA] hover:bg-[#0F52BA]/10 rounded-md transition-colors cursor-pointer"
                            title="Edit Lead"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteLead(lead.id, lead.title)}
                            className="p-1.5 text-slate-400 hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-md transition-colors cursor-pointer"
                            title="Delete Lead"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. CREATE & EDIT LEAD MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#FFFFFF] rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="px-5 py-3.5 border-b border-slate-200 bg-[#F8FAFC] flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#0F52BA]/10 text-[#0F52BA] flex items-center justify-center">
                  <Users size={14} />
                </div>
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  {editingLead ? 'Update Commercial Lead' : 'Register Commercial Lead'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opportunity Title <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 50 Barcode Scanners Bulk Supply"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Client Contact Person <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asim Raza"
                    value={formData.client_name}
                    onChange={e => setFormData({ ...formData, client_name: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Organization</label>
                  <input
                    type="text"
                    placeholder="e.g. Horizon Logistics Ltd"
                    value={formData.company_name}
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 0300-1234567"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. asim@horizon.com"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deal Value (Rs)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={formData.deal_value}
                    onChange={e => setFormData({ ...formData, deal_value: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pipeline Stage</label>
                  <select
                    value={formData.stage}
                    onChange={e => setFormData({ ...formData, stage: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2 text-xs bg-[#FFFFFF] text-slate-900 focus:outline-none focus:border-[#0F52BA] cursor-pointer"
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="h-8 w-full border border-slate-300 rounded-lg px-2 text-xs bg-[#FFFFFF] text-slate-900 focus:outline-none focus:border-[#0F52BA] cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Sales Rep</label>
                <input
                  type="text"
                  placeholder="e.g. Hamza Tariq"
                  value={formData.assigned_to}
                  onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                  className="h-8 w-full border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes & Discussion</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Client requested customized bulk packing and delivery next week."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F52BA] focus:ring-2 focus:ring-[#0F52BA]/15 transition-all"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 px-3.5 bg-[#FFFFFF] border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-8 px-4 bg-[#0F52BA] hover:bg-[#0c449c] text-[#FFFFFF] text-xs font-semibold rounded-lg transition-all disabled:opacity-40 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : editingLead ? 'Update Lead' : 'Create Opportunity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}