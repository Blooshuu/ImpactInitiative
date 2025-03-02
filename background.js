// background.js - Updated with delete functionality
// Google Gemini API Key
const GEMINI_API_KEY = "[insert gemini API key]";

// Function to capture a screenshot of the current tab
async function captureScreenshot() {
    try {
        // Get the active tab
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            console.error("No active tab found.");
            return;
        }

        // Capture the screenshot
        let imageUri = await chrome.tabs.captureVisibleTab();
        if (!imageUri) {
            console.error("Screenshot capture failed.");
            return;
        }

        // Process the image using Gemini AI
        let extractedInfo = await processImageWithGemini(imageUri, tab.url);

        // Return the extracted info without saving
        return {
            extractedInfo: extractedInfo,
            tabUrl: tab.url
        };

    } catch (error) {
        console.error("Error capturing screenshot:", error);
        return null;
    }
}

// Function to process the image with Gemini AI
async function processImageWithGemini(imageUri, webpageUrl) {
    try {
        // Convert base64 data URI to base64 string
        const base64Data = imageUri.replace(/^data:image\/\w+;base64,/, '');
        
        // Prepare the request to Gemini API with correct structure for gemini-1.5-flash
        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: "Extract the webpage URL. Take page information, summarize the problem, and respond with specific examples of how to get involved. Format the response as: 'Summary: [concise summary] [newline\enter] Action: [taking action examples/how to get involved]"
                        },
                        {
                            inline_data: {
                                mime_type: "image/png",
                                data: base64Data
                            }
                        }
                    ]
                }
            ]
        };

        // Send request to Gemini API using the gemini-1.5-flash model
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            body: JSON.stringify(requestBody),
            headers: {
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        
        // Check if the response contains the expected data
        if (!data || !data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
            console.error("Gemini API did not return valid data:", data);
            
            // Check if there's an error message
            if (data.error) {
                return {
                    webpageUrl: webpageUrl,
                    extractedText: `API Error: ${data.error.message || "Unknown error"}`
                };
            }
            
            return {
                webpageUrl: webpageUrl,
                extractedText: "Failed to extract information. Check console for details."
            };
        }

        return {
            webpageUrl: webpageUrl,
            extractedText: data.candidates[0].content.parts[0].text
        };

    } catch (error) {
        console.error("Error processing image with Gemini AI:", error);
        return {
            webpageUrl: webpageUrl,
            extractedText: `Error: ${error.message || "Unknown error processing image"}`
        };
    }
}

// Function to save extracted data to storage
async function saveToStorage(url, extractedInfo) {
    try {
        // Read existing storage data
        let storedData = await chrome.storage.local.get("savedNotes");
        let notes = storedData.savedNotes || [];

        // Append new data
        notes.push({
            id: Date.now().toString(), // Add a unique ID for each note
            url: url,
            title: extractedInfo.extractedText,
            timestamp: new Date().toISOString()
        });

        // Save back to storage
        await chrome.storage.local.set({ savedNotes: notes });
        return true;

    } catch (error) {
        console.error("Error saving to storage:", error);
        return false;
    }
}

// Function to delete a note by ID
async function deleteNote(noteId) {
    try {
        // Read existing storage data
        let storedData = await chrome.storage.local.get("savedNotes");
        let notes = storedData.savedNotes || [];

        // Filter out the note with the given ID
        const updatedNotes = notes.filter(note => note.id !== noteId);

        // Save back to storage
        await chrome.storage.local.set({ savedNotes: updatedNotes });
        return true;

    } catch (error) {
        console.error("Error deleting note:", error);
        return false;
    }
}

// Export functions for use in popup.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "analyze") {
        captureScreenshot().then(result => {
            sendResponse({ success: true, data: result });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true; // Required to use sendResponse asynchronously
    }
    else if (message.action === "saveNote") {
        saveToStorage(message.url, message.extractedInfo).then(success => {
            sendResponse({ success: success });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
    else if (message.action === "deleteNote") {
        deleteNote(message.noteId).then(success => {
            sendResponse({ success: success });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
});
