import { useState, useEffect } from 'react'
import { uploadData, getUrl } from 'aws-amplify/storage'
import { Authenticator } from '@aws-amplify/ui-react'
import { QRCodeSVG } from 'qrcode.react'
import { 
  FaCloudUploadAlt, FaCheckCircle, FaCopy, FaSignOutAlt, 
  FaFile, FaFilePdf, FaFileImage, FaFileCode, FaFileArchive, FaListAlt, FaDownload, FaSpinner 
} from 'react-icons/fa'
import '@aws-amplify/ui-react/styles.css'
import './App.css'

// --- 1. Helper Components ---

// Icon Helper
const getFileIcon = (filename) => {
  if (!filename) return <FaFile />;
  const ext = filename.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <FaFileImage />;
  if (['pdf'].includes(ext)) return <FaFilePdf />;
  if (['zip', 'rar', '7z', 'tar'].includes(ext)) return <FaFileArchive />;
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json'].includes(ext)) return <FaFileCode />;
  return <FaFile />;
}

// Toast Component
const Toast = ({ msg }) => (
  <div className="toast">
    <FaCheckCircle /> {msg}
  </div>
);

// --- 2. Download Mode (Für Gäste) ---
function DownloadView({ filename }) {
  const [downloadUrl, setDownloadUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUrl = async () => {
      try {
        // Generiere einen frischen Link für den Gast
        const linkResult = await getUrl({
          path: `public/${filename}`,
          options: { validateObjectExistence: true, expiresIn: 900 },
        });
        setDownloadUrl(linkResult.url.toString());
        
        // Optional: Direkt weiterleiten
        // window.location.href = linkResult.url.toString();
      } catch (err) {
        setError('Datei nicht gefunden oder abgelaufen.');
      }
    };
    fetchUrl();
  }, [filename]);

  return (
    <div className="app-container" style={{textAlign: 'center', marginTop: '10vh'}}>
      <div className="card">
        <h2>Datei wird bereitgestellt</h2>
        <div style={{fontSize: '4rem', margin: '2rem 0', color: 'var(--accent)'}}>
          {getFileIcon(filename)}
        </div>
        <h3 style={{wordBreak: 'break-all'}}>{filename}</h3>
        
        {error ? (
          <p style={{color: 'red'}}>{error}</p>
        ) : downloadUrl ? (
          <a href={downloadUrl} className="btn-primary" style={{textDecoration: 'none', display:'inline-block'}}>
            <FaDownload style={{marginRight: '8px'}}/> Jetzt herunterladen
          </a>
        ) : (
          <p><FaSpinner className="icon-spin" /> Generiere Secure Link...</p>
        )}
      </div>
      <p style={{marginTop: '2rem', color: '#666', fontSize: '0.8rem'}}>
        Powered by Jose's FileShare
      </p>
    </div>
  );
}

// --- 3. Admin Mode (Upload) ---
function AdminView({ signOut, user }) {
  const [file, setFile] = useState(null)
  const [customName, setCustomName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadHistory, setUploadHistory] = useState([])
  const [copiedId, setCopiedId] = useState(null)
  const [toastMsg, setToastMsg] = useState('')

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const handleUpload = async () => {
    if (!file || !customName) return;
    setIsUploading(true);
    try {
      await uploadData({
        path: `public/${customName}`,
        data: file,
        options: {
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) setProgress(Math.round((transferredBytes / totalBytes) * 100));
          },
        },
      }).result;

      // TRICK: Wir erstellen den kurzen "App-Link" statt den langen AWS Link
      const shortLink = `${window.location.origin}/?file=${encodeURIComponent(customName)}`;
      
      navigator.clipboard.writeText(shortLink);
      setToastMsg('Smart-Link kopiert! 📋');

      setUploadHistory([{
        id: Date.now(),
        name: customName,
        url: shortLink, // Speichere den kurzen Link!
        date: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      }, ...uploadHistory]);
      
      setIsUploading(false);
      setFile(null);
      setCustomName('');
      setProgress(0);
    } catch (error) {
      setIsUploading(false);
      setToastMsg('Fehler: ' + error.message);
    }
  }

  return (
    <div className="app-container">
      {toastMsg && <Toast msg={toastMsg} />}
      
      <nav className="navbar">
        <h3>JOSE'S FILESHARE</h3>
        <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
          <span style={{fontSize:'0.8rem', color:'#888'}}>{user?.username}</span>
          <button onClick={signOut} className="btn-logout" title="Abmelden"><FaSignOutAlt /></button>
        </div>
      </nav>

      <div className="card">
        <div 
          className={`drop-zone ${isDragging ? 'active' : ''}`}
          onDragOver={(e) => {e.preventDefault(); setIsDragging(true)}}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault(); setIsDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) { setFile(f); setCustomName(f.name); setProgress(0); }
          }}
        >
          <input type="file" onChange={(e) => {
            const f = e.target.files[0];
            if (f) { setFile(f); setCustomName(f.name); setProgress(0); }
          }} />
          <FaCloudUploadAlt className="icon-upload" />
          <p style={{margin:0}}>Datei hierher ziehen</p>
        </div>

        {file && (
          <div className="file-info">
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}>
              {getFileIcon(file.name)}
              <span style={{fontWeight:'600', fontSize:'0.9rem'}}>{file.name}</span>
            </div>
            <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} className="modern-input" />
            {isUploading ? (
              <div className="progress-container"><div className="progress-fill" style={{width: `${progress}%`}}></div></div>
            ) : (
              <button onClick={handleUpload} className="btn-primary">Hochladen & Link erstellen</button>
            )}
          </div>
        )}
      </div>

      {uploadHistory.length > 0 && (
        <div className="card history-container">
          <h3><FaListAlt /> Deine Dateien</h3>
          <div className="history-list">
            {uploadHistory.map((item, index) => (
              <div key={item.id} className="history-item">
                <div className="file-meta">
                  <div className="file-icon">{getFileIcon(item.name)}</div>
                  <div className="file-details">
                    <span className="filename">{item.name}</span>
                    <span className="filedate">{item.date}</span>
                  </div>
                </div>
                <div className="action-row">
                  <input readOnly value={item.url} className="link-input" />
                  <button className="btn-icon" onClick={() => {
                    navigator.clipboard.writeText(item.url);
                    setCopiedId(item.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}>
                    {copiedId === item.id ? <FaCheckCircle /> : <FaCopy />}
                  </button>
                </div>
                {/* Jetzt ist der QR Code super lesbar, weil die URL kurz ist! */}
                {index === 0 && (
                  <div className="qr-box">
                     <QRCodeSVG value={item.url} size={150} level={"M"} includeMargin={true} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- 4. Main App Switcher ---
function App() {
  // Prüfe, ob wir im "Download Modus" sind (via URL Parameter ?file=...)
  const params = new URLSearchParams(window.location.search);
  const shareFile = params.get('file');

  if (shareFile) {
    // Zeige Download-Seite für GÄSTE (Kein Authenticator!)
    return <DownloadView filename={shareFile} />;
  }

  // Zeige Admin-Bereich (Mit Login)
  return (
    <Authenticator>
      {(props) => <AdminView {...props} />}
    </Authenticator>
  );
}

export default App