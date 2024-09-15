const puppeteer = require('puppeteer');
const { exec } = require('child_process');

// Configuration
const CONTACT_NAME = 'R';  // Contact name in WhatsApp
const WAIT_TIME_MS = 10 * 1000;  // 10 seconds for demo (you can increase to 10 mins)

// Utility function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to initialize WhatsApp Web
const initializeWhatsApp = async () => {
    let browser, page;

    try {
        browser = await puppeteer.launch({
            headless: false,  // Set to true if you don't need to see the browser
            args: ['--start-maximized']
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });

        console.log('Navigating to WhatsApp Web...');
        await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2', timeout: 0 });

        console.log('Please scan the QR code to log in to WhatsApp Web.');
        await delay(20000);  // Allow time for QR code scanning

        // Wait for the search bar to appear
        await page.waitForSelector('[aria-label="Search or start new chat"]', { timeout: 60000 });
        console.log('WhatsApp Web loaded successfully.');

        return { browser, page };
    } catch (error) {
        console.error('Error initializing WhatsApp Web:', error);
        if (browser) await browser.close();
    }
};

// Function to get the last message from the contact (only incoming messages)
const getLastMessageFromContact = async (page, contactName) => {
    try {
        // Search for the contact
        await page.type('[aria-label="Search or start new chat"]', contactName);
        await delay(3000);  // Wait for the contact list to update

        // Click on the contact's name
        await page.waitForSelector(`span[title="${contactName}"]`, { timeout: 10000 });
        await page.click(`span[title="${contactName}"]`);
        console.log(`Selected contact: ${contactName}`);

        // Wait for the messages to load
        await page.waitForSelector('div.copyable-text', { timeout: 10000 });

        // Get the latest incoming message from the contact (filter for contact's messages only)
        const lastMessage = await page.evaluate(() => {
            // Get all the message elements in the conversation
            let messages = document.querySelectorAll('div.message-in span.selectable-text.copyable-text');
            if (messages.length === 0) {
                return null;  // No incoming messages found
            }
            // Return the text of the last incoming message
            return messages[messages.length - 1].innerText;
        });

        if (lastMessage) {
            console.log(`Last message from ${contactName}: ${lastMessage}`);
        } else {
            console.log(` ${contactName}`);
        }

        return lastMessage;
    } catch (error) {
        console.error('Error fetching message:', error);
        return null;
    }
};

// Function to send a reply to contact in WhatsApp
const sendMessageToContact = async (page, replyMessage) => {
    try {
        // Wait for the message input field
        await page.waitForSelector('div[contenteditable="true"][data-tab="10"]', { timeout: 20000 });

        // Type the reply message
        await page.type('div[contenteditable="true"][data-tab="10"]', replyMessage);

        // Introduce a small delay
        await delay(2000);

        // Press Enter to send the message
        await page.keyboard.press('Enter');
        console.log('Message sent:', replyMessage);
    } catch (error) {
        console.error('Error sending message:', error);
    }
};

// Function to handle the message loop and call the Python chatbot
const handleMessageLoop = async (page) => {
    while (true) {
        try {
            // Step 1: Get the last incoming message from the contact
            const lastMessage = await getLastMessageFromContact(page, CONTACT_NAME);

            // If there's a new message from the contact
            if (lastMessage) {
                // Step 2: Call the Python chatbot to get a reply
                exec(`python chatbot.py "${lastMessage}"`, async (error, stdout, stderr) => {
                    if (error) {
                        console.error(`Error executing Python chatbot: ${error}`);
                        return;
                    }

                    // Step 3: Send the reply from the chatbot
                    const replyMessage = stdout.trim();
                    if (replyMessage) {
                        await sendMessageToContact(page, replyMessage);  // Send the chatbot's reply
                    }
                });
            }

            // Step 4: Wait for a short time before checking for new messages
            console.log('Waiting for 10 seconds...');
            await delay(WAIT_TIME_MS);
        } catch (error) {
            console.error('Error during message loop:', error);
        }
    }
};

// Main function to run the process
const main = async () => {
    const { browser, page } = await initializeWhatsApp();

    if (page) {
        try {
            await handleMessageLoop(page);  // Start the message loop
        } finally {
            await delay(5000);  // Wait for 5 seconds before closing (you can keep it open)
        }
    }
};

main();
