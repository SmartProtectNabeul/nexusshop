import React, { useRef, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import styles from './SubmitAppPage.module.css';

const categoryOptions = [
  { value: 'apps', label: 'Apps' },
  { value: 'websites', label: 'Websites' },
  { value: 'services', label: 'Services' },
  { value: 'extensions', label: 'Extensions' },
  { value: 'ai-tools', label: 'AI Tools' },
  { value: 'productivity', label: 'Productivity' },
  { value: 'developer-tools', label: 'Developer Tools' },
];

function FileDropInput({
  label,
  accept,
  multiple = false,
  required = false,
  helperText,
  selectedFiles,
  onFilesChange,
}) {
  const inputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const normalizedSelectedFiles = Array.isArray(selectedFiles)
    ? selectedFiles
    : selectedFiles
      ? [selectedFiles]
      : [];

  const handleIncomingFiles = (incomingFileList) => {
    const incomingFiles = Array.from(incomingFileList || []);
    if (multiple) {
      onFilesChange(incomingFiles);
      return;
    }
    onFilesChange(incomingFiles[0] || null);
  };

  const openFileDialog = () => inputRef.current?.click();

  return (
    <div className={styles.field}>
      <label>{label}</label>

      <div
        className={`${styles.dropZone} ${isDragActive ? styles.dropZoneActive : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragActive(false);
          handleIncomingFiles(event.dataTransfer.files);
        }}
        onClick={openFileDialog}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFileDialog();
          }
        }}
      >
        <input
          ref={inputRef}
          className={styles.hiddenFileInput}
          type="file"
          accept={accept}
          multiple={multiple}
          required={required && normalizedSelectedFiles.length === 0}
          onChange={(event) => handleIncomingFiles(event.target.files)}
        />

        <p className={styles.dropTitle}>
          Drop {multiple ? 'files' : 'a file'} here or <span className={styles.dropBrowse}>browse</span>
        </p>
        <p className={styles.dropSub}>Click to open file picker</p>
      </div>

      {helperText && <p className={styles.fileHint}>{helperText}</p>}

      {normalizedSelectedFiles.length > 0 && (
        <div className={styles.fileList}>
          {normalizedSelectedFiles.map((file) => (
            <span className={styles.fileTag} key={`${file.name}-${file.size}`}>
              {file.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SubmitAppPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState(0);
  const [demoVideoUrl, setDemoVideoUrl] = useState('');
  const [version, setVersion] = useState('');
  const [requirements, setRequirements] = useState('');
  const [appFile, setAppFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [metadataFile, setMetadataFile] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const credits = Number(user?.credits ?? 0);

  const parseJsonSafely = async (res) => {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch (_error) {
      return { error: text };
    }
  };

  React.useEffect(() => {
    let cancelled = false;
    const loadEligibility = async () => {
      if (!user) return;
      try {
        const res = await fetch('http://localhost:5000/api/apps/publishing-eligibility', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await parseJsonSafely(res);
        if (!cancelled && res.ok && typeof data === 'object') {
          setEligibility(data);
          return;
        }
        // Backward-compatible fallback when backend route is not yet available.
        if (!cancelled && user?.role === 'DEVELOPER') {
          const hasEnoughCreditsForFee = Number(user.credits || 0) >= 10;
          setEligibility({
            hasUnlockedPostingAccess: false,
            accessFee: 10,
            feeRequiredNow: true,
            hasEnoughCreditsForFee,
            canSubmitNow: hasEnoughCreditsForFee,
          });
        }
      } catch (error) {
        if (!cancelled && user?.role === 'DEVELOPER') {
          const hasEnoughCreditsForFee = Number(user.credits || 0) >= 10;
          setEligibility({
            hasUnlockedPostingAccess: false,
            accessFee: 10,
            feeRequiredNow: true,
            hasEnoughCreditsForFee,
            canSubmitNow: hasEnoughCreditsForFee,
          });
        }
      }
    };
    loadEligibility();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const parseMetadataFile = async (file) => {
    if (!file) return {};
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.json')) {
      const text = await file.text();
      const parsed = JSON.parse(text);
      return {
        version: parsed.version || parsed.appVersion || '',
        requirements:
          parsed.requirements
            || parsed.systemRequirements
            || parsed.platform
            || '',
      };
    }

    if (fileName.endsWith('.toml') || fileName.endsWith('.ini') || fileName.endsWith('.cfg')) {
      const text = await file.text();
      const versionMatch = text.match(/^\s*version\s*[:=]\s*["']?([^\n"']+)["']?\s*$/im);
      const requirementsMatch = text.match(/^\s*(requirements?|platform|system)\s*[:=]\s*["']?([^\n"']+)["']?\s*$/im);
      return {
        version: versionMatch?.[1]?.trim() || '',
        requirements: requirementsMatch?.[2]?.trim() || '',
      };
    }

    if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      const text = await file.text();
      const versionMatch = text.match(/version\s*[:=]\s*([^\n]+)/i);
      const requirementsMatch = text.match(/requirements?\s*[:=]\s*([^\n]+)/i);
      return {
        version: versionMatch?.[1]?.trim() || '',
        requirements: requirementsMatch?.[1]?.trim() || '',
      };
    }

    return {};
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please login first');
      navigate('/login');
      return;
    }

    if (!category) {
      toast.error('Please pick an app category');
      return;
    }

    if (!acceptPolicy) {
      toast.error('Please confirm submission policy');
      return;
    }

    if (!appFile || !thumbnailFile) {
      toast.error('App file and thumbnail are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('appFile', appFile);
      uploadFormData.append('thumbnail', thumbnailFile);
      mediaFiles.forEach((file) => uploadFormData.append('media', file));

      const uploadRes = await fetch('http://localhost:5000/api/products/upload-assets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: uploadFormData
      });

      const uploadData = await parseJsonSafely(uploadRes);

      if (!uploadRes.ok) {
        toast.error(uploadData.error || 'Upload failed');
        setIsSubmitting(false);
        return;
      }

      const parsedMetadata = await parseMetadataFile(metadataFile);
      const finalVersion = (version || parsedMetadata.version || '').trim();
      const finalRequirements = (requirements || parsedMetadata.requirements || '').trim();

      const res = await fetch('http://localhost:5000/api/apps/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title,
          description,
          category,
          price: Number(price) || 0,
          demoVideoUrl,
          fileUrl: uploadData.fileUrl,
          thumbnailUrl: uploadData.thumbnailUrl,
          mediaUrls: uploadData.mediaUrls || [],
          version: finalVersion || null,
          requirements: finalRequirements || null,
          appSizeBytes: uploadData.appSizeBytes ?? appFile.size,
          storageSize: uploadData.storageSize || `${(appFile.size / (1024 * 1024)).toFixed(2)} MB`,
        })
      });

      const data = await parseJsonSafely(res);
      if (res.ok) {
        if (data.accessFeeCharged > 0) {
          toast.success('App submitted and your one-time 10 credit posting fee was applied.');
        } else {
          toast.success('App submitted successfully. Posting access already unlocked.');
        }
        navigate('/');
      } else {
        toast.error(data.error || 'Submission failed');
        if (String(data.error || '').toLowerCase().includes('credits')) {
          navigate('/credits');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit app');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Submit an App for Review</h1>
        <p className={styles.subtitle}>
          Publish with confidence. Your app will be reviewed by our admin team before going live.
          Developers pay a one-time 10 credit fee to unlock publishing access, with security and quality checks included.
        </p>
      </header>

      <div className={styles.layout}>
        <section className={styles.formCard}>
          <form onSubmit={handleSubmit} className={styles.formGrid}>
            <div className={styles.field}>
              <label>App Title</label>
              <input
                className={styles.input}
                placeholder="Example: Nova Analytics Pro"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label>Description</label>
              <textarea
                className={styles.textarea}
                placeholder="Explain what your app does, who it is for, and key benefits."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className={styles.split}>
              <div className={styles.field}>
                <label>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={styles.select}
                  required
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label>Price (TND)</label>
                <input
                  className={styles.input}
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label>Demo Video URL (Optional)</label>
              <input
                className={styles.input}
                type="url"
                placeholder="https://youtube.com/..."
                value={demoVideoUrl}
                onChange={(e) => setDemoVideoUrl(e.target.value)}
              />
            </div>

            <div className={styles.split}>
              <div className={styles.field}>
                <label>Version (Optional)</label>
                <input
                  className={styles.input}
                  placeholder="Example: 1.2.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label>Requirements (Optional)</label>
                <input
                  className={styles.input}
                  placeholder="Example: Windows 10+, 4 GB RAM"
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                />
              </div>
            </div>

            <FileDropInput
              label="Main App File"
              helperText="Upload your distributable app package or website archive."
              selectedFiles={appFile}
              onFilesChange={setAppFile}
              required
            />

            <FileDropInput
              label="Thumbnail Image"
              accept="image/*"
              helperText="Recommended minimum size: 1280x720 for best storefront quality."
              selectedFiles={thumbnailFile}
              onFilesChange={setThumbnailFile}
              required
            />

            <FileDropInput
              label="Media Gallery (Optional)"
              accept="image/*,video/*"
              multiple
              helperText="You can add up to 6 screenshots or demo clips."
              selectedFiles={mediaFiles}
              onFilesChange={setMediaFiles}
            />

            <FileDropInput
              label="Metadata File (Optional)"
              accept=".json,.toml,.ini,.cfg,.txt,.md"
              helperText="If provided, we auto-read fields like version/requirements from manifest/config notes."
              selectedFiles={metadataFile}
              onFilesChange={setMetadataFile}
            />

            <label className={styles.agreement}>
              <input
                type="checkbox"
                checked={acceptPolicy}
                onChange={(e) => setAcceptPolicy(e.target.checked)}
              />
              I confirm this submission is mine, safe to distribute, and compliant with NexusShop quality standards.
            </label>

            <button type="submit" disabled={isSubmitting} className={styles.cta}>
              {isSubmitting ? 'Submitting for Review...' : 'Submit for Review'}
            </button>
          </form>
        </section>

        <aside className={styles.infoCard}>
          <h2 className={styles.infoTitle}>Submission Checklist</h2>
          <div className={styles.checkList}>
            <div className={styles.checkItem}>Use a clear title and a real product description.</div>
            <div className={styles.checkItem}>Choose the closest category from the dropdown list.</div>
            <div className={styles.checkItem}>Provide a high-quality thumbnail to improve trust.</div>
            <div className={styles.checkItem}>Admin review is required before your app appears in the store.</div>
          </div>

          <div className={styles.badgeRow}>
            <span className={styles.badge}>Review required</span>
            <span className={styles.badge}>One-time 10 credit access fee</span>
            <span className={styles.badge}>Anti-fraud checks</span>
          </div>

          <div className={styles.trustBox}>
            <strong>Account status:</strong> {user ? `${user.role} • ${credits} credits available` : 'Not logged in'}
            {eligibility && (
              <div className={styles.eligibilityBox}>
                {eligibility.hasUnlockedPostingAccess
                  ? 'Posting fee status: unlocked (no one-time fee required anymore).'
                  : `Posting fee status: one-time ${eligibility.accessFee} credits required.`}
                {eligibility.feeRequiredNow && (
                  <div>
                    Eligibility: {eligibility.hasEnoughCreditsForFee ? 'Eligible now' : 'Not eligible yet (insufficient credits)'}
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
