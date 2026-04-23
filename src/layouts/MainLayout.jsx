import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import styles from './MainLayout.module.css';

export default function MainLayout() {
  const { t } = useTranslation();
  const location = useLocation();

  const isHome = location.pathname === '/';

  return (
    <div className={styles.layout}>
      {/* Navbar */}
      <nav className={styles.navbar} id="main-navbar">
        <div className={styles.navInner}>
          {/* Brand */}
          <Link to="/" className={styles.brand} id="brand-link">
            <img src="/logo.jpg" alt="NexusShop" className={styles.logo} />
            <span className={styles.brandName}>{t('brand')}</span>
          </Link>

          {/* Search */}
          <div className={styles.searchWrap}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder={t('nav.search')}
              className={styles.searchInput}
              id="search-input"
            />
          </div>

          {/* Nav links + language */}
          <div className={styles.navRight}>
            <div className={styles.navLinks}>
              <Link
                to="/"
                className={`${styles.navLink} ${isHome ? styles.navLinkActive : ''}`}
                id="nav-home"
              >
                {t('nav.home')}
              </Link>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerCopy}>
            © {new Date().getFullYear()} {t('brand')}. {t('footer.rights')}
          </p>
          <div className={styles.footerLinks}>
            <span className={styles.footerLink}>{t('footer.terms')}</span>
            <span className={styles.footerLink}>{t('footer.privacy')}</span>
            <span className={styles.footerLink}>{t('footer.developers')}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
