import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function History() {
  const [history, setHistory] = useState([]);
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    if (!userId) {
      alert("Please login first");
      navigate('/');
    } else {
      fetchHistory();
    }
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`https://ai-med-diagnosis.onrender.com/api/analyze/history/${userId}`);
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header with Back Button */}
      <div className="max-w-4xl mx-auto flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">My Medical History</h2>
        <button 
          onClick={() => navigate('/dashboard')}
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          &larr; Back to Dashboard
        </button>
      </div>

      {/* Grid of History Cards */}
      <div className="max-w-4xl mx-auto grid gap-6">
        {history.length === 0 ? (
          <p className="text-gray-500 text-center text-lg">No history found. Try a diagnosis first!</p>
        ) : (
          history.map((item) => (
            <div key={item._id} className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>{new Date(item.date).toLocaleDateString()}</span>
                <span className="font-semibold text-blue-600">{item.confidenceScore} Confidence</span>
              </div>
              
              <p className="text-gray-800 font-bold text-lg">Symptoms: <span className="font-normal">{item.symptoms}</span></p>
              <p className="mt-2 text-red-600 font-bold">Diagnosis: {item.predictedDisease}</p>
              
              <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-gray-700">
                <strong>💊 Medicines:</strong> {item.medicines}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default History;
