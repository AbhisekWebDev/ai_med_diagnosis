const router = require('express').Router();
const Diagnosis = require('../models/Diagnosis');
const Groq = require('groq-sdk');

// Initialize the raw Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

router.post('/', async (req, res) => {
  const { userId, symptoms } = req.body;

  console.log("--- NEW REQUEST ---");
  console.log("User ID:", userId);
  console.log("Symptoms:", symptoms);

  try {
    // 1. Validation: Ensure we have the data we need
    if (!userId || !symptoms) {
      throw new Error("Missing userId or symptoms");
    }

    // 2. Direct Request to Groq (No LangChain complexity)
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a medical AI. Analyze the symptoms. Output ONLY valid JSON with these keys: 'disease', 'probability', 'advice', 'medicines'. For 'medicines', list generic names of common over-the-counter drugs applicable for the condition in India. Return a single string of generic drug names separated by commas (e.g., 'Paracetamol, Cetirizine'). Do not say 'Here is the JSON'. Just output the JSON."
        },
        {
          role: "user",
          content: `Symptoms: ${symptoms}`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0, 
      response_format: { type: "json_object" } // <--- This forces perfect JSON!
    });

    // 3. Get the answer
    const aiContent = chatCompletion.choices[0].message.content;
    console.log("AI Answer:", aiContent);

    const result = JSON.parse(aiContent);

    // 4. Save to Database
    // We wrap this in a try/catch so even if saving fails, the user still sees the result
    try {
      const newDiagnosis = new Diagnosis({
        userId,
        symptoms,
        predictedDisease: result.disease,
        confidenceScore: result.probability,
        advice: result.advice,
        medicines: result.medicines
      });
      await newDiagnosis.save();
      console.log("Saved to DB successfully");
    } catch (dbError) {
      console.error("Database Save Failed (likely invalid User ID):", dbError.message);
    }

    // 5. Send back to Frontend
    res.json(result);

  } catch (error) {
    console.error("SERVER ERROR:", error.message);
    // Send the actual error message to the frontend so you can see it in the Alert
    res.status(500).json({ error: error.message });
  }
});

// Get History for a specific user
router.get('/history/:userId', async (req, res) => {
  try {
    const history = await Diagnosis.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

module.exports = router;