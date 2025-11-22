import { useState } from 'react'
import { uploadData, getUrl } from 'aws-amplify/storage'
import { Authenticator } from '@aws-amplify/ui-react'
import { QRCodeSVG } from 'qrcode.react' // Feature: QR Code
import { 
  FaCloudUploadAlt, 
  FaFile, 
  FaCheckCircle, 
  FaCopy, 
  FaHistory,
  FaSignOutAlt 
} from 'react-icons/fa' // Feature: Icons
import '@aws-amplify/ui-react/styles.css'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [customName, setCustomName] = useState('')
  const [isDragging, setIsDragging] = useState(false) // Feature: Drag State
  const [progress, setProgress] = useState(0) // Feature: Progress Bar
  const [isUploading, setIsUploading] = useState(false)
  const [uploadHistory, setUploadHistory] = useState([]) // Feature: History
  const [copiedId, setCopiedId] = useState(null) // Feature: Copy Feedback

  // --- Drag & Drop Handler ---
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) processFile(droppedFile)
  }

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) processFile(selectedFile)
  }

  const processFile = (fileData) => {
    setFile(fileData)
    setCustomName(fileData.name)
    setProgress(0)
  }

  // --- Upload Logic ---
  const handleUpload = async () => {
    if (!file || !customName) return

    setIsUploading(true)
    try {
      const path = `public/${customName}`
      
      await uploadData({
        path: path,
        data: file,
        options: {
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              const percentage = Math.round((transferredBytes / totalBytes) * 100)
              setProgress(percentage)
            }
          },
        },
      }).result

      // Link generieren
      const linkResult = await getUrl({
        path: path,
        options: { validateObjectExistence: true, expiresIn: 900 },
      })

      // Zur Historie hinzufügen (Neues Feature!)
      const newEntry = {
        id: Date.now(),
        name: customName,
        url: linkResult.url.toString(),
        date: newjhDate().toLocaleTimeString()
      }

      setUploadHistory([newEntry, ...uploadHistory])
      
      // Reset
      setIsUploading(false)
      setFile(null)
      setCustomName('')
      setProgress(0)

    } catch (error) {
      console.error('Error:', error)
      setIsUploading(false)
      alert("Upload fehlgeschlagen: " + error.message)
    }
  }

  // --- Copy Handler ---
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="app-container">
          {/* Navbar */}
          <nav className="navbar">
            <h3>JOSE'S FILESHARE <span style={{fontSize:'0.5em', color:'#6366f1'}}>PRO</span></h3>
            <div className="nav-user">
              <span>{user?.username}</span>
              <button onClick={signOut} className="btn-logout" title="Abmelden">
                <FaSignOutAlt />
              </button>
            </div>
          </nav>

          <div className="grid-layout">
            {/* Linke Spalte: Upload Area */}
            <div className="card">
              <h2>Datei hochladen</h2>
              
              <div 
                className={`drop-zone ${isDragging ? 'active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input type="file" onChange={handleFileSelect} />
                <FaCloudUploadAlt className="icon-upload" />
                <p>Datei hierher ziehen oder <strong>klicken</strong></p>
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>S3 Secure Storage</p>
              </div>

              {file && (
                <div className="file-info">
                  <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}>
                    <FaFile style={{color: 'var(--accent)'}}/>
                    <span style={{fontWeight:'bold'}}>{file.name}</span>
                    <span style={{fontSize:'0.8em', color:'#888'}}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>

                  <div className="input-group">
                    <label>Dateiname auf Server:</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="modern-input"
                    />
                  </div>

                  {isUploading ? (
                    <div className="progress-container">
                      <div className="progress-fill" style={{width: `${progress}%`}}></div>
                    </div>
                  ) : (
                    <button onClick={handleUpload} className="btn-primary">
                      Upload starten
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Rechte Spalte: History & QR */}
            <div className="right-column">
              <div className="card" style={{minHeight: '200px'}}>
                <h3 style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <FaHistory /> Session Uploads
                </h3>
                
                {uploadHistory.length === 0 ? (
                  <p style={{color: 'var(--text-muted)', fontStyle: 'italic'}}>
                    Noch keine Uploads in dieser Session.
                  </p>
                ) : (
                  <div className="history-list">
                    {/* Wir zeigen immer nur das Neueste expanded an */}
                    {uploadHistory.map((item, index) => (
                      <div key={item.id} className="history-item">
                        <div className="history-header">
                          <span>{item.name}</span>
                          <span style={{fontSize:'0.8em', color:'#888'}}>{item.date}</span>
                        </div>
                        
                        <div className="link-box">
                          <input 
                            readOnly 
                            value={item.url} 
                            className="modern-input" 
                            style={{fontSize:'0.8em', padding:'0.4rem'}}
                          />
                          <button 
                            className="btn-copy"
                            onClick={() => copyToClipboard(item.url, item.id)}
                            style={{background: copiedId === item.id ? 'var(--success)' : ''}}
                          >
                            {copiedId === item.id ? <FaCheckCircle /> : <FaCopy />}
                          </button>
                        </div>

                        {/* QR Code nur für das allerneuste Item anzeigen */}
                        {index === 0 && (
                          <div className="qr-container">
                             <QRCodeSVG value={item.url} size={128} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Authenticator>
  )
}

export default App