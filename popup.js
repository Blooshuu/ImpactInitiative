// popup.js - Updated with delete note functionality
// Global variables to store the latest analysis results
let currentAnalysis = null;

// Analyze button functionality
document.addEventListener("DOMContentLoaded", function() {
    const analyzeBtn = document.getElementById("analyzeBtn");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const latestAnalysis = document.getElementById("latestAnalysis");
    const saveOptions = document.getElementById("saveOptions");
    const saveBtn = document.getElementById("saveBtn");
    const discardBtn = document.getElementById("discardBtn");
    const notification = document.getElementById("notification");
    
    // Load saved notes
    loadSavedNotes();
    
    // Add click event listener to the Analyze button
    analyzeBtn.addEventListener("click", async function() {
        // Show loading indicator
        loadingIndicator.style.display = "block";
        latestAnalysis.style.display = "none";
        saveOptions.style.display = "none";
        hideNotification();
        
        try {
            // Send message to background script to start the analysis
            chrome.runtime.sendMessage({ action: "analyze" }, function(response) {
                // Hide loading indicator
                loadingIndicator.style.display = "none";
                
                if (response && response.success && response.data) {
                    // Store the current analysis for later use
                    currentAnalysis = response.data;
                    
                    // Display the latest analysis
                    latestAnalysis.style.display = "block";
                    latestAnalysis.innerHTML = `
                        <strong>Analysis Result:</strong>
                        <p>${response.data.extractedInfo.extractedText}</p>
                    `;
                    
                    // Show save options
                    saveOptions.style.display = "block";
                } else {
                    latestAnalysis.style.display = "block";
                    latestAnalysis.innerHTML = `
                        <strong>Error:</strong>
                        <p>Failed to analyze the current page. Please try again.</p>
                    `;
                }
            });
        } catch (error) {
            loadingIndicator.style.display = "none";
            latestAnalysis.style.display = "block";
            latestAnalysis.innerHTML = `
                <strong>Error:</strong>
                <p>${error.message || "An unknown error occurred"}</p>
            `;
        }
    });
    
    // Save button click handler
    saveBtn.addEventListener("click", function() {
        if (currentAnalysis) {
            chrome.runtime.sendMessage({ 
                action: "saveNote", 
                url: currentAnalysis.tabUrl,
                extractedInfo: currentAnalysis.extractedInfo
            }, function(response) {
                if (response && response.success) {
                    // Show success notification
                    showNotification("Note saved successfully!", "success");
                    
                    // Hide save options
                    saveOptions.style.display = "none";
                    
                    // Clear displayed analysis
                    latestAnalysis.style.display = "none";
                    
                    // Reload the saved notes to include the new one
                    loadSavedNotes();
                } else {
                    // Show error notification
                    showNotification("Failed to save note. Please try again.", "error");
                }
            });
        }
    });
    
    // Discard button click handler
    discardBtn.addEventListener("click", function() {
        // Clear current analysis
        currentAnalysis = null;
        
        // Hide analysis and save options
        latestAnalysis.style.display = "none";
        saveOptions.style.display = "none";
    });
});

// Function to show notification
function showNotification(message, type) {
    const notification = document.getElementById("notification");
    notification.textContent = message;
    notification.className = "notificationBar " + type;
    notification.style.display = "block";
    
    // Auto-hide after 3 seconds
    setTimeout(hideNotification, 3000);
}

// Function to hide notification
function hideNotification() {
    const notification = document.getElementById("notification");
    notification.style.display = "none";
}

// Function to delete a note
function deleteNote(noteId) {
    chrome.runtime.sendMessage({ 
        action: "deleteNote", 
        noteId: noteId
    }, function(response) {
        if (response && response.success) {
            // Show success notification
            showNotification("Note deleted successfully!", "success");
            
            // Reload the saved notes
            loadSavedNotes();
        } else {
            // Show error notification
            showNotification("Failed to delete note. Please try again.", "error");
        }
    });
}

// Function to load and display saved notes
async function loadSavedNotes() {
    let notesContainer = document.getElementById("notesContainer");
    
    // Clear existing content
    notesContainer.innerHTML = "";

    // Get saved notes from storage
    let storedData = await chrome.storage.local.get("savedNotes");
    let notes = storedData.savedNotes || [];

    // Display notes
    if (notes.length === 0) {
        notesContainer.innerHTML = '<p class="emptyState">No notes saved yet.</p>';
        return;
    }

    // Sort notes by timestamp (newest first)
    notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    notes.forEach(note => {
        let noteElement = document.createElement("div");
        noteElement.classList.add("note");
        
        // Create delete button
        let deleteButton = document.createElement("button");
        deleteButton.classList.add("deleteBtn");
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", function() {
            deleteNote(note.id);
        });
        
        // Add note content
        noteElement.innerHTML = `
            <p><strong>URL:</strong> <a href="${note.url}" target="_blank">${note.url}</a></p>
            <p><strong>Note:</strong> ${note.title}</p>
            <p><small>${new Date(note.timestamp).toLocaleString()}</small></p>
        `;
        
        // Add delete button to note
        noteElement.appendChild(deleteButton);
        
        // Add note to container
        notesContainer.appendChild(noteElement);
    });
}