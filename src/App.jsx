import { useState, useEffect } from 'react'
import { uploadData, getUrl, remove, getProperties } from 'aws-amplify/storage'
import { generateClient } from 'aws-amplify/data'
import { Authenticator } from '@aws-amplify/ui-react'
import { QRCodeSVG } from 'qrcode.react'
import { 
  FaCloudUploadAlt, FaCheckCircle, FaCopy, FaSignOutAlt, 
  FaFile, FaFilePdf, FaFileImage, FaFileCode, FaFileArchive, FaListAlt, FaDownload, FaSpinner, FaTrash, FaExclamationTriangle 
} from 'react-icons/fa'
import '@aws-amplify/ui-react/styles.css'
import './App.css'

const client = generateClient();

// --- Helper Components ---
const getFileIcon = (filename) => {
  if (!filename) return <FaFile />;
  const ext = filename.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <FaFileImage />;
  if (['pdf'].includes(ext)) return <FaFilePdf />;
  if (['zip', 'rar', '7z', 'tar'].includes(ext)) return <FaFileArchive />;
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json'].includes(ext)) return <FaFileCode />;
  return <FaFile />;
}

const Toast = ({ msg }) => (
  <div className="toast">
    <FaCheckCircle /> {msg}
  </div>
);

// --- 2. Download Mode (ID-basiert) ---
function DownloadView({ fileId }) {
  const [downloadUrl, setDownloadUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveFile = async () => {
      try {
        // 1. Datenbank fragen: Welche Datei gehört zu dieser ID?
        // Wir nutzen "authMode: 'identityPool'", damit auch Gäste lesen dürfen
        const { data: record } = await client.models.UserFile.get(
          { id: fileId }, 
          { authMode: 'identityPool' } 
        );

        if (!record) {
          throw new Error("Eintrag nicht in Datenbank gefunden.");
        }

        setFileName(record.customName);
        const path = record.filePath;

        // 2. 30-Tage-Check (via S3 Metadaten)
        const props = await getProperties({ path });
        
        if (props.lastModified) {
          const now = new Date();
          const uploadDate = new Date(props.lastModified);
          const diffDays = Math.ceil(Math.abs(now - uploadDate) / (1000 * 60 * 60 * 24));

          if (diffDays > 30) {
            setError('Dieser Link ist abgelaufen (älter als 30 Tage).');
            setLoading(false);
            return;
          }
        }

        // 3. Gültigen S3-Link generieren
        const linkResult = await getUrl({
          path: path,
          options: { validateObjectExistence: true, expiresIn: 900 },
        });
        setDownloadUrl(linkResult.url.toString());

      } catch (err) {
        console.error(err);
        setError('Datei nicht gefunden oder Link ungültig.');
      } finally {
        setLoading(false);
      }
    };
    resolveFile();
  }, [fileId]);

  return (
    <div className="app-container" style={{textAlign: 'center', marginTop: '10vh'}}>
      <div className="card">
        <h2>Datei Download</h2>
        
        <div style={{fontSize: '4rem', margin: '2rem 0', color: error ? 'var(--text-muted)' : 'var(--accent)', transition: 'color 0.3s'}}>
          {error ? <FaExclamationTriangle /> : getFileIcon(fileName)}
        </div>
        
        <h3 style={{wordBreak: 'break-all', marginBottom: '1.5rem'}}>
          {loading ? 'Lade Informationen...' : (fileName || 'Unbekannte Datei')}
        </h3>
        
        {loading ? (
          <p><FaSpinner className="icon-spin" /> Suche Datei...</p>
        ) : error ? (
          <div style={{color: '#dc3545', background: '#fff5f5', padding: '1rem', borderRadius: '8px', border: '1px solid #dc3545'}}>
            <strong>Fehler</strong><br/>
            {error}
          </div>
        ) : (
          <div>
            <a href={downloadUrl} className="btn-primary" style={{textDecoration: 'none', display:'inline-flex', alignItems: 'center', gap: '10px', justifyContent: 'center'}}>
              <FaDownload /> Herunterladen
            </a>
            <p style={{fontSize: '0.8rem', color: 'var(--success)', marginTop: '1rem'}}>
              <FaCheckCircle style={{verticalAlign: 'middle'}}/> Sicherer Download
            </p>
          </div>
        )}
      </div>
      <p style={{marginTop: '2rem', color: '#666', fontSize: '0.8rem'}}>
        Secure FileShare by Jose
      </p>
    </div>
  );
}

