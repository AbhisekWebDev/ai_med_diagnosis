import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from "jspdf";

function Dashboard() {
  const [symptoms, setSymptoms] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Guest';

  // --- 1. SETUP MICROPHONE (RUNS ONCE) ---
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize SpeechRecognition ONLY ONCE when component mounts
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true; // <--- KEEPS MIC OPEN UNTIL YOU STOP IT
      recognition.interimResults = true; // Shows text while you are speaking

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        // Get the latest result
        const current = event.resultIndex;
        const transcript = event.results[current][0].transcript;
        
        // Update text box (append if it's a new sentence)
        setSymptoms(prev => {
            // Simple logic to avoid duplicating text if it sends partial updates
            if (event.results[current].isFinal) {
                return prev + " " + transcript;
            }
            return prev; 
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error("Mic Error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // --- 2. BUTTON HANDLER ---
  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Voice input not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // --- 3. ANALYZE FUNCTION ---
  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      const res = await axios.post('https://ai-med-diagnosis.onrender.com/api/analyze', {
        userId, 
        symptoms 
      });
      setResult(res.data);
    } catch (err) {
      alert(err.response?.data?.error || "Error analyzing symptoms");
    }
    setLoading(false);
  };

  // --- 4. SPEAK RESULT FUNCTION ---
  const speakResult = () => {
    if (!result) return;
    const textToSpeak = `Based on your symptoms, there is a ${result.probability} chance that you have ${result.disease}. 
    I suggest taking ${Array.isArray(result.medicines) ? result.medicines.join(', ') : result.medicines}. 
    Please follow this advice: ${result.advice}`;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    window.speechSynthesis.speak(utterance);
  };

  // --- 5. PDF DOWNLOAD FUNCTION ---
  const handleDownloadPDF = () => {
    if (!result) return;
    const doc = new jsPDF();
    const userEmail = localStorage.getItem('email') || 'N/A';

    // -- HEADER --
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(41, 128, 185); // Blue color
    doc.text("Medical Diagnosis Report", 105, 20, null, null, "center");
    
    // -- PATIENT DETAILS --
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0); // Black
    doc.setFont("helvetica", "normal");
    doc.text(`Patient Name: ${username}`, 20, 40);
    doc.text(`Patient Email: ${userEmail}`, 20, 50);
    doc.text(`Date: ${new Date().toLocaleString()}`, 20, 60);
    doc.text(`Report ID: #${Math.floor(Math.random() * 100000)}`, 140, 40);

    // -- LINE SEPARATOR --
    doc.setLineWidth(0.5);
    doc.line(20, 65, 190, 65);

    // -- SYMPTOMS --
    doc.setFont("helvetica", "bold");
    doc.text("Reported Symptoms:", 20, 75);
    doc.setFont("helvetica", "normal");
    const splitSymptoms = doc.splitTextToSize(symptoms, 170);
    doc.text(splitSymptoms, 20, 85);

    // -- DIAGNOSIS RESULT --
    let yPos = 85 + (splitSymptoms.length * 7); 
    
    doc.setFillColor(240, 248, 255); // Light blue box
    doc.rect(15, yPos, 180, 40, "F");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("Predicted Disease:", 20, yPos + 10);
    
    doc.setFontSize(16);
    doc.setTextColor(220, 20, 60); // Red
    doc.text(result.disease, 20, yPos + 20);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Confidence: ${result.probability}`, 120, yPos + 20);

    // -- MEDICINES --
    yPos += 50;
    doc.setFont("helvetica", "bold");
    doc.text("Suggested Medicines:", 20, yPos);
    doc.setFont("helvetica", "normal");
    const meds = Array.isArray(result.medicines) ? result.medicines.join(', ') : result.medicines;
    doc.text(meds || "None", 20, yPos + 10);

    // -- ADVICE --
    yPos += 25;
    doc.setFont("helvetica", "bold");
    doc.text("Medical Advice:", 20, yPos);
    doc.setFont("helvetica", "italic");
    const splitAdvice = doc.splitTextToSize(result.advice, 170);
    doc.text(splitAdvice, 20, yPos + 10);

    // -- FOOTER --
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text("DISCLAIMER: AI-generated report. Consult a doctor.", 105, 280, null, null, "center");

    doc.save(`Medical_Report_${username}.pdf`);
  };

  return (
    <div className="p-10 max-w-2xl mx-auto min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Hello, {username} 👋</h1>
          <p className="text-gray-500 text-sm">Welcome to your AI Health Assistant</p>
        </div>
        <button 
          onClick={() => navigate('/history')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition flex items-center gap-2"
        >
          📜 History
        </button>
      </div>

      {/* INPUT AREA */}
      <div className="relative mb-6">
        <label className="block text-gray-700 font-bold mb-2">Describe Symptoms:</label>
        <textarea
          className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          rows="4"
          placeholder="Type here or click the Mic to speak..."
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />

        {/* MICROPHONE BUTTON */}
        <button
          onClick={toggleListening}
          className={`absolute bottom-4 right-4 p-3 rounded-full shadow-lg transition-all duration-300 ${
            isListening ? "bg-red-500 animate-pulse scale-110" : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
          title={isListening ? "Stop Listening" : "Start Listening"}
        >
          {isListening ? (
             // Stop Icon
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
             </svg>
          ) : (
            // Mic Icon
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
      </div>

      {/* ANALYZE BUTTON */}
      <button 
        onClick={handleAnalyze}
        disabled={loading}
        className={`w-full py-3 rounded-lg font-bold text-lg transition shadow-md ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {loading ? "Analyzing with AI..." : "Diagnose Me"}
      </button>

      {/* RESULTS SECTION */}
      {result && (
        <div className="mt-8 p-6 bg-white border border-green-200 rounded-lg shadow-lg relative">
          
          {/* SPEAKER BUTTON */}
          <button 
            onClick={speakResult}
            className="absolute top-4 right-4 bg-yellow-500 text-white p-2 rounded-full shadow hover:bg-yellow-600 transition"
            title="Read Results Aloud"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
             </svg>
          </button>
          
          <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Diagnosis Results</h3>

          <div className="grid gap-4">
            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <p className="text-sm text-gray-500 uppercase font-bold">Potential Condition</p>
                <p className="text-2xl font-bold text-red-600">{result.disease}</p>
            </div>
            
            <div className="flex items-center gap-2">
                 <span className="font-semibold text-gray-700">Confidence Score:</span> 
                 <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">{result.probability}</span>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="font-semibold text-blue-800 mb-1">💊 Suggested Medicines (Generic):</p>
              <p className="text-gray-700">{Array.isArray(result.medicines) ? result.medicines.join(', ') : result.medicines}</p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
              <p className="font-semibold text-yellow-800 mb-1">💡 Medical Advice:</p>
              <p className="text-gray-700">{result.advice}</p>
            </div>
          </div>

          {/* DOWNLOAD PDF BUTTON */}
          <button 
            onClick={handleDownloadPDF}
            className="mt-6 w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-bold flex justify-center items-center gap-2 transition shadow-md"
          >
            {/* PDF Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Official Report
          </button>
          
          <p className="mt-6 text-xs text-gray-400 italic text-center">
            Disclaimer: This is AI-generated advice. Please consult a doctor before taking any medication.
          </p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
