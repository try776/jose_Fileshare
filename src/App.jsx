import { useState } from 'react'
import { uploadData, getUrl } from 'aws-amplify/storage'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import './App.css'

function App() {
  const [file, setFile] = useState(null)
  const [customName, setCustomName] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const [downloadLink, setDownloadLink] = useState('')

  // Handler für Dateiauswahl
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      // Setze den Dateinamen standardmäßig auf den Originalnamen
      setCustomName(selectedFile.name)
      setUploadStatus('')
      setDownloadLink('')
    }
  }

  // Handler für den Upload
  const handleUpload = async () => {
    if (!file || !customName) {
      alert("Bitte Datei wählen und Namen vergeben.")
      return
    }

    try {
      setUploadStatus('Lade hoch...')
      
      // 1. Datei hochladen
      // Wir nutzen `path`, um Ordnerstrukturen zu simulieren
      // `public/` ist wichtig, damit wir später leichter darauf zugreifen können
      const result = await uploadData({
        path: `public/${customName}`, 
        data: file,
        options: {
          onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) {
              console.log(`Upload progress ${Math.round((transferredBytes / totalBytes) * 100)}%`)
            }
          },
        },
      }).result;

      setUploadStatus(`Erfolg! Datei gespeichert als: ${result.path}`)
      
      // 2. Share-Link generieren
      generateShareLink(`public/${customName}`)

    } catch (error) {
      console.error('Upload Fehler:', error)
      setUploadStatus(`Fehler: ${error.message}`)
    }
  }

  // Funktion zum Erstellen eines temporären Download-Links (Presigned URL)
  const generateShareLink = async (filePath) => {
    try {
      const linkResult = await getUrl({
        path: filePath,
        options: {
          validateObjectExistence: true, // Prüft, ob Datei existiert
          expiresIn: 900, // Link ist 15 Minuten (900 Sekunden) gültig
        },
      })
      setDownloadLink(linkResult.url.toString())
    } catch (error) {
      console.error('Link Fehler:', error)
    }
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="app-container">
          <nav className="navbar">
            <h3>Jose's FileShare</h3>
            <p>Hallo, {user?.username}</p>
            <button onClick={signOut}>Abmelden</button>
          </nav>

          <main className="main-content">
            <div className="card upload-card">
              <h2>Datei hochladen</h2>
              
              {/* Dateiauswahl */}
              <input 
                type="file" 
                onChange={handleFileChange} 
                style={{ marginBottom: '1rem' }}
              />

              {file && (
                <div className="file-options">
                  <label>
                    Speichern als (Name ändern):
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="name-input"
                    />
                  </label>
                  
                  <button onClick={handleUpload} style={{ marginTop: '1rem' }}>
                    Hochladen & Link generieren
                  </button>
                </div>
              )}

              {/* Status Meldungen */}
              {uploadStatus && <p className="status-msg">{uploadStatus}</p>}

              {/* Ergebnis: Download Link */}
              {downloadLink && (
                <div className="result-box">
                  <h3>Dein Share-Link (15 Min gültig):</h3>
                  <a href={downloadLink} target="_blank" rel="noopener noreferrer">
                    Hier klicken zum Download
                  </a>
                  <button 
                    onClick={() => navigator.clipboard.writeText(downloadLink)}
                    style={{ marginLeft: '10px', fontSize: '0.8em' }}
                  >
                    Link kopieren
                  </button>
                </div>
              )}
            </div>
          </main>
        </div>
      )}
    </Authenticator>
  )
}

export default App