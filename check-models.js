const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envFile.match(/GEMINI_API_KEY=(.*)/);
process.env.GEMINI_API_KEY = keyMatch ? keyMatch[1].trim() : '';


async function checkModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.log("No key found.");
        return;
    }
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        if (data.error) {
            console.log("API Error:", data.error.message);
        } else if (data.models) {
            console.log("Available models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log("- " + m.name.replace('models/', ''));
                }
            });
        }
    } catch (e) {
        console.error(e);
    }
}
checkModels();
