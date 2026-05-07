import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, Settings, ChevronDown, LogOut, Globe, ExternalLink, UserCog } from 'lucide-react';
import { useContext, useEffect, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import InteractiveGradientBackground from '../components/ui/InteractiveGradientBackground';
import styles from './MainLayout.module.css';

const languageOptions = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇩🇿' },
];

export default function MainLayout() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isFetchingUser } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const isHome = location.pathname === '/';
  const currentLanguage = languageOptions.find((option) => option.code === i18n.language) || languageOptions[0];

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLanguageChange = (nextLanguage) => {
    i18n.changeLanguage(nextLanguage);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  return (
    <InteractiveGradientBackground className={styles.layout} dark={false}>
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>

          {/* Nav links + account menu */}
          <div className={styles.navRight}>
            <div className={styles.navLinks}>
              <Link to="/" className={`${styles.navLink} ${isHome ? styles.navLinkActive : ''}`}>
                {t('nav.home')}
              </Link>
              {user?.role === 'DEVELOPER' && (
                <Link to="/submit-app" className={styles.navLink}>
                  Post App
                </Link>
              )}
            </div>

            {user && (
              <Link to="/credits" className={styles.creditPill}>
                <span className={styles.creditValue}>
                  {isFetchingUser ? <Loader2 size={16} className={styles.spinIcon} /> : `${user.credits} CR`}
                </span>
                <span className={styles.creditPlus}>+</span>
              </Link>
            )}

            {user?.role === 'ADMIN' && (
              <Link to="/admin" className={styles.adminPill}>
                Admin Panel
              </Link>
            )}

            <div className={styles.menuWrapper} ref={menuRef}>
              <button
                type="button"
                className={styles.menuTrigger}
                onClick={() => setIsMenuOpen((current) => !current)}
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
              >
                <Settings size={16} />
                <span className={styles.menuTriggerText}>Menu</span>
                <ChevronDown size={16} className={isMenuOpen ? styles.chevronOpen : ''} />
              </button>

              {isMenuOpen && (
                <div className={styles.menuDropdown} role="menu">
                  {user ? (
                    <>
                      <Link
                        to="/settings"
                        className={styles.menuItem}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <UserCog size={16} />
                        Settings
                      </Link>

                      <a
                        href="https://wa.me/21658885966"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.menuItem}
                      >
                        <ExternalLink size={16} />
                        Custom Website
                      </a>

                      <div className={styles.menuDivider} />

                      <div className={styles.languageSection}>
                        <p className={styles.languageHeading}>
                          <Globe size={14} />
                          Language
                        </p>
                        <div className={styles.languageGrid}>
                          {languageOptions.map((option) => (
                            <button
                              key={option.code}
                              type="button"
                              className={`${styles.languageChip} ${i18n.language === option.code ? styles.languageChipActive : ''}`}
                              onClick={() => handleLanguageChange(option.code)}
                            >
                              <span>{option.flag}</span>
                              <span>{option.code.toUpperCase()}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className={styles.menuDivider} />

                      <button type="button" className={styles.menuItemDanger} onClick={handleLogout}>
                        <LogOut size={16} />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className={styles.menuItem}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <UserCog size={16} />
                        Login
                      </Link>
                      <a
                        href="https://wa.me/21658885966"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.menuItem}
                      >
                        <ExternalLink size={16} />
                        Custom Website
                      </a>
                      <div className={styles.menuDivider} />
                      <div className={styles.languageSection}>
                        <p className={styles.languageHeading}>
                          <Globe size={14} />
                          Language
                        </p>
                        <div className={styles.languageGrid}>
                          {languageOptions.map((option) => (
                            <button
                              key={option.code}
                              type="button"
                              className={`${styles.languageChip} ${currentLanguage.code === option.code ? styles.languageChipActive : ''}`}
                              onClick={() => handleLanguageChange(option.code)}
                            >
                              <span>{option.flag}</span>
                              <span>{option.code.toUpperCase()}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
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
    </InteractiveGradientBackground>
  );
}
