import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { startGD, turnGD, scoreGD } from "../api/practice";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

const RUBRIC_LABELS = {
  contentRelevance: "Content Relevance & Domain Depth",
  communicationClarity: "Communication Clarity & Articulation",
  collaborationListening: "Collaboration & Active Listening",
  initiative: "Initiative & Conversation Leadership",
  structure: "Logical Structure & Synthesis",
};

export default function GroupDiscussionRound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "company" ? "company" : "practice";
  const company = searchParams.get("company");
  const role = user?.profile?.targetRole;

  // Lifecycle Phases: unsupported | loading | lobby | in-call | evaluating | feedback
  const [phase, setPhase] = useState("loading");
  const [attemptId, setAttemptId] = useState(null);
  const [topic, setTopic] = useState("");
  const [topicContext, setTopicContext] = useState("");
  const [personas, setPersonas] = useState([]);
  const [turns, setTurns] = useState([]);
  const [result, setResult] = useState(null);

  // Call & Audio States
  const [activeSpeaker, setActiveSpeaker] = useState(null); // 'user' | persona.name | 'Moderator' | null
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSubmittingTurn, setIsSubmittingTurn] = useState(false);
  const [liveCaption, setLiveCaption] = useState("");
  const [showTranscriptDrawer, setShowTranscriptDrawer] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState(null);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [callDuration, setCallDuration] = useState(0);

  // References
  const recognitionRef = useRef(null);
  const accumulatedTranscriptRef = useRef("");
  const currentUtteranceRef = useRef(null);
  const isSpeechSupported =
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  // Load available speech synthesis voices
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setAvailableVoices(v);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Check speech recognition support
  useEffect(() => {
    if (!isSpeechSupported) {
      setPhase("unsupported");
    }
  }, [isSpeechSupported]);

  // Call duration counter
  useEffect(() => {
    if (phase !== "in-call") return;
    const interval = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // Clean up recognition and TTS on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Format seconds to mm:ss
  const formatCallTime = (totalSec) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Helper to pick distinct deterministic voice for persona
  const getPersonaVoice = useCallback(
    (personaName, personaIndex) => {
      if (!availableVoices || availableVoices.length === 0) return null;
      const englishVoices = availableVoices.filter((v) => v.lang.startsWith("en"));
      const pool = englishVoices.length > 0 ? englishVoices : availableVoices;

      const lower = (personaName || "").toLowerCase();
      if (lower.includes("rahul") || lower.includes("alex") || lower.includes("david")) {
        const male = pool.find(
          (v) =>
            v.name.toLowerCase().includes("male") ||
            v.name.toLowerCase().includes("david") ||
            v.name.toLowerCase().includes("george") ||
            v.name.toLowerCase().includes("guy") ||
            v.name.toLowerCase().includes("daniel")
        );
        if (male) return male;
      }
      if (lower.includes("aditi") || lower.includes("sneha") || lower.includes("samantha") || lower.includes("zira")) {
        const female = pool.find(
          (v) =>
            v.name.toLowerCase().includes("female") ||
            v.name.toLowerCase().includes("samantha") ||
            v.name.toLowerCase().includes("zira") ||
            v.name.toLowerCase().includes("victoria") ||
            v.name.toLowerCase().includes("karen")
        );
        if (female) return female;
      }

      return pool[personaIndex % pool.length] || pool[0];
    },
    [availableVoices]
  );

  // Play text out loud using browser SpeechSynthesis
  const speakPersonaText = useCallback(
    (text, speakerName, personaIndex = 0) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      currentUtteranceRef.current = utterance;

      const chosenVoice = getPersonaVoice(speakerName, personaIndex);
      if (chosenVoice) {
        utterance.voice = chosenVoice;
      }

      // Persona vocal tuning
      utterance.rate = 1.0;
      if (speakerName === "Moderator") {
        utterance.pitch = 0.95;
      } else if (personaIndex === 0) {
        utterance.pitch = 1.1; // Aditi
      } else if (personaIndex === 1) {
        utterance.pitch = 0.88; // Rahul
      } else {
        utterance.pitch = 1.0; // Sneha
      }

      setActiveSpeaker(speakerName);
      setIsAiSpeaking(true);
      setLiveCaption(`[${speakerName}]: ${text}`);

      utterance.onend = () => {
        setActiveSpeaker(null);
        setIsAiSpeaking(false);
      };

      utterance.onerror = (event) => {
        console.warn("[TTS] Utterance error:", event);
        setActiveSpeaker(null);
        setIsAiSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [getPersonaVoice]
  );

  // Initialize GD Session
  useEffect(() => {
    if (!isSpeechSupported) return;

    if (!role) {
      toast.error("Select a target role first.");
      navigate(`/role-select?mode=${mode}${company ? `&company=${company}` : ""}`);
      return;
    }

    startGD({ role, mode, company })
      .then((data) => {
        setAttemptId(data.attemptId);
        setTopic(data.topic);
        setTopicContext(data.topicContext || "");
        setPersonas(data.personas || []);
        setTurns(data.turns || []);
        setPhase("lobby");
      })
      .catch((err) => {
        toast.error(err.message || "Failed to initialize Group Discussion");
        navigate(`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`);
      });
  }, [role, mode, company, navigate, isSpeechSupported]);

  // Join Call from Lobby (User gesture unlocks audio and speech synthesis)
  const handleJoinCall = () => {
    setPhase("in-call");
    toast.success("Connected to live discussion call");

    // Automatically speak opening remarks
    if (turns.length > 0) {
      const firstTurn = turns[1] || turns[0];
      const speakerIdx = personas.findIndex((p) => p.name === firstTurn.speaker);
      setTimeout(() => {
        speakPersonaText(firstTurn.text, firstTurn.speaker, Math.max(0, speakerIdx));
      }, 600);
    }
  };

  // Toggle user's microphone (On = Start continuous listening, Off = Finalize & Send)
  const handleToggleMic = () => {
    if (isAiSpeaking || isSubmittingTurn) {
      toast("Please wait until the active speaker finishes.", { icon: "⏳" });
      return;
    }

    if (isMicOn) {
      // User is muting -> Stop listening and submit what was spoken
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsMicOn(false);
      setActiveSpeaker(null);

      const userText = accumulatedTranscriptRef.current.trim();
      accumulatedTranscriptRef.current = "";

      if (!userText) {
        toast("No speech detected. Unmute to speak your point.", { icon: "🎙️" });
        return;
      }

      // Submit spoken turn
      submitUserSpokenTurn(userText);
    } else {
      // User is unmuting -> Start continuous speech recognition
      setMicPermissionError(null);
      accumulatedTranscriptRef.current = "";
      setLiveCaption("[You]: Listening...");

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsMicOn(true);
        setActiveSpeaker("user");
      };

      recognition.onresult = (event) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; ++i) {
          fullTranscript += event.results[i][0].transcript + " ";
        }
        const cleaned = fullTranscript.trim();
        accumulatedTranscriptRef.current = cleaned;
        setLiveCaption(`[You]: ${cleaned}`);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setMicPermissionError("Microphone access was denied. Please allow microphone permissions in your browser.");
          toast.error("Microphone permission denied.");
        } else if (event.error === "no-speech") {
          // Keep listening
        } else {
          setMicPermissionError(`Microphone error: ${event.error}`);
        }
        setIsMicOn(false);
        setActiveSpeaker(null);
      };

      recognition.onend = () => {
        // Only reset if mic is still on
        if (isMicOn) {
          setIsMicOn(false);
          setActiveSpeaker(null);
        }
      };

      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setIsMicOn(false);
        setActiveSpeaker(null);
      }
    }
  };

  // Submit candidate's turn to backend
  const submitUserSpokenTurn = async (userText) => {
    setIsSubmittingTurn(true);
    setLiveCaption(`[You]: ${userText}`);

    // Optimistically record turn
    const localUserTurn = {
      id: `turn-local-${Date.now()}`,
      speaker: "You",
      speakerType: "user",
      text: userText,
      timestamp: new Date(),
    };
    setTurns((prev) => [...prev, localUserTurn]);

    try {
      const data = await turnGD({
        attemptId,
        userText,
      });

      setTurns(data.turns || []);

      // Speak the AI persona's reply out loud automatically
      if (data.aiTurn) {
        const pIdx = personas.findIndex((p) => p.name === data.aiTurn.speaker || p.id === data.aiTurn.personaId);
        speakPersonaText(data.aiTurn.text, data.aiTurn.speaker, Math.max(0, pIdx));
      }
    } catch (err) {
      toast.error(err.message || "Failed to process turn. Please try speaking again.");
    } finally {
      setIsSubmittingTurn(false);
    }
  };

  // End discussion & score
  const handleEndDiscussion = async () => {
    const userTurnCount = turns.filter((t) => t.speakerType === "user").length;
    if (userTurnCount < 1) {
      toast.error("Please speak at least once before ending the discussion.");
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setPhase("evaluating");
    try {
      const data = await scoreGD({ attemptId });
      setResult(data);
      setPhase("feedback");
      toast.success("Group discussion evaluated successfully!");
    } catch (err) {
      toast.error(err.message || "Evaluation failed. Please try again.");
      setPhase("in-call");
    }
  };

  // 1. Fullscreen Unsupported Browser Blocking Screen
  if (phase === "unsupported") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink p-6 text-center text-text">
        <div className="max-w-md rounded-2xl border border-rose/30 bg-surface/80 p-8 shadow-2xl backdrop-blur-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose/10 text-3xl text-rose">
            🎙️
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-text">Live Voice Support Required</h1>
          <p className="mt-3 text-xs leading-relaxed text-text-muted">
            The Group Discussion round is conducted entirely over a live voice call (Google Meet style) with real-time AI speech.
          </p>
          <div className="mt-4 rounded-lg border border-edge bg-ink/70 p-3 text-left font-mono text-[11px] text-text-faint space-y-1">
            <div className="text-text font-semibold">Recommended Browsers:</div>
            <div>• Google Chrome (Desktop / Android)</div>
            <div>• Microsoft Edge (Desktop)</div>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              to={`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`}
              className="rounded-lg bg-surface-2 px-4 py-2 text-xs font-medium text-text hover:bg-surface"
            >
              Back to Rounds
            </Link>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent/90"
            >
              Retry Check
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-edge border-t-accent" />
          Setting up live AI discussion room…
        </div>
      </div>
    );
  }

  // 3. Pre-Call Lobby Screen (Initiates user gesture for browser audio & mic permission)
  if (phase === "lobby") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink p-6 text-text">
        <div className="w-full max-w-xl rounded-2xl border border-edge/60 bg-surface/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-edge/60 pb-4">
            <div className="flex items-center gap-3">
              <Logo />
              <span className="tag-mono text-accent">GD Call Lobby</span>
            </div>
            <span className="rounded-full bg-signal/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-signal border border-signal/20">
              Voice Only
            </span>
          </div>

          <div className="mt-6">
            <h1 className="font-display text-xl font-bold text-text">{topic}</h1>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">{topicContext}</p>
          </div>

          {/* Persona avatars in lobby */}
          <div className="mt-6 rounded-xl border border-edge bg-ink/60 p-4">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-faint">
              Discussion Participants ({personas.length + 1})
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {personas.map((p, idx) => (
                <div key={idx} className="flex flex-col items-center rounded-lg bg-surface/60 p-3 text-center">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white shadow"
                    style={{ backgroundColor: p.color || "#06B6D4" }}
                  >
                    {p.avatar || p.name[0]}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-text">{p.name}</div>
                  <div className="mt-0.5 text-[10px] text-text-faint truncate max-w-full">{p.role}</div>
                </div>
              ))}
              <div className="flex flex-col items-center rounded-lg border border-accent/40 bg-accent/10 p-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-sm font-bold text-white shadow">
                  You
                </div>
                <div className="mt-2 text-xs font-semibold text-text">You (Candidate)</div>
                <div className="mt-0.5 text-[10px] text-accent font-mono">Live Voice</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-text-faint">
              <span className="h-2 w-2 rounded-full bg-signal animate-pulse" />
              <span>Click Join to connect your microphone</span>
            </div>
            <button
              onClick={handleJoinCall}
              className="flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:bg-accent/90"
            >
              <span>📞</span>
              Join Discussion Call
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Evaluating State
  if (phase === "evaluating") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-edge border-t-accent" />
          <div className="text-base font-medium text-text">Evaluating discussion performance…</div>
          <div className="text-xs text-text-muted max-w-sm">
            Analyzing spoken arguments, collaboration dynamics, communication clarity, and domain relevance.
          </div>
        </div>
      </div>
    );
  }

  // 5. Feedback Report Screen
  if (phase === "feedback" && result) {
    return <GDFeedback result={result} mode={mode} company={company} navigate={navigate} topic={topic} />;
  }

  // 6. Live In-Call View (Google Meet Call Grid Layout)
  const candidateTileActive = activeSpeaker === "user" || isMicOn;
  const userTurnCount = turns.filter((t) => t.speakerType === "user").length;

  return (
    <div className="relative flex h-screen flex-col bg-[#0b0f17] text-text select-none overflow-hidden font-sans">
      {/* Top Header Bar */}
      <header className="shrink-0 border-b border-edge/40 bg-ink/90 px-6 py-2.5 backdrop-blur z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`}>
              <Logo />
            </Link>
            <div className="hidden h-4 w-px bg-edge sm:block" />
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span className="font-mono text-accent font-semibold">GD Call · Live</span>
              <span className="text-text-faint truncate max-w-md font-medium">{topic}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Call Timer */}
            <div className="flex items-center gap-2 rounded-lg border border-edge/60 bg-surface/80 px-3 py-1 font-mono text-xs text-text">
              <span className="h-2 w-2 rounded-full bg-signal animate-pulse" />
              <span>{formatCallTime(callDuration)}</span>
            </div>

            {/* Turn Count Badge */}
            <div className="rounded-lg border border-edge/60 bg-surface/80 px-3 py-1 font-mono text-xs text-text-muted">
              Your Turns: <span className="font-bold text-accent">{userTurnCount}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mic Permission Banner if Denied */}
      {micPermissionError && (
        <div className="bg-rose/15 border-b border-rose/30 px-4 py-2 text-center text-xs text-rose flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>{micPermissionError}</span>
          <button
            onClick={handleToggleMic}
            className="underline font-semibold hover:text-white ml-2"
          >
            Retry Mic Access
          </button>
        </div>
      )}

      {/* Main Call Video Grid (2x2 Meet Layout) */}
      <div className="relative flex-1 p-4 sm:p-6 overflow-hidden flex items-center justify-center">
        <div className="grid h-full w-full max-w-6xl grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* AI Persona Tiles */}
          {personas.map((persona, index) => {
            const isSpeaking = activeSpeaker === persona.name;
            return (
              <div
                key={persona.id || index}
                className={`relative flex flex-col items-center justify-center rounded-2xl border transition-all duration-300 overflow-hidden bg-gradient-to-b from-surface/60 to-surface-2/80 shadow-xl ${
                  isSpeaking
                    ? "border-accent ring-4 ring-accent/40 shadow-[0_0_30px_rgba(99,102,241,0.35)]"
                    : "border-edge/50 hover:border-edge"
                }`}
              >
                {/* Speaking Live Pulse Ring */}
                {isSpeaking && (
                  <div className="absolute inset-0 pointer-events-none rounded-2xl border-2 border-accent animate-pulse" />
                )}

                {/* Avatar & Speaking Waves */}
                <div className="relative flex flex-col items-center justify-center">
                  <div
                    className={`relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full text-2xl sm:text-3xl font-bold text-white shadow-2xl transition-transform duration-300 ${
                      isSpeaking ? "scale-110" : ""
                    }`}
                    style={{ backgroundColor: persona.color || "#06B6D4" }}
                  >
                    {persona.avatar || persona.name[0]}

                    {/* Soundwave animation when speaking */}
                    {isSpeaking && (
                      <span className="absolute -inset-2 rounded-full border-2 border-accent animate-ping opacity-50" />
                    )}
                  </div>

                  {/* Audio Equalizer Bars */}
                  {isSpeaking && (
                    <div className="mt-4 flex items-end gap-1 h-5">
                      <span className="w-1 bg-accent rounded-full animate-[bounce_0.6s_infinite_100ms] h-3" />
                      <span className="w-1 bg-accent rounded-full animate-[bounce_0.6s_infinite_250ms] h-5" />
                      <span className="w-1 bg-accent rounded-full animate-[bounce_0.6s_infinite_400ms] h-4" />
                      <span className="w-1 bg-accent rounded-full animate-[bounce_0.6s_infinite_150ms] h-2" />
                    </div>
                  )}
                </div>

                {/* Persona Info & Status Bar */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-2 rounded-lg bg-ink/80 px-3 py-1.5 backdrop-blur">
                    <span className="font-semibold text-xs text-text">{persona.name}</span>
                    <span className="text-[10px] text-text-faint truncate max-w-[140px]">· {persona.role}</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-mono font-medium backdrop-blur ${
                      isSpeaking ? "bg-accent text-white" : "bg-ink/80 text-text-faint"
                    }`}
                  >
                    {isSpeaking ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                        <span>Speaking</span>
                      </>
                    ) : (
                      <span>Muted</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Candidate (You) Tile */}
          <div
            className={`relative flex flex-col items-center justify-center rounded-2xl border transition-all duration-300 overflow-hidden bg-gradient-to-b from-surface/60 to-surface-2/80 shadow-xl ${
              candidateTileActive
                ? "border-signal ring-4 ring-signal/40 shadow-[0_0_30px_rgba(16,185,129,0.35)]"
                : "border-edge/50 hover:border-edge"
            }`}
          >
            {candidateTileActive && (
              <div className="absolute inset-0 pointer-events-none rounded-2xl border-2 border-signal animate-pulse" />
            )}

            <div className="relative flex flex-col items-center justify-center">
              <div
                className={`relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-2xl sm:text-3xl font-bold text-white shadow-2xl transition-transform duration-300 ${
                  candidateTileActive ? "scale-110" : ""
                }`}
              >
                You
                {candidateTileActive && (
                  <span className="absolute -inset-2 rounded-full border-2 border-signal animate-ping opacity-50" />
                )}
              </div>

              {/* Audio Equalizer Bars for Candidate */}
              {candidateTileActive && (
                <div className="mt-4 flex items-end gap-1 h-5">
                  <span className="w-1 bg-signal rounded-full animate-[bounce_0.6s_infinite_100ms] h-4" />
                  <span className="w-1 bg-signal rounded-full animate-[bounce_0.6s_infinite_200ms] h-6" />
                  <span className="w-1 bg-signal rounded-full animate-[bounce_0.6s_infinite_300ms] h-3" />
                  <span className="w-1 bg-signal rounded-full animate-[bounce_0.6s_infinite_150ms] h-5" />
                </div>
              )}
            </div>

            {/* Candidate Info & Status Bar */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 rounded-lg bg-ink/80 px-3 py-1.5 backdrop-blur">
                <span className="font-semibold text-xs text-text">You</span>
                <span className="text-[10px] text-text-faint">· Candidate</span>
              </div>

              <div
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-mono font-medium backdrop-blur ${
                  candidateTileActive ? "bg-signal text-ink font-bold" : "bg-ink/80 text-text-faint"
                }`}
              >
                {candidateTileActive ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-ink animate-pulse" />
                    <span>Mic Live</span>
                  </>
                ) : (
                  <span>Mic Muted</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Subtitle / Caption Line (Overlay at bottom of grid) */}
        {liveCaption && (
          <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 max-w-2xl w-[90%] rounded-xl bg-ink/90 border border-edge/60 px-4 py-2.5 shadow-2xl backdrop-blur-md text-center text-xs text-text leading-relaxed">
            <span className="font-mono text-text-muted">{liveCaption}</span>
          </div>
        )}
      </div>

      {/* Bottom Control Bar (Google Meet Style) */}
      <div className="shrink-0 border-t border-edge/40 bg-ink/95 px-6 py-4 backdrop-blur z-20">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          {/* Left Info: Current Topic */}
          <div className="hidden md:flex flex-col">
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-faint">Discussion Topic</span>
            <span className="text-xs font-medium text-text truncate max-w-xs">{topic}</span>
          </div>

          {/* Center: Live Voice Controls */}
          <div className="flex items-center gap-4 mx-auto md:mx-0">
            {/* Primary Mic Toggle Button */}
            <button
              onClick={handleToggleMic}
              disabled={isAiSpeaking || isSubmittingTurn}
              className={`group relative flex items-center gap-3 rounded-full px-6 py-3.5 text-sm font-semibold transition-all shadow-xl ${
                isAiSpeaking || isSubmittingTurn
                  ? "bg-surface-2 text-text-faint border border-edge/60 cursor-not-allowed opacity-60"
                  : isMicOn
                  ? "bg-rose text-white shadow-rose/30 animate-pulse hover:bg-rose/90 scale-105"
                  : "bg-surface border border-edge/80 text-text hover:border-accent hover:text-accent hover:bg-surface-2"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-base ${
                  isMicOn ? "bg-white/20" : "bg-ink/60"
                }`}
              >
                {isAiSpeaking ? "🔇" : isMicOn ? "🔴" : "🎙️"}
              </div>

              <span>
                {isAiSpeaking
                  ? `${activeSpeaker || "AI"} is speaking…`
                  : isSubmittingTurn
                  ? "Sending turn…"
                  : isMicOn
                  ? "Mute to Send Point"
                  : "Unmute to Speak"}
              </span>

              {/* Status Hint Tooltip */}
              <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 hidden whitespace-nowrap rounded-md bg-ink px-2.5 py-1 text-[10px] font-mono text-text-muted shadow-lg border border-edge group-hover:block">
                {isAiSpeaking
                  ? "Please wait for current speaker to finish"
                  : isMicOn
                  ? "Click when done to submit turn"
                  : "Click to start speaking"}
              </div>
            </button>
          </div>

          {/* Right Action Controls: Captions Toggle & End Discussion */}
          <div className="flex items-center gap-3">
            {/* Captions / Log Drawer Toggle */}
            <button
              onClick={() => setShowTranscriptDrawer((v) => !v)}
              title="Toggle discussion transcript"
              className={`rounded-full p-3 text-sm font-medium border transition-colors ${
                showTranscriptDrawer
                  ? "bg-accent/20 border-accent text-accent"
                  : "bg-surface border-edge text-text-muted hover:text-text hover:bg-surface-2"
              }`}
            >
              CC
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEndDiscussion}
              className="flex items-center gap-2 rounded-full bg-rose/90 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-rose/20 transition-all hover:bg-rose"
            >
              <span>📞</span>
              <span>End Discussion</span>
            </button>
          </div>
        </div>
      </div>

      {/* Side Transcript Drawer (Optional, Closed by default) */}
      {showTranscriptDrawer && (
        <div className="fixed right-0 top-14 bottom-20 w-80 sm:w-96 border-l border-edge bg-ink/95 shadow-2xl backdrop-blur-xl z-30 flex flex-col">
          <div className="flex items-center justify-between border-b border-edge/60 px-4 py-3">
            <span className="font-mono text-xs font-semibold text-text uppercase tracking-wider">
              Discussion Transcript
            </span>
            <button
              onClick={() => setShowTranscriptDrawer(false)}
              className="text-text-faint hover:text-text text-sm p-1"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs scrollbar-thin">
            {turns.map((t, idx) => (
              <div
                key={idx}
                className={`rounded-lg p-3 leading-relaxed ${
                  t.speakerType === "user"
                    ? "border border-signal/30 bg-signal/5 text-text"
                    : t.speakerType === "system"
                    ? "bg-surface-2 text-text-faint italic"
                    : "border border-edge/60 bg-surface text-text-muted"
                }`}
              >
                <div className="font-mono font-semibold text-text mb-1">
                  {t.speaker} {t.speakerType === "user" ? "(You)" : ""}:
                </div>
                <div>{t.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GDFeedback({ result, mode, company, navigate, topic }) {
  const goRounds = () => navigate(`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`);
  const rubric = result.rubricScores || {};

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-edge/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Logo />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <span className="tag-mono text-accent">Group Discussion — Assessment Complete</span>
        <div className="mt-3 flex flex-wrap items-baseline gap-4">
          <h1 className="font-display text-4xl font-semibold text-text">{result.score}%</h1>
          <p className="max-w-xl text-sm text-text-muted">{result.feedback?.summary}</p>
        </div>

        {/* Topic reminder */}
        <div className="mt-8 rounded-lg border border-edge bg-surface/50 p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-faint">Topic Discussed</div>
          <div className="mt-1 text-sm font-medium text-text">{topic || result.topic}</div>
        </div>

        {/* 5-Criteria Rubric Breakdown */}
        <div className="mt-6 panel p-6">
          <span className="tag-mono">Core GD Competencies</span>
          <div className="mt-5 space-y-4">
            {Object.entries(RUBRIC_LABELS).map(([key, label]) => {
              const val = rubric[key] || 70;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{label}</span>
                    <span className="font-mono text-text">{val}/100</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        val >= 80 ? "bg-signal" : val >= 65 ? "bg-accent" : "bg-amber"
                      }`}
                      style={{ width: `${Math.max(5, val)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths / Improvements */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="panel p-6">
            <h3 className="text-xs font-medium uppercase tracking-wide text-signal">Key Strengths</h3>
            <ul className="mt-3 space-y-2">
              {result.feedback?.strengths?.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-6">
            <h3 className="text-xs font-medium uppercase tracking-wide text-amber">Areas for Growth</h3>
            <ul className="mt-3 space-y-2">
              {result.feedback?.improvements?.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Transcript Review */}
        <div className="mt-6 panel p-6">
          <span className="tag-mono">Discussion Audio Log</span>
          <div className="mt-4 space-y-3">
            {result.turns?.map((turn, i) => (
              <div
                key={i}
                className={`rounded-md p-3 text-xs leading-relaxed ${
                  turn.speakerType === "user"
                    ? "border border-accent/30 bg-accent/[0.06] text-text"
                    : turn.speakerType === "system"
                    ? "bg-surface-2 text-text-faint"
                    : "border border-edge/60 bg-surface text-text-muted"
                }`}
              >
                <div className="mb-1 font-mono font-medium text-text">
                  {turn.speaker} {turn.speakerType === "user" ? "(Candidate)" : ""}:
                </div>
                {turn.text}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <button onClick={goRounds} className="btn-primary">
            Back to rounds
          </button>
        </div>
      </main>
    </div>
  );
}
