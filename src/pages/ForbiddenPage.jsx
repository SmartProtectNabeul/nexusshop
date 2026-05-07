import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, LogIn, Settings, ShieldAlert } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import styles from './ForbiddenPage.module.css';

const roleLabels = {
  ADMIN: 'Admin',
  CONSUMER: 'Customer',
  DEVELOPER: 'Developer',
};

function getPathLabel(from) {
  if (!from?.pathname) return 'this page';
  return `${from.pathname}${from.search || ''}${from.hash || ''}`;
}

export default function ForbiddenPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const reason = location.state?.reason;
  const from = location.state?.from;
  const requiredRoles = location.state?.requiredRoles || [];
  const needsLogin = reason === 'login_required' || !user;
  const pathLabel = getPathLabel(from);
  const requiredLabel = requiredRoles.map((role) => roleLabels[role] || role).join(' or ');

  return (
    <div className={styles.page}>
      <section className={styles.panel} aria-labelledby="forbidden-title">
        <div className={styles.iconWrap} aria-hidden="true">
          <ShieldAlert size={30} />
        </div>

        <p className={styles.eyebrow}>
          {needsLogin ? 'Protected area' : 'Access denied'}
        </p>
        <h1 id="forbidden-title" className={styles.title}>
          {needsLogin ? 'Sign in required' : 'Forbidden'}
        </h1>
        <p className={styles.subtitle}>
          {needsLogin
            ? `You need to sign in before opening ${pathLabel}.`
            : `Your ${roleLabels[user?.role] || 'current'} account cannot open ${pathLabel}.`}
        </p>

        {!needsLogin && requiredLabel && (
          <div className={styles.requirement}>
            Required access: <strong>{requiredLabel}</strong>
          </div>
        )}

        <div className={styles.actions}>
          {needsLogin ? (
            <Link to="/login" state={{ from }} className={styles.primaryAction}>
              <LogIn size={17} />
              Sign in
            </Link>
          ) : (
            <Link to="/settings" className={styles.primaryAction}>
              <Settings size={17} />
              Account settings
            </Link>
          )}

          <Link to="/" className={styles.secondaryAction}>
            <Home size={17} />
            Home
          </Link>

          <button type="button" className={styles.ghostAction} onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
            Go back
          </button>
        </div>
      </section>
    </div>
  );
}
