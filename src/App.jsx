import { useState } from 'react'
import { FaReact, FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa'
import { AiFillHeart, AiFillFire } from 'react-icons/ai'
import { BiCodeAlt } from 'react-icons/bi'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header className="App-header">
        <div className="icon-wrapper">
          <FaReact className="react-icon spinning" size={80} color="#61dafb" />
        </div>
        
        <h1>
          <BiCodeAlt className="inline-icon" /> React + Vite + Jenkins
        </h1>
        
        <p>Successfully deployed with CI/CD pipeline!</p>

        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            <AiFillFire className="inline-icon" /> 
            Count is {count}
          </button>
          <p>Click the button to test reactivity</p>
        </div>

        <div className="social-links">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            <FaGithub size={30} />
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
            <FaLinkedin size={30} />
          </a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
            <FaTwitter size={30} />
          </a>
        </div>

        <footer className="footer">
          Made with <AiFillHeart className="heart-icon" color="#ff0000" /> by DevOps Team
        </footer>
      </header>
    </div>
  )
}

export default App