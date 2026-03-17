import http from "http";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// Helper to clean AI response (strips markdown backticks)
function cleanAIResponse(text) {
    return text.replace(/```json|```/g, "").trim();
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };

    if (req.method === 'OPTIONS') {
        res.writeHead(204, headers);
        res.end();
        return;
    }

    if (url.pathname === "/quiz") {
        const subject = url.searchParams.get("subject") || "General";
        const module = url.searchParams.get("module") || "Basics";
        
        try {
            // UPDATED: Using gemini-2.5-flash which is the current stable workhorse
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            
            const prompt = `Generate exactly 15 MCQs and for subject ${subject} and module ${module}. 
            Return ONLY a valid JSON array: [{"question":"text", "options":["a","b","c","d"], "answer":0, "explanation":"text"}]`;
            
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            const cleanJson = cleanAIResponse(responseText);
            
            res.writeHead(200, headers);
            res.end(cleanJson);
        } catch (err) {
            console.error("AI Error Log:", err.message);
            res.writeHead(500, headers);
            res.end(JSON.stringify({ error: "AI Error", details: err.message }));
        }
    }

    if (url.pathname === "/feedback" && req.method === "POST") {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { score, total, subject } = JSON.parse(body);
                const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                const prompt = `Student scored ${score}/${total} in ${subject}. Give 1 sentence of encouraging feedback.`;
                const result = await model.generateContent(prompt);
                res.writeHead(200, headers);
                res.end(JSON.stringify({ feedback: result.response.text().trim() }));
            } catch (err) {
                res.writeHead(500, headers);
                res.end(JSON.stringify({ feedback: "Great work!" }));
            }
        });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT,"0.0.0.0", () => {
    console.log(`🚀 KARLO_PADH_AI Server chal raha hai on ${PORT}`);
});