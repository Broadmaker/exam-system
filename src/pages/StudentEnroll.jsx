import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { Button, Input, Badge } from '../components/ui';
import PublicLayout from '../components/PublicLayout';
import { UserPlus, CheckCircle, AlertTriangle, GraduationCap, Search, School } from 'lucide-react';

export default function StudentEnroll() {
  const [params] = useSearchParams();
  const urlCode = (params.get('code') || '').toUpperCase();

  const [codeEntry, setCodeEntry] = useState(urlCode);
  const [klass, setKlass] = useState(null);

  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);

  const lookup = async (e) => {
    if (e) e.preventDefault();
    const code = codeEntry.trim().toUpperCase();
    if (!code) { setError('Enter the class code.'); return; }
    setError(''); setKlass(null); setDone(null);
    try {
      const k = await api.lookupClassCode(code);
      setKlass(k);
    } catch (err) { setError(err.message); }
  };

  const submit = async () => {
    if (!studentId.trim() || !name.trim()) {
      setError('Please fill in your Student ID and name.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.enrollByCode({
        access_code: codeEntry.trim().toUpperCase(),
        student_id: studentId.trim().toUpperCase(),
        student_name: name.trim(),
      });
      setDone({ name: res.class.name, already: !!res.already });
      if (!res.already) { setKlass(null); setCodeEntry(''); setStudentId(''); setName(''); }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <PublicLayout>
      <div className="flex-1 flex items-stretch justify-center"
        style={{ background: 'linear-gradient(135deg, #0b1b3a 0%, #1a4fad 100%)' }}>
        <div className="max-w-[1000px] mx-auto w-full px-4 py-10 grid lg:grid-cols-[1fr_460px] gap-8 items-center">
          {/* Info panel */}
          <div className="text-white hidden lg:block">
            <span className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-5"><UserPlus size={24} className="text-accent" /></span>
            <h1 className="text-[34px] font-bold leading-tight mb-4">
              Enroll in<br />a Class
            </h1>
            <p className="text-white/70 text-[15px] leading-relaxed mb-8 max-w-[380px]">
              Join your class with the code shared by your instructor. Once enrolled, your exams and attendance appear in your records.
            </p>
            <div className="flex flex-col gap-2.5 max-w-[380px]">
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <span className="w-8 h-8 rounded-lg bg-success-bg text-success flex items-center justify-center shrink-0"><School size={16} /></span>
                <div>
                  <div className="text-[13px] font-semibold">One code per class</div>
                  <div className="text-[11px] text-white/50">Your instructor shares it — usually in class.</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <span className="w-8 h-8 rounded-lg bg-purple-bg text-purple flex items-center justify-center shrink-0"><GraduationCap size={16} /></span>
                <div>
                  <div className="text-[13px] font-semibold">Track your progress</div>
                  <div className="text-[11px] text-white/50">Results and attendance link to your student ID.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Form card */}
          <div className="bg-surface rounded-[18px] w-full shadow-modal">
            <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="w-10 h-10 rounded-lg bg-navy-900 text-white flex items-center justify-center"><UserPlus size={20} /></span>
            <h1 className="text-[22px] font-bold text-navy-800">Enroll in a Class</h1>
          </div>
          <p className="text-[13px] text-muted mb-6 leading-relaxed">
            Enter the class code given by your instructor to enroll. You can view your records afterwards.
          </p>

          {error && (
            <div className="text-[12px] text-danger mb-3.5 flex items-center gap-1.5 bg-danger-bg rounded-md px-3 py-2">
              <AlertTriangle size={12} /> {error}
            </div>
          )}

          {done ? (
            <div className="text-center py-3">
              <div className="flex justify-center mb-3.5">
                <span className={`w-16 h-16 rounded-full flex items-center justify-center ${done.already ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'}`}>
                  <CheckCircle size={32} />
                </span>
              </div>
              <h2 className="text-[16px] font-bold text-navy-800 mb-1.5">
                {done.already ? 'Already enrolled' : 'You are now enrolled'}
              </h2>
              <p className="text-[14px] text-muted mb-5">
                {done.already ? 'You were already enrolled in' : 'Welcome to'} <strong>{done.name}</strong>.
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button to="/records" icon={GraduationCap}>View My Records</Button>
                <Button variant="outline" onClick={() => setDone(null)}>Enroll Another</Button>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={lookup} className="flex flex-col gap-2.5 mb-6">
                <Input label="Class Code" value={codeEntry} onChange={e => setCodeEntry(e.target.value)}
                  placeholder="e.g. BSCS2A" icon={Search} className="!font-mono !uppercase !tracking-wide"
                  onKeyDown={e => e.key === 'Enter' && lookup(e)} />
                <Button type="submit" className="!w-full !py-3.5 !text-[15px]">Find Class</Button>
              </form>

              {klass && (
                <div style={{ animation: 'fadeInUp .25s' }}>
                  <div className="border-2 border-success-bg bg-success-bg/40 rounded-[10px] px-4 py-3 mb-4">
                    <div className="text-[12px] text-success font-semibold mb-0.5">Class found</div>
                    <div className="text-[16px] font-bold text-navy-800 flex items-center gap-2">
                      <School size={16} className="text-navy-700" /> {klass.name}
                    </div>
                    <div className="text-[12px] text-muted">{[klass.subject, klass.section].filter(Boolean).join(' · ') || ' '}</div>
                    {klass.section && (
                      <Badge tone="success" className="!mt-1.5">You will be enrolled in section {klass.section}</Badge>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <Input label="Student ID" value={studentId} onChange={e => setStudentId(e.target.value)}
                      placeholder="e.g. 2019-12345" className="!font-mono !tracking-wide" />
                    <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dela Cruz, Juan A." />
                    <Button onClick={submit} loading={loading} icon={loading ? null : UserPlus} className="!w-full !py-3.5 !text-[15px]">
                      {loading ? 'Enrolling…' : 'Enroll Me'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
      </div>
    </PublicLayout>
  );
}