import React, { useState, useEffect } from 'react';
import {
  Heart,
  Activity,
  Users,
  ClipboardList,
  Search,
  User as UserIcon,
  LogIn,
  LogOut,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { User, Role, Organ, OrganRequest, Match } from './types';
import { cn } from './utils';

// --- API SERVICE ---

const API_URL = 'http://localhost:8000';

const api = {
  async fetch(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };
    let normalizedEndpoint = endpoint;
    const [path, query] = endpoint.split('?');
    if (!path.endsWith('/')) {
      normalizedEndpoint = `${path}/${query ? `?${query}` : ''}`;
    }
    const response = await fetch(`${API_URL}${normalizedEndpoint}`, { ...options, headers });

    const text = await response.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      data = null;
    }

    if (!response.ok) {
      let errorMessage = data?.error || 'Something went wrong';
      if (!data) {
        if (text.includes('<title>Vite') || text.includes('<!DOCTYPE html>')) {
          errorMessage = `API Route not found (404). Endpoint: ${endpoint}`;
        } else {
          errorMessage = `Server Error (${response.status}): ${text.slice(0, 100)}...`;
        }
      }
      throw new Error(errorMessage);
    }

    if (text && !data) {
      throw new Error(`Invalid JSON response from server: ${text.slice(0, 100)}...`);
    }

    return data;
  }
};

// --- COMPONENTS ---

const Badge = ({ children, variant = 'default', className }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'danger' | 'info', className?: string }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-rose-100 text-rose-800',
    info: 'bg-sky-100 text-sky-800',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
};

const Card = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <div className={cn('bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden', className)}>
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
    secondary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    outline: 'border border-slate-200 text-slate-600 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  };
  return (
    <button className={cn('px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50', variants[variant], className)} {...props}>
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className="space-y-1">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <input className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" {...props} />
  </div>
);

const Select = ({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, options: { value: string, label: string }[] }) => (
  <div className="space-y-1">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <select className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all bg-white" {...props}>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// --- PAGES ---

const LandingPage = ({ onStart }: { onStart: () => void }) => (
  <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl space-y-8"
    >
      <div className="inline-flex p-4 bg-indigo-100 rounded-3xl text-indigo-600 mb-4">
        <Heart size={48} fill="currentColor" />
      </div>
      <h1 className="text-5xl font-bold tracking-tight text-slate-900">
        Give the Gift of Life
      </h1>
      <p className="text-xl text-slate-600 leading-relaxed">
        A centralized platform connecting organ donors, recipients, and hospitals to streamline the miracle of transplantation.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Button onClick={onStart} className="px-8 py-4 text-lg flex items-center gap-2">
          Get Started <ArrowRight size={20} />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-8 pt-12 border-t border-slate-200">
        <div>
          <div className="text-3xl font-bold text-indigo-600">10k+</div>
          <div className="text-sm text-slate-500">Registered Donors</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-emerald-600">5k+</div>
          <div className="text-sm text-slate-500">Successful Matches</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-sky-600">24/7</div>
          <div className="text-sm text-slate-500">Active Monitoring</div>
        </div>
      </div>
    </motion.div>
  </div>
);

const AuthPage = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '', password: '', name: '', age: '', gender: 'Male', blood_group: 'O+', contact: '', role: 'DONOR'
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        const res = await api.fetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: formData.username, password: formData.password })
        });
        localStorage.setItem('token', res.token);
        onLogin(res.user);
      } else {
        await api.fetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        setIsLogin(true);
        alert('Registration successful! Please login.');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="text-slate-500">{isLogin ? 'Login to manage your donations and requests' : 'Join our community of life-savers'}</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
          <Input label="Password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />

          {!isLogin && (
            <>
              <Input label="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Age" type="number" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })} required />
                <Select label="Gender" options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]} value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Blood Group" options={['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => ({ value: bg, label: bg }))} value={formData.blood_group} onChange={e => setFormData({ ...formData, blood_group: e.target.value })} />
                <Select label="Role" options={[{ value: 'DONOR', label: 'Donor' }, { value: 'RECIPIENT', label: 'Recipient' }]} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as Role })} />
              </div>
              <Input label="Contact Number" value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} required />
            </>
          )}

          <Button type="submit" className="w-full py-3">{isLogin ? 'Login' : 'Register'}</Button>
        </form>

        <div className="text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-indigo-600 hover:underline">
            {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </div>
      </Card>
    </div>
  );
};

