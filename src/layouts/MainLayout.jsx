import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, Settings, ChevronDown, LogOut, Globe, ExternalLink, UserCog, LogIn, Moon, Sun, BadgeCheck, Mail, Phone, MessageCircle, ShieldCheck } from 'lucide-react';
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
  const { user, logout, isFetchingUser, theme, toggleTheme, setUser } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const credits = Number(user?.credits ?? 0);

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

  const updateAccountRole = async (nextRole) => {
    if (!user || nextRole === user.role) return;
    try {
      const res = await fetch(`http://localhost:5000/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update account type');
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    } catch (error) {
      console.error(error);
    }
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
                  {isFetchingUser ? <Loader2 size={16} className={styles.spinIcon} /> : `${credits} CR`}
                </span>
                <span className={styles.creditPlus}>+</span>
              </Link>
            )}

            {user?.role === 'ADMIN' && (
              <Link to="/admin" className={styles.adminPill}>
                Admin Panel
              </Link>
            )}

            {!user && (
              <Link to="/login" className={styles.loginButton}>
                <LogIn size={16} />
                Login
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
                      <div className={styles.quickSettings}>
                        <div className={styles.quickHeader}>
                          <span>{user.email}</span>
                          <small>{user.role}</small>
                        </div>

                        <button type="button" className={styles.quickRow} onClick={toggleTheme}>
                          {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                          <span>Theme</span>
                          <strong>{theme === 'dark' ? 'Dark' : 'Light'}</strong>
                        </button>

                        {user.role !== 'ADMIN' && (
                          <label className={styles.quickSelectRow}>
                            <BadgeCheck size={16} />
                            <span>Account type</span>
                            <select
                              value={user.role}
                              onChange={(event) => updateAccountRole(event.target.value)}
                            >
                              <option value="CONSUMER">Customer</option>
                              <option value="DEVELOPER">Developer</option>
                            </select>
                          </label>
                        )}
                      </div>

                      <div className={styles.menuDivider} />

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
          <div className={styles.footerBrandBlock}>
            <Link to="/" className={styles.footerBrand}>
              <img src="/logo.jpg" alt="NexusShop" className={styles.footerLogo} />
              <span>{t('brand')}</span>
            </Link>
            <p>
              A curated marketplace for trusted apps, developer tools, and digital products with review,
              licensing, and secure delivery built in.
            </p>
            <div className={styles.trustRow}>
              <span><ShieldCheck size={15} /> Reviewed submissions</span>
              <span><ShieldCheck size={15} /> Secure downloads</span>
              <span><ShieldCheck size={15} /> Buyer protection</span>
            </div>
          </div>

          <div className={styles.footerColumns}>
            <div className={styles.footerColumn}>
              <h3>Marketplace</h3>
              <Link to="/" className={styles.footerLink}>Browse apps</Link>
              <Link to="/search" className={styles.footerLink}>Search</Link>
              <Link to="/credits" className={styles.footerLink}>Credits</Link>
              <Link to="/submit-app" className={styles.footerLink}>Submit an app</Link>
            </div>

            <div className={styles.footerColumn}>
              <h3>Support</h3>
              <a className={styles.footerLink} href="mailto:support@nexusshop.local">
                <Mail size={14} /> support@nexusshop.local
              </a>
              <a className={styles.footerLink} href="tel:+21658885966">
                <Phone size={14} /> +216 58 885 966
              </a>
              <a className={styles.footerLink} href="https://wa.me/21658885966" target="_blank" rel="noopener noreferrer">
                <MessageCircle size={14} /> WhatsApp support
              </a>
            </div>

            <div className={styles.footerColumn}>
              <h3>Trust & Legal</h3>
              <span className={styles.footerLink}>{t('footer.terms')}</span>
              <span className={styles.footerLink}>{t('footer.privacy')}</span>
              <span className={styles.footerLink}>Refund policy</span>
              <span className={styles.footerLink}>Security checks</span>
            </div>

            <div className={styles.footerColumn}>
              <h3>Social</h3>
              <div className={styles.socialLinks}>
                <a href="https://github.com/" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                  GH
                </a>
                <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                  IN
                </a>
                <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" aria-label="X">
                  X
                </a>
              </div>
              <p className={styles.footerFinePrint}>Business inquiries and custom builds are welcome.</p>
            </div>
          </div>

          <div className={styles.footerBottomNote}>
            NexusShop does not guarantee third-party app behavior. Always review permissions before installing.
          </div>
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