// --- 3. Admin Mode ---
function AdminView({ signOut, user }) {
  const [file, setFile] = useState(null)
  const [customName, setCustomName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [fileList, setFileList] = useState([]) 
  const [copiedId, setCopiedId] = useState(null)
  const [toastMsg, setToastMsg] = useState('')

  // Email-Adresse sicher extrahieren
  const userEmail = user?.signInDetails?.loginId || user?.username || 'Benutzer';

  useEffect(() => { fetchFiles(); }, []);

  const fetchFiles = async () => {
    try {
      const { data: items } = await client.models.UserFile.list({ authMode: 'userPool' });
      // Sortieren nach Erstellungsdatum
      const sortedItems = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setFileList(sortedItems);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); }
  const handleDragLeave = () => { setIsDragging(false); }
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }
  const handleFileSelect = (e) => { const f = e.target.files[0]; if (f) processFile(f); }
  const processFile = (fileData) => {
    setFile(fileData);
    setCustomName(fileData.name);
    setProgress(0);
  }

  const handleUpload = async () => {
    if (!file || !customName) return;
    setIsUploading(true);
    try {
      const s3Path = `public/${customName}`;
      
      // 1. Upload S3
      await uploadData({
        path: s3Path,
        data: file,
        options: {
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) setProgress(Math.round((transferredBytes / totalBytes) * 100));
          },
        },
      }).result;

      // 2. Datenbank Eintrag erstellen
      const { data: newRecord } = await client.models.UserFile.create({
        customName: customName,
        filePath: s3Path,
        fileSize: parseFloat((file.size / 1024 / 1024).toFixed(2)),
        downloadUrl: '' // Platzhalter, wird gleich aktualisiert
      });

      // 3. Kurzen Link generieren mit der DB-ID (UUID)
      const shortLink = `${window.location.origin}/?id=${newRecord.id}`;

      // 4. Link in DB speichern
      await client.models.UserFile.update({
        id: newRecord.id,
        downloadUrl: shortLink
      });

      navigator.clipboard.writeText(shortLink);
      setToastMsg('Hochgeladen & Link kopiert! 📋');
      await fetchFiles();
      setIsUploading(false); setFile(null); setCustomName(''); setProgress(0);
    } catch (error) {
      setIsUploading(false); setToastMsg('Fehler: ' + error.message);
    }
  }

  const handleDelete = async (id, filePath) => {
    if(!window.confirm("Datei wirklich löschen?")) return;
    try {
      await remove({ path: filePath });
      await client.models.UserFile.delete({ id });
      setToastMsg('Gelöscht 🗑️');
      await fetchFiles(); 
    } catch (error) { setToastMsg('Fehler: ' + error.message); }
  };

  return (
    <div className="app-container">
      {toastMsg && <Toast msg={toastMsg} />}
      <nav className="navbar">
        <h3>JOSE'S FILESHARE</h3>
        <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
          <span style={{fontSize:'0.9rem', fontWeight:'500'}}>{userEmail}</span>
          <button onClick={signOut} className="btn-logout" title="Abmelden"><FaSignOutAlt /></button>
        </div>
      </nav>

      <div className="card">
        <div 
          className={`drop-zone ${isDragging ? 'active' : ''}`}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        >
          <input type="file" onChange={handleFileSelect} />
          <FaCloudUploadAlt className="icon-upload" />
          <p style={{margin:0, fontWeight:500}}>Datei hierher ziehen oder klicken</p>
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
              <button onClick={handleUpload} className="btn-primary">Hochladen</button>
            )}
          </div>
        )}
      </div>

      {fileList.length > 0 && (
        <div className="card history-container">
          <h3><FaListAlt /> Deine Dateien ({fileList.length})</h3>
          <div className="history-list">
            {fileList.map((item, index) => (
              <div key={item.id} className="history-item">
                <div className="file-meta">
                  <div className="file-icon">{getFileIcon(item.customName)}</div>
                  <div className="file-details">
                    <span className="filename">{item.customName}</span>
                    <span className="filedate">{new Date(item.createdAt).toLocaleDateString()} • {item.fileSize} MB</span>
                  </div>
                </div>
                <div className="action-row">
                  {/* Link Input ist jetzt schreibgeschützt und zeigt den kurzen Link */}
                  <input readOnly value={item.downloadUrl} className="link-input" onClick={(e) => e.target.select()}/>
                  <button className="btn-icon" onClick={() => {navigator.clipboard.writeText(item.downloadUrl); setCopiedId(item.id); setTimeout(() => setCopiedId(null), 2000);}} title="Kopieren">
                    {copiedId === item.id ? <FaCheckCircle /> : <FaCopy />}
                  </button>
                  <button className="btn-icon delete" onClick={() => handleDelete(item.id, item.filePath)} title="Löschen">
                    <FaTrash />
                  </button>
                </div>
                {index === 0 && (
                  <div className="qr-box" style={{display: 'flex', justifyContent: 'center'}}>
                     <QRCodeSVG value={item.downloadUrl} size={150} level={"L"} includeMargin={true} />
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
  const params = new URLSearchParams(window.location.search);
  const fileId = params.get('id'); // Wir suchen jetzt nach ?id=...

  if (fileId) {
    return <DownloadView fileId={fileId} />;
  }

  return (
    <Authenticator>
      {(props) => <AdminView {...props} />}
    </Authenticator>
  );
}

export default App