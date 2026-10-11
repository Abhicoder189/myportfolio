import React, { useEffect, useRef, useState } from "react";

import ReactMarkdown from "react-markdown";

import remarkGfm from "remark-gfm";

import { createRoot } from "react-dom/client";

import { Analytics } from "@vercel/analytics/react";

import {

  ArrowUpRight,

  AudioLines,

  Bot,

  Github,

  Linkedin,

  Mail,

  Mic,

  MicOff,

  Volume2,

  VolumeX,

  Download,

  Sparkles,

  Terminal,

  X,

  Minimize2,

  Radio,

  Moon,

  Send,

} from "lucide-react";

import "./style.css";



const API_URL = import.meta.env.VITE_CHAT_API_URL || "";

const API_METHOD = (

  import.meta.env.VITE_CHAT_API_METHOD || "POST"

).toUpperCase();

const API_TOKEN = import.meta.env.VITE_CHAT_API_TOKEN || "";

const starters = [

  "Tell me about Abhinav",

  "What projects has he built?",

  "What are his technical skills?",

  "Why should I hire him?",

  "Tell me about his CP journey",

];

const initialMessage = {

  role: "assistant",

  content:

    "Hey, I'm Astra — Abhinav's little corner-of-the-internet intelligence. Ask me about his projects, skills, competitive programming, or what he's learning. You can type, or hit the mic and just talk. ✦",

};



