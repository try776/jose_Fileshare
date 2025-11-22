import { useState, useEffect } from 'react'
import { uploadData, getUrl } from 'aws-amplify/storage'
import { Authenticator } from '@aws-amplify/ui-react'
import { QRCodeSVG } from 'qrcode.react'
import { 
  FaCloudUploadAlt, FaCheckCircle, FaCopy, FaSignOutAlt, 
  FaFile, FaFilePdf, FaFileImage, FaFileCode, FaFileArchive, FaListAlt 
} from 'react-icons/fa'
import '@aws-amplify/ui-react/styles.css'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [customName, setCustomName] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadHistory, setUploadHistory] = useState([])
  const [copiedId, setCopiedId] = useState(null)
  const [toastMsg, setToastMsg] = useState('') // Feature: Toast Notification

  // Feature: Smart Icons helper
  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return <FaFileImage />;
    if (['pdf'].includes(ext)) return <FaFilePdf />;
    if (['zip', 'rar', '7z', 'tar'].includes(ext)) return <FaFileArchive />;
    if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json'].includes(ext)) return <FaFileCode />;
    return <FaFile />;
  }

  // Toast Timer
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
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  }
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) processFile(selectedFile);
  }

  const processFile = (fileData) => {
    setFile(fileData);
    setCustomName(fileData.name);
    setProgress(0);
  }

  const handleUpload = async () => {
    if (!file || !customName) return;
    setIsUploading(true);
    try {
      const path = `public/${customName}`;
      await uploadData({
        path: path,
        data: file,
        options: {
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) setProgress(Math.round((transferredBytes / totalBytes) * 100));
          },
        },
      }).result;

      const linkResult = await getUrl({
        path: path,
        options: { validateObjectExistence: true, expiresIn: 900 },
      });

      const link = linkResult.url.toString();
      
      // Feature: Auto-Copy to Clipboard
      navigator.clipboard.writeText(link);
      setToastMsg('Link automatisch kopiert! 📋');

      const newEntry = {
        id: Date.now(),
        name: customName,
        url: link,
        date: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };

      setUploadHistory([newEntry, ...uploadHistory]);
      
      // Cleanup
      setIsUploading(false);
      setFile(null);
      setCustomName('');
      setProgress(0);

    } catch (error) {
      console.error(error);
      setIsUploading(false);
      setToastMsg('Upload Fehler: ' + error.message);
    }
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setToastMsg('Link in die Zwischenablage kopiert!');
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="app-container">
          {/* Toast Notification */}
          {toastMsg && (
            <div className="toast">
              <FaCheckCircle /> {toastMsg}
            </div>
          )}

          <nav className="navbar">
            <h3>JOSE'S FILESHARE</h3>
            <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
              <span style={{fontSize:'0.8rem', color:'#888'}}>{user?.username}</span>
              <button onClick={signOut} className="btn-logout" title="Abmelden">
                <FaSignOutAlt />
              </button>
            </div>
          </nav>

          {/* Card 1: Upload */}
          <div className="card">
            <div 
              className={`drop-zone ${isDragging ? 'active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input type="file" onChange={handleFileSelect} />
              <FaCloudUploadAlt className="icon-upload" />
              <p style={{margin:0}}>Datei hierher ziehen oder klicken</p>
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', margin:0, marginTop:'5px'}}>
                S3 Secure Storage
              </p>
            </div>

            {file && (
              <div className="file-info">
                <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}>
                  {getFileIcon(file.name)}
                  <span style={{fontWeight:'600', fontSize:'0.9rem'}}>{file.name}</span>
                </div>
                <label style={{fontSize:'0.8rem', color:'#ccc'}}>Dateiname auf Server:</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="modern-input"
                />
                {isUploading ? (
                  <div className="progress-container">
                    <div className="progress-fill" style={{width: `${progress}%`}}></div>
                  </div>
                ) : (
                  <button onClick={handleUpload} className="btn-primary">
                    Hochladen starten
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Deine Dateien (Liste) */}
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
                        <span className="filedate">Hochgeladen um {item.date}</span>
                      </div>
                    </div>
                    
                    <div className="action-row">
                      <input readOnly value={item.url} className="link-input" />
                      <button 
                        className={`btn-icon ${copiedId === item.id ? 'success' : ''}`}
                        onClick={() => copyToClipboard(item.url, item.id)}
                        title="Link kopieren"
                      >
                        {copiedId === item.id ? <FaCheckCircle /> : <FaCopy />}
                      </button>
                    </div>

                    {/* QR Code nur beim neuesten Item automatisch */}
                    {index === 0 && (
                      <div className="qr-box">
                         <QRCodeSVG value={item.url} size={100} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Authenticator>
  )
}

export default App