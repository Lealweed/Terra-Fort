import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { UserRole, getUserRoleFromUser } from '../lib/auth';

type LoginProps = {
  isLogged?: boolean;
  sessionRole?: UserRole;
};

export default function Login({ isLogged, sessionRole = 'unknown' }: LoginProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isLogged && sessionRole === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (isLogged && sessionRole === 'delivery') return <Navigate to="/portal-entregador" replace />;
  if (isLogged && sessionRole === 'customer') return <Navigate to="/portal-cliente" replace />;

  const next = (location.state as { from?: string } | undefined)?.from;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error || !data.user) {
      setError('Credenciais inválidas.');
      return;
    }

    const role = getUserRoleFromUser(data.user);
    if (next) {
      navigate(next, { replace: true });
      return;
    }

    if (role === 'admin') navigate('/admin/dashboard', { replace: true });
    else if (role === 'delivery') navigate('/portal-entregador', { replace: true });
    else if (role === 'customer') navigate('/portal-cliente', { replace: true });
    else navigate('/', { replace: true });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="max-w-md mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-black text-brand-black">Entrar no sistema</h1>
        <p className="text-sm text-gray-500 mt-1">Acesse seu painel da Terra Fort.</p>
        {isLogged && sessionRole === 'unknown' && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3">
            Seu usuário está sem perfil de acesso. Fale com o administrador para definir role (admin, delivery ou customer).
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-4 mt-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">E-mail</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Senha</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button disabled={loading} className="w-full bg-brand-black text-white py-3 rounded-lg text-sm font-bold disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