function App() {

  const [messages, setMessages] = useState([initialMessage]);

  const [input, setInput] = useState("");

  const [busy, setBusy] = useState(false);

  const [listening, setListening] = useState(false);

  const [voiceOn, setVoiceOn] = useState(true);

  const [speaking, setSpeaking] = useState(false);

  const [status, setStatus] = useState("SYSTEM IDLE");

  const [toast, setToast] = useState("");

  const recognitionRef = useRef(null);

  const endRef = useRef(null);

  const inputRef = useRef(null);



  useEffect(() => {

    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });

  }, [messages, busy]);

  useEffect(

    () => () => {

      recognitionRef.current?.stop?.();

      window.speechSynthesis?.cancel?.();

    },

    [],

  );



  function notify(message) {

    setToast(message);

    window.setTimeout(() => setToast(""), 3000);

  }



  function speak(text) {

    if (!voiceOn || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.rate = 0.96;

    utterance.pitch = 1.04;

    const voices = window.speechSynthesis.getVoices();

    utterance.voice =

      voices.find(

        (v) =>

          /en-IN|en-US|en-GB/i.test(v.lang) &&

          /natural|google|microsoft/i.test(v.name),

      ) ||

      voices.find((v) => /^en/i.test(v.lang)) ||

      null;

    utterance.onstart = () => {

      setSpeaking(true);

      setStatus("ASTRA IS SPEAKING");

    };

    utterance.onend = () => {

      setSpeaking(false);

      setStatus("SYSTEM IDLE");

    };

    utterance.onerror = () => {

      setSpeaking(false);

      setStatus("SYSTEM IDLE");

    };

    window.speechSynthesis.speak(utterance);

  }



  async function sendMessage(raw) {
    const text = raw.trim();
    if (!text || busy) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setBusy(true);
    setStatus("THINKING...");

    // Add an empty assistant message first, then stream into it.
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    let answer = "";

    try {
      if (!API_URL) {
        throw new Error(
          "API endpoint is not configured. Set VITE_CHAT_API_URL in Vercel Environment Variables and redeploy."
        );
      }

      const headers = { "Content-Type": "application/json" };
      if (API_TOKEN) headers.Authorization = `Bearer ${API_TOKEN}`;

      const response = await fetch(`${API_URL.replace(/\/$/, "")}/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ question: text }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(`API returned ${response.status}${detail ? `: ${detail}` : ""}`);
      }
      if (!response.body) throw new Error("This response does not support streaming.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      const updateAssistantMessage = (content) => {
        setMessages((prev) => {
          const updated = [...prev];
          // Update the assistant message created for this request.
          const assistantIndex = updated.length - 1;
          updated[assistantIndex] = {
            ...updated[assistantIndex],
            content,
          };
          return updated;
        });
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        updateAssistantMessage(answer);
      }

      answer += decoder.decode();
      updateAssistantMessage(answer);

      if (!answer.trim()) throw new Error("The API returned an empty answer.");
      speak(answer);
    } catch (err) {
      const errorText = `Connection glitch: ${err.message}. Check the backend service, API URL, and CORS settings.`;
      setMessages((prev) => {
        const updated = [...prev];
        const assistantIndex = updated.length - 1;
        if (updated[assistantIndex]?.role === "assistant" && !updated[assistantIndex].content) {
          updated[assistantIndex] = { ...updated[assistantIndex], content: errorText, error: true };
        } else {
          updated.push({ role: "assistant", content: errorText, error: true });
        }
        return updated;
      });
      setStatus("CONNECTION GLITCH");
    } finally {
      setBusy(false);
      if (!speaking) setStatus("SYSTEM IDLE");
    }
  }

  function startListening() {

    const SpeechRecognition =

      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

      notify(

        "Speech recognition is not supported here. Try Chrome on localhost or use the text box.",

      );

      return;

    }

    if (listening) {

      recognitionRef.current?.stop();

      setListening(false);

      return;

    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";

    recognition.interimResults = true;

    recognition.continuous = false;

    recognitionRef.current = recognition;

    recognition.onstart = () => {

      setListening(true);

      setStatus("LISTENING — GO AHEAD");

    };

    recognition.onresult = (event) => {

      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i++)

        transcript += event.results[i][0].transcript;

      setInput(transcript);

      if (event.results[event.results.length - 1].isFinal) {

        setListening(false);

        setStatus("PROCESSING VOICE");

        sendMessage(transcript);

      }

    };

    recognition.onerror = (event) => {

      setListening(false);

      setStatus("SYSTEM IDLE");

      notify(`Mic issue: ${event.error}. You can type instead.`);

    };

    recognition.onend = () => {

      setListening(false);

      setStatus("SYSTEM IDLE");

    };

    recognition.start();

  }



  function handleSubmit(e) {

    e.preventDefault();

    sendMessage(input);

  }

  function clearChat() {

    window.speechSynthesis?.cancel?.();

    setMessages([initialMessage]);

    setStatus("SYSTEM IDLE");

  }



  return (

    <main className="scene">

      <div className="stars" aria-hidden="true" />

      <div className="window-glow" aria-hidden="true" />

      <header className="topbar">

        <a className="brand" href="#home">

          <span className="brand-mark">���</span> ABHINAV

          <span className="dim">.EXE</span>

          <span className="cursor">▌</span>

        </a>

        <nav>

          <a href="#home">[ HOME ]</a>

          <a href="#terminal">[ TERMINAL ]</a>

          <a href="#profile">[ PROFILE ]</a>

          <a href="#links">[ CONTACT ]</a>

        </nav>

        <button

          className={`voice-toggle ${voiceOn ? "enabled" : ""}`}

          onClick={() => {

            setVoiceOn((v) => !v);

            if (voiceOn) window.speechSynthesis?.cancel?.();

          }}

        >

          <Volume2 size={16} />

          <span>VOICE: {voiceOn ? "ON" : "OFF"}</span>

          <AudioLines size={17} />

        </button>

      </header>



      <section className="desk" id="home">

        <div className="moon-window">

          <div className="moon" />

          <div className="city city-a" />

          <div className="city city-b" />

          <div className="city city-c" />

          <div className="window-plant">✦</div>

        </div>

        <aside className="left-wall">

          <div className="note">

            <span className="tape" />

            just a human

            <br />

            who codes...

            <br />

            builds...

            <br />

            explores...

            <br />

            and keeps going.<span className="note-smile">⌁</span>

          </div>

          <div className="photo">

            ☾

            <small>

              somewhere

              <br />

              between bugs

              <br />

              and breakthroughs

            </small>

          </div>

          <div className="book-stack">

            <span>C++</span>

            <span>DSA</span>

            <span>WEB DEV</span>

            <span>AI / ML</span>

            <span>SYSTEM DESIGN</span>

          </div>

        </aside>



        <div className="terminal-wrap" id="terminal">

          <div className="crt-shell">

            <div className="crt-bezel">

              <div className="crt-screen">

                <div className="terminal-head">

                  <span>

                    SENTIMENTAL TERMINAL <b>v1.0</b>

                  </span>

                  <span className="online">

                    <i />{" "}

                    {busy ? "PROCESSING" : listening ? "LISTENING" : "ONLINE"}

                  </span>

                  <span className="voice-bars">VOICE MODE ▮▮▮</span>

                </div>

                <div className="terminal-body">

                  <div className="bot-avatar">

                    <div

                      className={`bot-face ${listening ? "listening" : speaking ? "speaking" : ""}`}

                    >

                      <span className="eyes">•ᴗ•</span>

                      <span className="mouth">⌣</span>

                    </div>

                    <span className="avatar-label">ASTRA / AI</span>

                  </div>

                  <div className="conversation" aria-live="polite">

                    {messages.map((m, i) => (

                      <div

                        key={i}

                        className={`message ${m.role} ${m.error ? "error" : ""}`}

                      >

                        <div className="message-label">

                          {m.role === "assistant" ? "ASTRA" : "YOU"}{" "}

                          <span>{m.role === "assistant" ? ">" : "$"}</span>

                        </div>

                        <div className="markdown-content">

                          <ReactMarkdown remarkPlugins={[remarkGfm]}>

                            {m.content}

                          </ReactMarkdown>

                        </div>

                      </div>

                    ))}

                    {busy && (

                      <div className="message assistant">

                        <div className="message-label">

                          ASTRA <span>&gt;</span>

                        </div>

                        <p className="typing">

                          <i />

                          <i />

                          <i /> thinking through the stars...

                        </p>

                      </div>

                    )}

                    <div ref={endRef} />

                  </div>

                </div>

                {messages.length === 1 && (

                  <div className="quick-prompts">

                    {starters.map((s) => (

                      <button key={s} onClick={() => sendMessage(s)}>

                        {s}

                        <ArrowUpRight size={12} />

                      </button>

                    ))}

                  </div>

                )}

                <form className="input-row" onSubmit={handleSubmit}>

                  <button

                    type="button"

                    className={`mic-button ${listening ? "recording" : ""}`}

                    onClick={startListening}

                    aria-label={

                      listening ? "Stop listening" : "Start voice input"

                    }

                  >

                    {listening ? <MicOff size={19} /> : <Mic size={19} />}

                  </button>

                  <input

                    ref={inputRef}

                    value={input}

                    onChange={(e) => setInput(e.target.value)}

                    placeholder={

                      listening

                        ? "Listening... speak your mind"

                        : "Type a question, or tap the mic and speak..."

                    }

                    aria-label="Ask Astra a question"

                  />

                  {speaking && (

                    <button

                      type="button"

                      className="sound-button"

                      onClick={() => {

                        window.speechSynthesis.cancel();

                        setSpeaking(false);

                      }}

                      aria-label="Stop voice response"

                    >

                      <VolumeX size={17} />

                    </button>

                  )}

                  <button

                    className="send-button"

                    type="submit"

                    disabled={busy || !input.trim()}

                    aria-label="Send message"

                  >

                    <Send size={17} />

                  </button>

                </form>

                <div className="terminal-foot">

                  <span>

                    <kbd>ENTER</kbd> SEND

                  </span>

                  <span>

                    <kbd>MIC</kbd> TALK TO ASTRA

                  </span>

                  <button onClick={clearChat}>

                    <X size={12} /> CLEAR SESSION

                  </button>

                  <span className="session">SESSION 0xA7F</span>

                </div>

              </div>

            </div>

            <div className="crt-controls">

              <span />

              <span />

              <span />

              <i />

            </div>

            <div className="keyboard">

              <div className="key-row">

                {Array.from("QWERTYUIOP").map((k, i) => (

                  <i key={k} style={{ "--i": i }}>

                    {k}

                  </i>

                ))}

              </div>

              <div className="key-row second">

                {Array.from("ASDFGHJKL").map((k, i) => (

                  <i key={k} style={{ "--i": i }}>

                    {k}

                  </i>

                ))}

              </div>

              <div className="key-row third">

                {Array.from("ZXCVBNM").map((k, i) => (

                  <i key={k} style={{ "--i": i }}>

                    {k}

                  </i>

                ))}

                <i className="space-key">SPACE</i>

              </div>

            </div>

          </div>

        </div>



        <aside className="right-side">

          <div className="speech-bubble">

            I can listen, too! <span>🎙</span>

            <br />

            Ask me anything about Abhinav.

            <b />

          </div>

          <div

            className={`robot ${listening ? "robot-listening" : speaking ? "robot-speaking" : ""}`}

          >

            <div className="antenna" />

            <div className="robot-head">

              <div className="robot-ear left" />

              <div className="robot-ear right" />

              <div className="robot-screen">

                <span>{listening ? "◉ ◉" : speaking ? "◡ ◡" : "⌣ ⌣"}</span>

                <i>

                  {listening

                    ? "LISTENING"

                    : speaking

                      ? "SPEAKING"

                      : "READY TO CHAT"}

                </i>

              </div>

            </div>

            <div className="robot-body">

              <span>✦</span>

            </div>

            <div className="robot-feet">

              <i />

              <i />

            </div>

          </div>

          <div className="robot-caption">

            <Radio size={12} /> ASTRA IS{" "}

            {listening ? "LISTENING" : speaking ? "SPEAKING" : "AWAITING INPUT"}

          </div>

          <div className="desk-clock">

            <strong>23:47</strong>

            <span>STILL BUILDING...</span>

          </div>

        </aside>

        <div className="desk-lamp">

          <div className="lamp-shade" />

          <div className="lamp-stem" />

          <div className="lamp-base" />

          <div className="lamp-light" />

        </div>

        <div className="desk-surface">

          <div className="mug">

            <span>

              Good

              <br />

              Code

              <br />

              Better

              <br />

              Life ☻

            </span>

            <i />

          </div>

          <div className="plant">

            <i />

            <i />

            <i />

            <b />

          </div>

          <div className="desk-label">

            BUILD SOMETHING THAT MATTERS <span>✦</span>

          </div>

        </div>

      </section>



      <section className="profile-strip" id="profile">

        <article className="profile-card">

          <div className="pixel-avatar">

            <span>AG</span>

          </div>

          <div>

            <h2>ABHINAV GUPTA</h2>

            <p>

              Full Stack Developer <b>|</b> AI Explorer <b>|</b> CP Enthusiast

            </p>

            <small>Turning ideas into real-world products.</small>

          </div>

        </article>

        <article className="quote-card">

          <span className="quote-mark">“</span>

          <p>

            A little curious,

            <br />a bit chaotic,

            <br />

            but always building something.

          </p>

          <span className="quote-star">✳</span>

        </article>

        <article className="now-card">

          <h3>

            <i /> CURRENTLY

          </h3>

          <ul>

            <li>Learning AI / ML</li>

            <li>Building useful things</li>

            <li>Solving problems</li>

            <li>Exploring systems</li>

            <li>Trying to be a little better</li>

          </ul>

        </article>

        <article className="links-card" id="links">

          <h3>QUICK LINKS</h3>

          <a href="https://github.com/Abhicoder189" target="_blank" rel="noreferrer">

            <Github size={14} /> GitHub <ArrowUpRight size={11} />

          </a>

          <a href="https://www.linkedin.com/in/abhinav-gupta-84a557305" target="_blank" rel="noreferrer">

            <Linkedin size={14} /> LinkedIn <ArrowUpRight size={11} />

          </a>

          <a href="/resume.pdf" target="_blank">

            <Download size={14} /> Resume <ArrowUpRight size={11} />

          </a>

          <a href="mailto:guptaabhinav929@gmail.com" target="_blank" rel="noreferrer">

            <Mail size={14} /> Email <ArrowUpRight size={11} />

          </a>

        </article>

      </section>

      <footer>

        <span>© 2026 ABHINAV.EXE</span>

        <span>

          MADE WITH CAFFEINE, CURIOSITY & A QUESTIONABLE AMOUNT OF CSS

        </span>

        <span>

          <Moon size={12} /> NIGHT MODE FOREVER

        </span>

      </footer>

      {toast && (

        <div className="toast">

          <Sparkles size={15} />

          {toast}

        </div>

      )}

      <Analytics />

    </main>

  );

}



createRoot(document.getElementById("root")).render(<App />);
