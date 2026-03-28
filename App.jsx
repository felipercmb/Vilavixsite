import React, { useState, useEffect } from 'react';

import Navbar    from './components/Navbar.jsx';
import Footer    from './components/Footer.jsx';
import WppFloat  from './components/WppFloat.jsx';

import HomePage        from './pages/public/Home.jsx';
import ImoveisPage     from './pages/public/Imoveis.jsx';
import ImovelDetailPage from './pages/public/ImovelDetail.jsx';
import SobrePage       from './pages/public/Sobre.jsx';
import ContatoPage     from './pages/public/Contato.jsx';
import BlogPage        from './pages/public/Blog.jsx';
import LoginPage       from './pages/Login.jsx';
import CrmLayout       from './pages/crm/CrmLayout.jsx';
import { supabase }    from './lib/supabase.js';
import { authSignOut } from './lib/db.js';

export default function App() {
  const [page, setPage]           = useState('home');
  const [loggedIn, setLoggedIn]   = useState(false);
  const [authUser, setAuthUser]   = useState(null);
  const [selectedImovelId, setSelectedImovelId] = useState(null);
  const [crmMenu, setCrmMenu]     = useState('dashboard');

  // Restaura sessão ao recarregar a página
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setAuthUser(session.user); setLoggedIn(true); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setAuthUser(session.user); setLoggedIn(true); }
      else               { setAuthUser(null); setLoggedIn(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  /**
   * navigate(pageName, extras?)
   * extras: { imovelId } for detail page
   */
  const navigate = (pageName, extras) => {
    if (extras?.imovelId !== undefined) {
      setSelectedImovelId(extras.imovelId);
    }
    if (extras?.crmMenu) {
      setCrmMenu(extras.crmMenu);
    }
    setPage(pageName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // CRM: full-page layout (no navbar/footer)
  if (loggedIn) {
    return (
      <CrmLayout
        menu={crmMenu}
        setMenu={setCrmMenu}
        user={authUser}
        onLogout={async () => {
          await authSignOut();
          setLoggedIn(false);
          setAuthUser(null);
          navigate('home');
        }}
        navigate={navigate}
      />
    );
  }

  // Login: full-page
  if (page === 'login') {
    return (
      <LoginPage
        onLogin={(user) => { setAuthUser(user); setLoggedIn(true); navigate('crm'); }}
        navigate={navigate}
      />
    );
  }

  const publicProps = { navigate };

  return (
    <>
      <Navbar page={page} navigate={navigate} />

      <div style={{ minHeight: '100vh' }}>
        {page === 'home'          && <HomePage        {...publicProps} />}
        {page === 'imoveis'       && <ImoveisPage     {...publicProps} />}
        {page === 'imovel-detail' && <ImovelDetailPage {...publicProps} imovelId={selectedImovelId} />}
        {page === 'sobre'         && <SobrePage       {...publicProps} />}
        {page === 'contato'       && <ContatoPage     {...publicProps} />}
        {page === 'blog'          && <BlogPage        {...publicProps} />}
      </div>

      <Footer navigate={navigate} />
      <WppFloat />
    </>
  );
}