// --- DASHBOARDS ---

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [requests, setRequests] = useState<OrganRequest[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [donors, setDonors] = useState<User[]>([]);
  const [suggestedMatches, setSuggestedMatches] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<OrganRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [s, r, m, d] = await Promise.all([
        api.fetch('/api/admin/stats'),
        api.fetch('/api/admin/requests'),
        api.fetch('/api/admin/matches'),
        api.fetch('/api/admin/donors')
      ]);
      setStats(s);
      setRequests(r);
      setMatches(m);
      setDonors(d);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestMatches = async (req: OrganRequest) => {
    setSelectedRequest(req);
    try {
      const res = await api.fetch(`/api/admin/matches/suggest/${req.id}`);
      setSuggestedMatches(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveMatch = async (organ: any) => {
    if (!selectedRequest) return;
    try {
      await api.fetch('/api/admin/matches', {
        method: 'POST',
        body: JSON.stringify({
          donor_id: organ.donor_id,
          recipient_id: selectedRequest.recipient_id,
          organ_id: organ.id,
          request_id: selectedRequest.id,
          organ_type: selectedRequest.organ_type
        })
      });
      alert('Match approved and completed!');
      setSelectedRequest(null);
      loadData();
    } catch (err) {
      alert('Error approving match');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Admin Dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-indigo-50 border-indigo-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl text-indigo-600"><Users size={24} /></div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats?.donors}</div>
              <div className="text-sm text-slate-500">Total Donors</div>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-emerald-50 border-emerald-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl text-emerald-600"><Heart size={24} /></div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats?.recipients}</div>
              <div className="text-sm text-slate-500">Total Recipients</div>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-amber-50 border-amber-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl text-amber-600"><ClipboardList size={24} /></div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats?.pending}</div>
              <div className="text-sm text-slate-500">Pending Requests</div>
            </div>
          </div>
        </Card>
        <Card className="p-6 bg-sky-50 border-sky-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-xl text-sky-600"><CheckCircle size={24} /></div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stats?.matches}</div>
              <div className="text-sm text-slate-500">Successful Matches</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <ClipboardList size={20} className="text-indigo-600" /> Recent Organ Requests
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 text-sm">
                  <th className="pb-3 font-medium">Recipient</th>
                  <th className="pb-3 font-medium">Organ</th>
                  <th className="pb-3 font-medium">Blood</th>
                  <th className="pb-3 font-medium">Urgency</th>
                  <th className="pb-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {requests.map(req => (
                  <tr key={req.id} className="text-sm">
                    <td className="py-3 font-medium text-slate-700">{req.recipient_name}</td>
                    <td className="py-3 text-slate-600">{req.organ_type}</td>
                    <td className="py-3"><Badge>{req.blood_group}</Badge></td>
                    <td className="py-3">
                      <Badge variant={req.urgency_level === 'CRITICAL' ? 'danger' : req.urgency_level === 'HIGH' ? 'warning' : 'info'}>
                        {req.urgency_level}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {req.status === 'PENDING' && (
                        <button
                          onClick={() => handleSuggestMatches(req)}
                          className="text-indigo-600 hover:underline font-medium"
                        >
                          Find Match
                        </button>
                      )}
                      {req.status !== 'PENDING' && <Badge variant="success">{req.status}</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <CheckCircle size={20} className="text-emerald-600" /> Recent Successful Matches
          </h3>
          <div className="space-y-4">
            {matches.map(match => (
              <div key={match.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">{match.organ_type}</div>
                  <div className="text-xs text-slate-500">
                    {match.donor_name} → {match.recipient_name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">{format(new Date(match.matched_on), 'MMM d, yyyy')}</div>
                  <Badge variant="success">COMPLETED</Badge>
                </div>
              </div>
            ))}
            {matches.length === 0 && <div className="text-center py-8 text-slate-400">No matches found yet.</div>}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users size={20} className="text-indigo-600" /> Recent Registered Donors
          </h3>
          <button
            onClick={() => {
              // This is a workaround to trigger the view change from within a child
              // In a real app we'd use a store or context
              window.dispatchEvent(new CustomEvent('change-view', { detail: 'admin-users' }));
            }}
            className="text-sm text-indigo-600 hover:underline font-medium"
          >
            View All Users
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {donors.slice(0, 6).map(donor => (
            <div key={donor.id} className="p-4 border border-slate-100 rounded-2xl bg-slate-50 flex items-center gap-4">
              <div className="p-2 bg-white rounded-xl text-indigo-600">
                <UserIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-900 truncate">{donor.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="danger">{donor.blood_group}</Badge>
                  <span className="text-xs text-slate-500 truncate">{donor.contact}</span>
                </div>
              </div>
            </div>
          ))}
          {donors.length === 0 && <div className="col-span-full text-center py-8 text-slate-400">No donors registered yet.</div>}
        </div>
      </Card>

      <AnimatePresence>
        {selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <div>
                  <h4 className="text-xl font-bold">Smart Match Finder</h4>
                  <p className="text-indigo-100 text-sm">Finding compatible donors for {selectedRequest.recipient_name}</p>
                </div>
                <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Organ Needed</div>
                    <div className="font-bold text-slate-900">{selectedRequest.organ_type}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Blood Group</div>
                    <div className="font-bold text-slate-900">{selectedRequest.blood_group}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Urgency</div>
                    <Badge variant="danger">{selectedRequest.urgency_level}</Badge>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-600" /> Compatible Available Organs
                  </h5>
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {suggestedMatches.map(organ => (
                      <div key={organ.id} className="p-4 border border-slate-200 rounded-2xl flex items-center justify-between hover:border-indigo-300 transition-colors">
                        <div>
                          <div className="font-bold text-slate-900">{organ.donor_name}</div>
                          <div className="text-sm text-slate-500 flex items-center gap-2">
                            Blood Group: <Badge>{organ.donor_blood_group}</Badge>
                          </div>
                        </div>
                        <Button onClick={() => handleApproveMatch(organ)} variant="secondary" className="flex items-center gap-2">
                          Approve Match <CheckCircle size={16} />
                        </Button>
                      </div>
                    ))}
                    {suggestedMatches.length === 0 && (
                      <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-slate-500">No compatible donors found at this moment.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const UserDashboard = ({ user }: { user: User }) => {
  const [organs, setOrgans] = useState<Organ[]>([]);
  const [requests, setRequests] = useState<OrganRequest[]>([]);
  const [showAddOrgan, setShowAddOrgan] = useState(false);
  const [showAddRequest, setShowAddRequest] = useState(false);
  const [formData, setFormData] = useState({ organ_type: 'KIDNEY', blood_group: user.blood_group, urgency_level: 'MEDIUM' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (user.role === 'DONOR') {
        const res = await api.fetch('/api/organs');
        setOrgans(res.filter((o: any) => o.donor_id === user.id));
      } else {
        const res = await api.fetch('/api/requests/my');
        setRequests(res);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddOrgan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.fetch('/api/organs', {
        method: 'POST',
        body: JSON.stringify({ organ_type: formData.organ_type, blood_group: formData.blood_group })
      });
      setShowAddOrgan(false);
      loadData();
    } catch (err) {
      alert('Error adding organ');
    }
  };

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.fetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      setShowAddRequest(false);
      loadData();
    } catch (err) {
      alert('Error submitting request');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Welcome, {user.name}</h2>
          <p className="text-slate-500">Manage your {user.role === 'DONOR' ? 'donations' : 'requests'}</p>
        </div>
        <div className="flex gap-4">
          {user.role === 'DONOR' ? (
            <Button onClick={() => setShowAddOrgan(true)} className="flex items-center gap-2">
              <Plus size={20} /> Register New Organ
            </Button>
          ) : (
            <Button onClick={() => setShowAddRequest(true)} className="flex items-center gap-2">
              <Plus size={20} /> Submit Organ Request
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            {user.role === 'DONOR' ? <Activity size={20} className="text-emerald-600" /> : <ClipboardList size={20} className="text-amber-600" />}
            {user.role === 'DONOR' ? 'My Registered Organs' : 'My Organ Requests'}
          </h3>

          <div className="space-y-4">
            {user.role === 'DONOR' ? (
              organs.map(organ => (
                <div key={organ.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{organ.organ_type}</div>
                    <div className="text-xs text-slate-500">Registered on {format(new Date(organ.date_added), 'MMM d, yyyy')}</div>
                  </div>
                  <Badge variant={organ.availability_status === 'AVAILABLE' ? 'success' : 'info'}>
                    {organ.availability_status}
                  </Badge>
                </div>
              ))
            ) : (
              requests.map(req => (
                <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{req.organ_type}</div>
                      <div className="text-xs text-slate-500">Requested on {format(new Date(req.date_requested), 'MMM d, yyyy')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={req.urgency_level === 'CRITICAL' ? 'danger' : 'warning'}>{req.urgency_level}</Badge>
                      <Badge variant={req.status === 'PENDING' ? 'warning' : req.status === 'APPROVED' ? 'success' : 'danger'}>
                        {req.status}
                      </Badge>
                    </div>
                  </div>
                  {req.admin_note && (
                    <div className="p-3 bg-white rounded-xl text-xs text-slate-600 border border-slate-100 italic">
                      Admin Note: {req.admin_note}
                    </div>
                  )}
                </div>
              ))
            )}
            {((user.role === 'DONOR' && organs.length === 0) || (user.role === 'RECIPIENT' && requests.length === 0)) && (
              <div className="text-center py-12 text-slate-400">
                No {user.role === 'DONOR' ? 'organs registered' : 'requests submitted'} yet.
              </div>
            )}
          </div>
        </Card>
      </div>


      {/* Modals */}
      <AnimatePresence>
        {(showAddOrgan || showAddRequest) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xl font-bold text-slate-900">{showAddOrgan ? 'Register Organ' : 'New Request'}</h4>
                <button onClick={() => { setShowAddOrgan(false); setShowAddRequest(false); }} className="p-2 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={showAddOrgan ? handleAddOrgan : handleAddRequest} className="space-y-4">
                <Select
                  label="Organ Type"
                  options={['KIDNEY', 'LIVER', 'HEART', 'LUNGS', 'PANCREAS', 'CORNEA'].map(o => ({ value: o, label: o }))}
                  value={formData.organ_type}
                  onChange={e => setFormData({ ...formData, organ_type: e.target.value })}
                />
                <Select
                  label="Blood Group"
                  options={['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => ({ value: bg, label: bg }))}
                  value={formData.blood_group}
                  onChange={e => setFormData({ ...formData, blood_group: e.target.value })}
                />
                {!showAddOrgan && (
                  <Select
                    label="Urgency Level"
                    options={[{ value: 'CRITICAL', label: 'Critical' }, { value: 'HIGH', label: 'High' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'LOW', label: 'Low' }]}
                    value={formData.urgency_level}
                    onChange={e => setFormData({ ...formData, urgency_level: e.target.value })}
                  />
                )}
                <Button type="submit" className="w-full py-3">
                  {showAddOrgan ? 'Register Donation' : 'Submit Request'}
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await api.fetch('/api/admin/users');
      setUsers(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to remove this user? All their records (organs, requests, matches) will also be deleted.')) return;
    try {
      await api.fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      alert('User removed successfully');
      loadUsers();
    } catch (err) {
      alert('Error removing user');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Users...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
        <Badge variant="info">{users.length} Total Users</Badge>
      </div>
      <Card>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-slate-500 text-sm">
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Username</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Blood Group</th>
              <th className="px-6 py-4 font-medium">Contact</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                <td className="px-6 py-4 text-slate-500">@{u.username}</td>
                <td className="px-6 py-4">
                  <Badge variant={u.role === 'DONOR' ? 'success' : 'warning'}>{u.role}</Badge>
                </td>
                <td className="px-6 py-4"><Badge variant="danger">{u.blood_group}</Badge></td>
                <td className="px-6 py-4 text-slate-600">{u.contact}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDeleteUser(u.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Remove User"
                  >
                    <XCircle size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const AdminOrgansPage = () => {
  const [organs, setOrgans] = useState<Organ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.fetch('/api/organs')
      .then(setOrgans)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center">Loading Inventory...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Organ Inventory</h2>
        <Badge variant="success">{organs.length} Total Organs</Badge>
      </div>
      <Card>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-slate-500 text-sm">
              <th className="px-6 py-4 font-medium">Organ Type</th>
              <th className="px-6 py-4 font-medium">Donor</th>
              <th className="px-6 py-4 font-medium">Blood Group</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Date Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {organs.map(o => (
              <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-bold text-indigo-600">{o.organ_type}</td>
                <td className="px-6 py-4 text-slate-700">{o.donor_name}</td>
                <td className="px-6 py-4"><Badge variant="danger">{o.blood_group}</Badge></td>
                <td className="px-6 py-4">
                  <Badge variant={o.availability_status === 'AVAILABLE' ? 'success' : 'info'}>
                    {o.availability_status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-slate-500 text-sm">
                  {format(new Date(o.date_added), 'MMM d, yyyy')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const ProfilePage = ({ user }: { user: User }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-indigo-600 rounded-2xl text-white">
          <UserIcon size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Personal Profile</h2>
          <p className="text-slate-500">View and manage your account information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-8 space-y-6">
          <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Basic Information</h3>
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name</span>
              <span className="text-lg font-medium text-slate-900">{user.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Age</span>
                <span className="text-lg font-medium text-slate-900">{user.age} Years</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gender</span>
                <span className="text-lg font-medium text-slate-900">{user.gender}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</span>
              <span className="text-lg font-medium text-slate-900">@{user.username}</span>
            </div>
          </div>
        </Card>

        <Card className="p-8 space-y-6">
          <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Medical & Contact</h3>
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Blood Group</span>
              <div className="flex items-center gap-2">
                <Badge variant="danger" className="text-sm px-3 py-1">{user.blood_group}</Badge>
                <span className="text-slate-500 text-sm italic">Compatible with multiple groups</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contact Number</span>
              <span className="text-lg font-medium text-slate-900">{user.contact}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Role</span>
              <div className="flex items-center gap-2">
                <Badge variant="info" className="text-sm px-3 py-1">{user.role}</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-8 bg-indigo-50 border-indigo-100">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-xl text-indigo-600">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900">Verified Account</h4>
            <p className="text-sm text-slate-600 mt-1">
              Your profile is verified for the organ donation network. All information provided is confidential and used only for matching purposes within the system.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<any>(localStorage.getItem('view') || 'landing');

  const updateView = (newView: any) => {
    setView(newView);
    localStorage.setItem('view', newView);
  };

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await api.fetch('/api/health');
        console.log('API is healthy');
      } catch (err) {
        console.error('API health check failed:', err);
      }
      checkAuth();
    };
    init();

    const handleViewChange = (e: any) => updateView(e.detail);
    window.addEventListener('change-view', handleViewChange);
    return () => window.removeEventListener('change-view', handleViewChange);
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const res = await api.fetch('/api/auth/me');
        setUser(res);
        const savedView = localStorage.getItem('view');
        if (savedView === 'auth' || savedView === 'landing') {
          updateView('dashboard');
        }
      } catch (err) {
        localStorage.removeItem('token');
        setUser(null);
        updateView('landing');
      }
    } else {
      const savedView = localStorage.getItem('view');
      if (savedView && savedView !== 'auth' && savedView !== 'landing') {
        updateView('landing');
      }
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('view');
    setUser(null);
    updateView('landing');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-indigo-600 font-bold">Loading LifeStream...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {!user ? (
        view === 'auth' ? (
          <AuthPage onLogin={(u) => { setUser(u); updateView('dashboard'); }} />
        ) : (
          <LandingPage onStart={() => updateView('auth')} />
        )
      ) : (
        <div className="flex flex-col min-h-screen">
          <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                  <Heart size={24} fill="currentColor" />
                </div>
                <span className="text-xl font-bold tracking-tight">LifeStream</span>
              </div>

              <div className="flex items-center gap-8">
                <div className="hidden md:flex items-center gap-6">
                  <button
                    onClick={() => updateView('dashboard')}
                    className={cn(
                      "text-sm font-bold transition-colors",
                      (view === 'dashboard') ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Dashboard
                  </button>
                  {user.role === 'ADMIN' && (
                    <>
                      <button
                        onClick={() => updateView('admin-users')}
                        className={cn(
                          "text-sm font-bold transition-colors",
                          view === 'admin-users' ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
                        )}
                      >
                        Users
                      </button>
                      <button
                        onClick={() => updateView('admin-organs')}
                        className={cn(
                          "text-sm font-bold transition-colors",
                          view === 'admin-organs' ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
                        )}
                      >
                        Organs
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => updateView('profile')}
                    className={cn(
                      "text-sm font-bold transition-colors",
                      view === 'profile' ? "text-indigo-600" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    Profile
                  </button>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-sm font-medium text-slate-600">{user.role} Portal</span>
                  </div>
                  <button onClick={handleLogout} className="flex items-center gap-2 text-slate-500 hover:text-rose-600 transition-colors font-medium">
                    <LogOut size={20} /> <span className="hidden md:inline">Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </nav>

          <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={view + (user?.role || '')}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {view === 'profile' ? (
                  <ProfilePage user={user} />
                ) : view === 'admin-users' ? (
                  <AdminUsersPage />
                ) : view === 'admin-organs' ? (
                  <AdminOrgansPage />
                ) : (
                  user.role === 'ADMIN' ? <AdminDashboard /> : <UserDashboard user={user} />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          <footer className="bg-white border-t border-slate-200 py-8">
            <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm text-slate-500">© 2026 LifeStream. All rights reserved.</div>
              <div className="flex items-center gap-6 text-sm text-slate-400">
                <a href="#" className="hover:text-indigo-600">Privacy Policy</a>
                <a href="#" className="hover:text-indigo-600">Terms of Service</a>
                <a href="#" className="hover:text-indigo-600">Contact Support</a>
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
}
